# Seeing frequencies: the spectrum

A gearbox has developed a new noise. An accelerometer on its casing records a jumble of vibration that looks like random scribble on a time plot. Yet hidden in it are the signatures of every rotating part: the input shaft turning 24 times a second, gear teeth meshing hundreds of times a second, a damaged bearing ticking at its own characteristic rate, and the 50 Hz hum of the motor's electrical supply. A **spectrum** shows how much of each frequency a signal contains, and turns the scribble into a list of suspects. The previous lesson found harmonics of a known fundamental by projection. This lesson does the same for **every** frequency at once with the discrete Fourier transform, computed by the fast Fourier transform (FFT), and covers the practical rules for reading spectra correctly: frequency resolution, leakage and windows, and aliasing.

This lesson covers:

- the discrete Fourier transform as projection onto every frequency, and the FFT;
- amplitude spectra with `np.fft.rfft`, correctly scaled;
- diagnosing a machine from the peaks in its vibration spectrum;
- frequency resolution: why separating close tones needs long records;
- leakage, and how a window function reduces it;
- the Nyquist limit and aliasing.

## From projection to the FFT

::: math
\[ X_k = \sum_{n=0}^{N-1} x_n\,e^{-2\pi i k n / N}, \qquad f_k = \frac{k\,f_s}{N}, \qquad |X_k| = \frac{A N}{2} \]
- the DFT measures the content at each frequency $f_k$; the FFT computes it in about $N\log_2 N$ steps
- amplitude of a tone: $\dfrac{2\,|X_k|}{N}$
In code: `2 * np.abs(np.fft.rfft(x)) / len(x)` and `np.fft.rfftfreq(len(x), 1 / fs)`
:::


The previous lesson multiplied a signal by sin and cos of one harmonic and averaged. The **discrete Fourier transform** (DFT) does this for N equally spaced frequencies at once: for N samples taken at rate f_s, it measures the content at frequencies k f_s / N for k = 0, 1, ..., N − 1. Computed directly that is N² multiplications; the **fast Fourier transform** reorganises the arithmetic to take about N log₂ N, which for a million samples is the difference between hours and a fraction of a second. For real signals, `np.fft.rfft` returns the frequencies from 0 up to f_s/2, with matching frequencies from `np.fft.rfftfreq`. Each result is a complex number whose size measures the amplitude: for a sinusoid of amplitude A that fits a whole number of cycles in the record, |X_k| = A N/2. Predict before running: does the FFT find the two tones at their true amplitudes?

```python type
import math
import time
import numpy as np
import matplotlib.pyplot as plt

fs, duration = 1000, 1.0
t = np.arange(0, duration, 1 / fs)
x = 2.0 * np.sin(2 * math.pi * 50 * t) + 0.5 * np.sin(2 * math.pi * 120 * t + 1.0)

X = np.fft.rfft(x)
freqs = np.fft.rfftfreq(len(x), 1 / fs)
amps = 2 * np.abs(X) / len(x)
for k in np.flatnonzero(amps > 0.1):
    print(f"{freqs[k]:6.1f} Hz: amplitude {amps[k]:.4f}")

k = np.arange(len(x))
start = time.perf_counter()
direct = np.array([np.sum(x * np.exp(-2j * math.pi * m * k / len(x))) for m in range(len(freqs))])
slow = time.perf_counter() - start
start = time.perf_counter()
np.fft.rfft(x)
fast = time.perf_counter() - start
print(f"direct DFT matches the FFT: {np.allclose(direct, X)};  direct {slow * 1000:.1f} ms, FFT {fast * 1000:.3f} ms")
```

`np.exp(-2j * math.pi * m * k / N)` combines the cosine and sine projections in one complex number (the complex-numbers lessons explain why this works). The factor 2/N converts the result to amplitudes.

The spectrum shows exactly two peaks: 2.0000 at 50 Hz and 0.5000 at 120 Hz, the amplitudes put in. The direct sum over every frequency agrees with the FFT, but takes far longer even for 1,000 samples; the gap grows rapidly with N.

## Diagnosing a gearbox

::: math
\[ \text{order} = \frac{f}{f_0}, \qquad f_\text{mesh} = z\,f_0 \]
- $f_0$: shaft speed in revolutions per second; $z$: number of gear teeth
- whole-number orders come from the shaft; a non-integer order points to a bearing
In code: `f0 = 1450 / 60`, then the peaks of the amplitude spectrum divided by `f0`
:::


Every rotating machine has characteristic frequencies. A shaft turning at f₀ revolutions per second produces vibration at f₀ (**1×**, usually from imbalance), 2× (misalignment), and gear mesh frequency (teeth × f₀). Rolling bearings with damage produce their own defect frequencies, and electrical machines hum at the supply frequency and twice it. A spectrum turns a vibration recording into a list of these. Predict before running: a shaft at 1,450 rpm (24.17 Hz) drives a 23-tooth pinion. Which peaks will the spectrum show, and which one is not a multiple of the shaft speed?

```python type
rng = np.random.default_rng(40)
fs, duration = 5000, 4.0
t = np.arange(0, duration, 1 / fs)
f0 = 1450 / 60
signal = (1.2 * np.sin(2 * math.pi * f0 * t)
          + 0.4 * np.sin(2 * math.pi * 2 * f0 * t + 0.5)
          + 0.8 * np.sin(2 * math.pi * 23 * f0 * t + 1.3)
          + 0.3 * np.sin(2 * math.pi * 100 * t)
          + 0.25 * np.sin(2 * math.pi * 87.3 * t + 2.0)
          + rng.normal(0, 1.0, t.size))
amps = 2 * np.abs(np.fft.rfft(signal)) / len(signal)
freqs = np.fft.rfftfreq(len(signal), 1 / fs)
peaks = [k for k in range(1, len(amps) - 1) if amps[k] > 0.15 and amps[k] >= amps[k - 1] and amps[k] >= amps[k + 1]]
for k in peaks:
    order = freqs[k] / f0
    print(f"{freqs[k]:8.2f} Hz  amplitude {amps[k]:.3f}  = {order:6.2f} × shaft speed")

fig, ax = plt.subplots(figsize=(8, 3))
ax.plot(freqs, amps, linewidth=0.6)
ax.set_xlim(0, 700)
ax.set_xlabel("frequency (Hz)")
ax.set_ylabel("amplitude (m/s²)")
plt.show()
print(f"the raw signal's RMS is {math.sqrt(np.mean(signal ** 2)):.2f}; the noise alone has RMS 1.0")
```

```output
   24.25 Hz  amplitude 0.994  =   1.00 × shaft speed
   48.25 Hz  amplitude 0.329  =   2.00 × shaft speed
   87.25 Hz  amplitude 0.255  =   3.61 × shaft speed
  100.00 Hz  amplitude 0.303  =   4.14 × shaft speed
  555.75 Hz  amplitude 0.648  =  23.00 × shaft speed
the raw signal's RMS is 1.49; the noise alone has RMS 1.0
```

A peak is a local maximum above a threshold, as in the spring–mass lesson. Dividing each peak's frequency by the shaft speed gives its **order**.

The raw signal is dominated by noise, but the spectrum separates five peaks cleanly: 1× at 24.25 Hz (the nearest 0.25 Hz bin to 24.17 Hz; imbalance), 2× (some misalignment), 23× at 555.8 Hz (gear mesh), 100 Hz (twice the 50 Hz supply, electrical), and 87.3 Hz, an order of 3.61, which is not a whole multiple of anything rotating at shaft speed: the signature of a bearing defect, whose frequency depends on the bearing's geometry. The noise spreads over all frequencies thinly, so a long record lifts every real tone well above it.

## Frequency resolution

::: math
\[ \Delta f = \frac{f_s}{N} = \frac{1}{\text{duration}} \]
- two tones closer than about $\Delta f$ merge into one peak
- only a longer record improves the resolution
In code: the 50 Hz and 50.6 Hz tones with `duration` 1.0 and 5.0
:::


The DFT's frequencies are spaced Δf = f_s / N = 1 / duration apart: a 1-second record resolves 1 Hz, a 10-second record 0.1 Hz. Two tones closer than about Δf merge into one peak. Sampling faster does **not** help; only recording longer does. Predict before running: can a 1-second record separate tones at 50 Hz and 50.6 Hz? Can a 5-second one?

```python type
fs = 1000
for duration in [1.0, 5.0]:
    t = np.arange(0, duration, 1 / fs)
    x = np.sin(2 * math.pi * 50 * t) + np.sin(2 * math.pi * 50.6 * t)
    amps = 2 * np.abs(np.fft.rfft(x)) / len(x)
    freqs = np.fft.rfftfreq(len(x), 1 / fs)
    band = (freqs > 45) & (freqs < 56)
    local = [freqs[k] for k in np.flatnonzero(band) if amps[k] > 0.2 and amps[k] >= amps[k - 1] and amps[k] >= amps[k + 1]]
    print(f"{duration:.0f} s record: Δf = {freqs[1]:.2f} Hz, peaks in 45-56 Hz at {np.round(local, 2)} Hz")
```

```output
1 s record: Δf = 1.00 Hz, peaks in 45-56 Hz at [50.] Hz
5 s record: Δf = 0.20 Hz, peaks in 45-56 Hz at [50.  50.6] Hz
```

The two tones are 0.6 Hz apart, less than the 1 Hz resolution of a 1-second record and more than the 0.2 Hz of a 5-second one.

With 1 second the two tones merge into one broad peak at 50 Hz (the beats of the waves lesson, viewed in frequency). With 5 seconds, two peaks appear, at 50.0 and 50.6 Hz. Diagnosing two machines running at nearly the same speed needs a record long enough to tell them apart.

## Leakage and windows

::: math
\[ w_n = \tfrac{1}{2}\left(1 - \cos\frac{2\pi n}{N - 1}\right), \quad n = 0, \dots, N - 1, \qquad \text{corrected amplitude} = \frac{2\,|X_k^{(w)}|}{N\,\bar{w}} \]
- the window tapers the record to zero at both ends, removing the jump that causes leakage
- $\bar{w} \approx 0.5$: divide by the window's mean to restore amplitudes
In code: `w = np.hanning(N)`, then `np.fft.rfft(x * w)` divided by `N * w.mean()`
:::


The DFT treats the record as if it repeated forever. When a tone does not complete a whole number of cycles in the record, the repetition has a jump at the join, and the tone's energy **leaks** into neighbouring frequencies: the peak is lower and spread out, with skirts that can hide small nearby peaks. Multiplying the record by a **window** that tapers smoothly to zero at both ends, such as the **Hann window** ½(1 − cos(2πn/(N − 1))) for n = 0, ..., N − 1 (the form `np.hanning` uses), removes the jump. The peak becomes a little wider but the skirts fall away dramatically. The window also lowers amplitudes, by its average value (very nearly 0.5 for Hann), which is corrected by dividing by it. Predict before running: a 3.0 tone at 50.5 Hz (not a whole number of cycles in 1 s) next to a 0.02 tone at 70 Hz. Is the small tone visible?

```python type
fs, N = 1000, 1000
t = np.arange(N) / fs
x = 3.0 * np.sin(2 * math.pi * 50.5 * t) + 0.02 * np.sin(2 * math.pi * 70 * t)
freqs = np.fft.rfftfreq(N, 1 / fs)
raw = 2 * np.abs(np.fft.rfft(x)) / N
w = np.hanning(N)
win = 2 * np.abs(np.fft.rfft(x * w)) / N / w.mean()
for name, a in [("no window", raw), ("Hann window", win)]:
    print(f"{name:<12}: highest peak {a.max():.3f}, level at 70 Hz {a[70]:.4f}, level at 65 Hz {a[65]:.4f}")

fig, ax = plt.subplots(figsize=(7, 3))
ax.semilogy(freqs, raw + 1e-9, label="no window")
ax.semilogy(freqs, win + 1e-9, label="Hann window")
ax.set_xlim(30, 100)
ax.set_ylim(1e-5, 5)
ax.set_xlabel("frequency (Hz)")
ax.legend()
plt.show()
```

```output
no window   : highest peak 1.919, level at 70 Hz 0.0459, level at 65 Hz 0.0579
Hann window : highest peak 2.547, level at 70 Hz 0.0200, level at 65 Hz 0.0003
```

A logarithmic amplitude axis shows small peaks next to large ones. `np.hanning(N)` builds the Hann window; dividing by its mean restores the amplitude scale.

Without a window, the 50.5 Hz tone falls between bins, its peak reads only about 1.9 instead of 3, and its leakage at 65–70 Hz is around 0.06: the 0.02 tone at 70 Hz is buried. With the Hann window the main peak reads about 2.5 (closer, though a tone between bins is still underestimated), the skirt at 65 Hz falls to well below 0.001, and the 70 Hz tone stands clear at about 0.02. Vibration analysers apply a Hann window by default for this reason.

## Aliasing and the Nyquist limit

::: math
\[ f_\text{Nyquist} = \frac{f_s}{2}, \qquad f_\text{alias} = \left| f - f_s \cdot \operatorname{round}\!\left(\frac{f}{f_s}\right) \right| \]
- a tone above $f_s/2$ appears at a false, lower frequency
- sampled at 1000 Hz: 700 Hz shows at 300 Hz, 1050 Hz at 50 Hz
In code: the largest peak of `np.fft.rfft(np.sin(2 * math.pi * f_true * t))` for each `f_true`
:::


A sampled signal cannot represent frequencies above half the sampling rate, the **Nyquist frequency** f_s/2. A higher frequency does not disappear: it shows up at a false, lower frequency, **aliased** by folding about multiples of f_s/2. This is the plotting lesson's still-looking shaft, made quantitative. The only cure is to remove high frequencies **before** sampling, with an analogue anti-aliasing filter, which is why every data acquisition card has one. Predict before running: sampled at 1 kHz, where do tones at 700 Hz and 1,050 Hz appear?

```python type
fs = 1000
t = np.arange(0, 1, 1 / fs)
freqs = np.fft.rfftfreq(len(t), 1 / fs)
for f_true in [300, 700, 1050, 1900]:
    x = np.sin(2 * math.pi * f_true * t)
    amps = 2 * np.abs(np.fft.rfft(x)) / len(t)
    folded = abs(f_true - fs * round(f_true / fs))
    print(f"a {f_true} Hz tone appears at {freqs[np.argmax(amps)]:.0f} Hz (folding predicts {folded} Hz)")
```

```output
a 300 Hz tone appears at 300 Hz (folding predicts 300 Hz)
a 700 Hz tone appears at 300 Hz (folding predicts 300 Hz)
a 1050 Hz tone appears at 50 Hz (folding predicts 50 Hz)
a 1900 Hz tone appears at 100 Hz (folding predicts 100 Hz)
```

The folded frequency is the distance from the true frequency to the nearest whole multiple of the sampling rate.

The 700 Hz tone appears at 300 Hz, indistinguishable from a genuine 300 Hz tone; 1,050 Hz appears at 50 Hz, exactly where a mains hum would be; 1,900 Hz at 100 Hz. Once sampled, no processing can tell an alias from the real thing. Sample at more than twice the highest frequency present, and filter out anything above f_s/2 first.

::: challenge An amplitude spectrum [easy]
Write `amplitude_spectrum(x, fs)` returning `(freqs, amps)` as NumPy arrays from `np.fft.rfft` and `np.fft.rfftfreq`, scaled so that a sinusoid of amplitude A at an exact bin frequency reads A: multiply |X| by 2/N, except the 0 Hz bin, and (for even N) the Nyquist bin, which are multiplied by 1/N. Raise `ValueError` for fewer than 2 samples or a non-positive sampling rate. Then write `dominant_frequency(x, fs)`: the frequency of the largest amplitude, ignoring the 0 Hz bin, as a plain float.

```python starter
def amplitude_spectrum(x, fs):
    X = np.fft.rfft(x)
    return np.fft.rfftfreq(len(x), 1 / fs), np.abs(X)

def dominant_frequency(x, fs):
    return 0.0

t = np.arange(0, 1, 1 / 1000)
print(dominant_frequency(2 * np.sin(2 * np.pi * 50 * t), 1000))
```

```python solution
def amplitude_spectrum(x, fs):
    x = np.asarray(x, dtype=float)
    N = len(x)
    if N < 2 or fs <= 0:
        raise ValueError("need at least 2 samples and a positive sampling rate")
    amps = 2 * np.abs(np.fft.rfft(x)) / N
    amps[0] /= 2
    if N % 2 == 0:
        amps[-1] /= 2
    return np.fft.rfftfreq(N, 1 / fs), amps

def dominant_frequency(x, fs):
    freqs, amps = amplitude_spectrum(x, fs)
    return float(freqs[1 + int(np.argmax(amps[1:]))])

t = np.arange(0, 1, 1 / 1000)
print(dominant_frequency(2 * np.sin(2 * np.pi * 50 * t), 1000))
```

```python test
for _n in ["amplitude_spectrum", "dominant_frequency"]:
    assert _n in dir(), f"Define {_n}."
_t = np.arange(0, 1, 1 / 1000)
_f, _a = amplitude_spectrum(1.5 + 2 * np.sin(2 * np.pi * 50 * _t) + 0.5 * np.cos(2 * np.pi * 120 * _t), 1000)
assert len(_f) == 501 and _f[50] == 50 and abs(_a[50] - 2) < 1e-9 and abs(_a[120] - 0.5) < 1e-9, "Amplitudes at exact bins."
assert abs(_a[0] - 1.5) < 1e-9, "The 0 Hz bin reads the mean (scale by 1/N)."
_alt = np.cos(np.pi * np.arange(10))
assert abs(amplitude_spectrum(_alt, 10)[1][-1] - 1) < 1e-12, "For even N, the Nyquist bin is scaled by 1/N too."
_f2, _a2 = amplitude_spectrum(np.sin(2 * np.pi * 3 * np.arange(9) / 9), 9)
assert len(_f2) == 5 and abs(_a2[3] - 1) < 1e-9, "Odd N has no Nyquist bin."
for _bad in [([1.0], 100), (_t, 0)]:
    try:
        amplitude_spectrum(*_bad)
        assert False, "Bad input should raise ValueError."
    except ValueError:
        pass
assert dominant_frequency(5 + np.sin(2 * np.pi * 80 * _t) + 0.3 * np.sin(2 * np.pi * 200 * _t), 1000) == 80.0, "Ignore the 0 Hz bin."
assert type(dominant_frequency(np.sin(2 * np.pi * 7 * _t), 1000)) is float, "Return a plain float."
"SUCCESS: The FFT, scaled by 2/N (1/N at 0 Hz and Nyquist), reads every tone's amplitude straight off the spectrum."
```

Hint: Compute `2 * abs(rfft(x)) / N`, then halve the first entry, and the last one when N is even. For the dominant frequency, search `amps[1:]` and add 1 to the index.
:::

::: challenge Finding tones with a window [medium]
Write `find_tones(x, fs, threshold)` that applies a Hann window (`np.hanning(N)`), computes the windowed amplitude spectrum (2|X|/N divided by the window's mean; ignore the special 0 Hz and Nyquist scaling), and returns a list of `(frequency, amplitude)` tuples, plain floats with the amplitude rounded to 3 decimal places, for every local maximum (strictly greater than the bin before and at least the bin after, excluding the first and last bins) whose amplitude exceeds `threshold`, sorted by amplitude, largest first. Then write `resolution(fs, n)`, the bin spacing, and `record_length_for(separation_hz, factor=2)`: the seconds of recording needed so that the bin spacing is at most `separation_hz / factor`.

```python starter
def find_tones(x, fs, threshold):
    return []

def resolution(fs, n):
    return 1.0

def record_length_for(separation_hz, factor=2):
    return 1.0

t = np.arange(0, 1, 1 / 1000)
print(find_tones(3 * np.sin(2 * np.pi * 50.5 * t) + 0.02 * np.sin(2 * np.pi * 70 * t), 1000, 0.01))
```

```python solution
def find_tones(x, fs, threshold):
    x = np.asarray(x, dtype=float)
    N = len(x)
    w = np.hanning(N)
    amps = 2 * np.abs(np.fft.rfft(x * w)) / N / w.mean()
    freqs = np.fft.rfftfreq(N, 1 / fs)
    tones = [(float(freqs[k]), round(float(amps[k]), 3)) for k in range(1, len(amps) - 1)
             if amps[k] > amps[k - 1] and amps[k] >= amps[k + 1] and amps[k] > threshold]
    return sorted(tones, key=lambda p: -p[1])

def resolution(fs, n):
    return fs / n

def record_length_for(separation_hz, factor=2):
    return factor / separation_hz

t = np.arange(0, 1, 1 / 1000)
print(find_tones(3 * np.sin(2 * np.pi * 50.5 * t) + 0.02 * np.sin(2 * np.pi * 70 * t), 1000, 0.01))
```

```python test
for _n in ["find_tones", "resolution", "record_length_for"]:
    assert _n in dir(), f"Define {_n}."
_t = np.arange(0, 1, 1 / 1000)
_tones = find_tones(3 * np.sin(2 * np.pi * 50.5 * _t) + 0.02 * np.sin(2 * np.pi * 70 * _t), 1000, 0.01)
assert len(_tones) == 2 and _tones[0][0] in (50.0, 51.0) and _tones[1][0] == 70.0, f"Both tones, largest first; got {_tones}."
assert abs(_tones[1][1] - 0.02) < 0.003 and 2.2 < _tones[0][1] < 3.05, "Window-corrected amplitudes."
assert all(type(_v) is float for _p in _tones for _v in _p), "Plain floats."
_exact = find_tones(np.sin(2 * np.pi * 100 * _t) + 0.4 * np.sin(2 * np.pi * 230 * _t), 1000, 0.1)
assert _exact == [(100.0, 1.0), (230.0, 0.4)], f"Exact-bin tones read their true amplitudes; got {_exact}."
assert find_tones(np.zeros(500), 1000, 0.01) == [], "No tones."
assert resolution(5000, 20000) == 0.25 and record_length_for(0.6) == 2 / 0.6 and record_length_for(0.5, factor=1) == 2.0, "Δf = fs/N = 1/duration."
"SUCCESS: A Hann window turns leakage skirts into a clean floor, so small tones beside big ones become visible."
```

Hint: Multiply by `np.hanning(N)` before the FFT, then divide the amplitudes by the window's mean. A local maximum beats the bin before it and is at least the bin after it.
:::

::: challenge Diagnosis and aliasing [hard]
Write `alias(f, fs)`: the frequency at which a tone of frequency f ≥ 0 appears after sampling at fs, folding about multiples of fs/2 into [0, fs/2], as a plain float. Then write `diagnose(peaks, shaft_hz, mains_hz=50.0, tol=0.02, max_order=40)`: for each `(frequency, amplitude)` peak, return a label: `"N×"` (for example `"1×"`, `"23×"`) if the frequency is within `tol` (relative) of a whole multiple N (1 ≤ N ≤ max_order) of the shaft speed; otherwise `"mains"` or `"2× mains"` if within `tol` of the mains frequency or twice it; otherwise `"unknown"`. Return a list of `(frequency, label)` tuples in the input order; shaft orders take priority over mains. Finally write `needs_rate(max_hz, margin=1.25)`: the lowest sampling rate (a plain float) that keeps `max_hz` below the Nyquist frequency with the given safety factor, 2 × max_hz × margin; raise `ValueError` if max_hz is not positive.

```python starter
def alias(f, fs):
    return float(f)

def diagnose(peaks, shaft_hz, mains_hz=50.0, tol=0.02, max_order=40):
    return [(fr, "unknown") for fr, _ in peaks]

def needs_rate(max_hz, margin=1.25):
    return 2.0 * max_hz

print(alias(700, 1000), alias(1050, 1000))
```

```python solution
def alias(f, fs):
    r = f % fs
    return float(fs - r if r > fs / 2 else r)

def diagnose(peaks, shaft_hz, mains_hz=50.0, tol=0.02, max_order=40):
    out = []
    for fr, _ in peaks:
        label = "unknown"
        n = round(fr / shaft_hz)
        if 1 <= n <= max_order and abs(fr - n * shaft_hz) <= tol * n * shaft_hz:
            label = f"{n}×"
        elif abs(fr - mains_hz) <= tol * mains_hz:
            label = "mains"
        elif abs(fr - 2 * mains_hz) <= tol * 2 * mains_hz:
            label = "2× mains"
        out.append((fr, label))
    return out

def needs_rate(max_hz, margin=1.25):
    if max_hz <= 0:
        raise ValueError("max_hz must be positive")
    return float(2 * max_hz * margin)

print(alias(700, 1000), alias(1050, 1000))
```

```python test
for _n in ["alias", "diagnose", "needs_rate"]:
    assert _n in dir(), f"Define {_n}."
assert [alias(_f, 1000) for _f in (300, 700, 1050, 1900, 500, 1000, 2600)] == [300.0, 300.0, 50.0, 100.0, 500.0, 0.0, 400.0], f"Got {[alias(_f, 1000) for _f in (300, 700, 1050, 1900, 500, 1000, 2600)]}."
assert type(alias(700, 1000)) is float, "Plain float."
_t = np.arange(0, 1, 1 / 1000)
for _f in (700, 1050, 1900):
    _a = 2 * np.abs(np.fft.rfft(np.sin(2 * np.pi * _f * _t))) / 1000
    assert np.argmax(_a) == alias(_f, 1000), f"The FFT agrees: {_f} Hz appears at {np.argmax(_a)} Hz."
_shaft = 1450 / 60
_peaks = [(24.17, 1.2), (48.3, 0.4), (555.8, 0.8), (100.0, 0.3), (87.3, 0.25), (49.9, 0.1)]
assert diagnose(_peaks, _shaft) == [(24.17, "1×"), (48.3, "2×"), (555.8, "23×"), (100.0, "2× mains"), (87.3, "unknown"), (49.9, "mains")], f"Got {diagnose(_peaks, _shaft)}."
assert diagnose([(50.0, 1)], 30.0) == [(50.0, "mains")] and diagnose([(5000.0, 1)], 30.0, max_order=40) == [(5000.0, "unknown")], "Mains, and orders beyond max_order."
assert needs_rate(2000) == 5000.0 and needs_rate(100, margin=1) == 200.0, "Twice the highest frequency, with margin."
try:
    needs_rate(0)
    assert False, "max_hz = 0 should raise ValueError."
except ValueError:
    pass
"SUCCESS: Fold to find aliases, match peaks to shaft orders and the supply, and what is left over points at the bearing."
```

Hint: Reduce f modulo fs; anything above fs/2 folds back to fs − remainder. For orders, round f / shaft to the nearest whole number n and check the relative difference against tol.
:::

## What you learned

- The DFT projects a record onto N equally spaced frequencies; the FFT computes it in about N log N operations. `np.fft.rfft` scaled by 2/N gives amplitudes.
- A vibration spectrum separates shaft orders (1×, 2×, gear mesh), electrical hum and non-integer bearing frequencies, even from noisy data.
- Frequency resolution is 1/duration: separating close tones needs longer records, not faster sampling.
- Tones that do not fit whole cycles leak into neighbouring bins; a Hann window suppresses the leakage, with an amplitude correction.
- Frequencies above f_s/2 alias to false lower frequencies; filter before sampling and sample at more than twice the highest frequency present.

The next lesson looks more closely at sampling itself: how fast is fast enough, and what aliasing does to sensors and moving pictures.
