# Building signals from sines

A motor drive switches its output on and off thousands of times a second, producing square-edged voltage pulses, yet engineers analyse it as a sum of sine waves. A loudspeaker playing a violin note moves in a complicated jagged pattern, yet the note is a sine at the pitch frequency plus quieter sines at two, three, four times that frequency. The idea that any repeating signal, however sharp-cornered, is a sum of sinusoids at whole-number multiples of its basic frequency is due to Joseph Fourier, and it is one of the most useful ideas in all of engineering. This lesson builds a square wave from sines, finds how much of each sine any periodic signal contains, sees why smooth signals need few harmonics and sharp ones need many, and uses harmonics to measure distortion and to predict what a simple filter does.

This lesson covers:

- harmonics: sinusoids at whole multiples of a fundamental frequency;
- building a square wave from odd harmonics, and the Gibbs overshoot;
- orthogonality, and finding Fourier coefficients by averaging;
- how a signal's smoothness sets how fast its harmonics fade;
- signal power spread over harmonics, and total harmonic distortion;
- filtering a square wave one harmonic at a time.

## A square wave from sines

::: math
\[ \text{square}(t) = \frac{4}{\pi}\sum_{n = 1, 3, 5, \dots} \frac{\sin n\omega t}{n} \]
- odd harmonics only, amplitudes falling as $1/n$
- partial sums overshoot near each jump by about 9% of the full jump, however many terms (Gibbs)
In code: `square_partial(t, f, n_terms)` adds the first `n_terms` odd harmonics
:::


A signal that repeats every T seconds has **fundamental frequency** f = 1/T. Its **harmonics** are sinusoids at 2f, 3f, 4f and so on. Fourier showed that a square wave of height ±1 is

\[ \text{square}(t) = \frac{4}{\pi}\left( \sin\omega t + \frac{\sin 3\omega t}{3} + \frac{\sin 5\omega t}{5} + \cdots \right) \]

odd harmonics only, with amplitudes falling as 1/n. Adding more terms makes the sum flatter on top and steeper at the edges. Predict before running: with more and more terms, does the overshoot just after each edge disappear?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

f = 50.0
t = np.linspace(0, 0.02, 4001)

def square_partial(t, f, n_terms):
    total = np.zeros_like(t)
    for k in range(n_terms):
        n = 2 * k + 1
        total += np.sin(2 * math.pi * n * f * t) / n
    return 4 / math.pi * total

fig, ax = plt.subplots(figsize=(7, 3.2))
for n_terms in [1, 3, 10, 50]:
    y = square_partial(t, f, n_terms)
    ax.plot(t * 1000, y, label=f"{n_terms} terms")
    print(f"{n_terms:>3} terms: peak {y.max():.4f}, overshoot {100 * (y.max() - 1):.2f}%")
ax.plot(t * 1000, np.sign(np.sin(2 * math.pi * f * t)), "k", linewidth=0.8)
ax.set_xlabel("time (ms)")
ax.legend(fontsize=8)
plt.show()
```

```output
  1 terms: peak 1.2732, overshoot 27.32%
  3 terms: peak 1.1884, overshoot 18.84%
 10 terms: peak 1.1798, overshoot 17.98%
 50 terms: peak 1.1790, overshoot 17.90%
```

Term k is the (2k + 1)-th harmonic. The black line is the square wave itself.

One term is a plain sine with peak 4/π ≈ 1.27. With more terms the sum hugs the square wave ever more closely, but the overshoot next to each jump does not go away: it settles at about 18% of the wave's height of 1, which is 9% of the full jump from −1 to +1. This persistent ripple is the **Gibbs phenomenon**: a finite sum of smooth sines can never jump, so near a jump it always overshoots. With more terms the overshoot gets narrower, squeezed ever closer to the jump, but it never drops below about 18%.

## Finding the coefficients: orthogonality

::: math
\[ \overline{\sin m\omega t\,\sin n\omega t} = \begin{cases} \tfrac{1}{2} & m = n \\ 0 & m \ne n \end{cases}, \qquad a_n = 2\,\overline{x\cos n\omega t}, \quad b_n = 2\,\overline{x\sin n\omega t} \]
- the bar means the average over one period
- multiplying by one harmonic and averaging removes all the others: orthogonality
In code: `b = 2 * np.mean(sq * np.sin(2 * math.pi * n * f * ts))`
:::


How did Fourier know the coefficients? The key fact is **orthogonality**: over one period, the average of sin(mωt) sin(nωt) is zero unless m = n, when it is ½, and the same holds for cosines; sines and cosines are always orthogonal to each other. So to find how much sin(nωt) a signal contains, multiply the signal by sin(nωt) and average over a period: every other harmonic averages away. For a signal

\[ x(t) = a_0 + \sum_{n=1}^{\infty} \big(a_n \cos n\omega t + b_n \sin n\omega t\big) \]

the coefficients are a₀ = mean of x, aₙ = 2 × mean of x cos(nωt), bₙ = 2 × mean of x sin(nωt), each over one period. This is projection, the dot product of the vectors lessons applied to functions. Predict before running: what are the first few bₙ of the square wave?

```python type
T = 1 / f
ts = np.arange(0, T, T / 20000)
sq = np.sign(np.sin(2 * math.pi * f * ts))
print("average of sin(3ωt) sin(5ωt):", round(np.mean(np.sin(3 * 2 * math.pi * f * ts) * np.sin(5 * 2 * math.pi * f * ts)), 10), "  of sin²(3ωt):", round(np.mean(np.sin(3 * 2 * math.pi * f * ts) ** 2), 10))
for n in range(1, 8):
    b = 2 * np.mean(sq * np.sin(2 * math.pi * n * f * ts))
    a = 2 * np.mean(sq * np.cos(2 * math.pi * n * f * ts))
    print(f"n = {n}: a_n = {a:+.4f}, b_n = {b:+.4f}, formula {4 / (math.pi * n) if n % 2 else 0:.4f}")
```

```output
average of sin(3ωt) sin(5ωt): -0.0   of sin²(3ωt): 0.5
n = 1: a_n = -0.0001, b_n = +1.2732, formula 1.2732
n = 2: a_n = +0.0001, b_n = +0.0000, formula 0.0000
n = 3: a_n = -0.0001, b_n = +0.4244, formula 0.4244
n = 4: a_n = +0.0001, b_n = -0.0000, formula 0.0000
n = 5: a_n = -0.0001, b_n = +0.2546, formula 0.2546
n = 6: a_n = +0.0001, b_n = +0.0000, formula 0.0000
n = 7: a_n = -0.0001, b_n = +0.1819, formula 0.1819
```

The samples cover exactly one period (`np.arange` stops just short of T), which makes the averages exact up to sampling.

The averages confirm orthogonality (0 for different harmonics, ½ for the same one), and the projected coefficients match Fourier's: bₙ = 4/(πn) for odd n and 0 for even n, with all aₙ zero (to within sampling accuracy), because the square wave is an odd function (like sine). Even harmonics vanish because the wave's second half is the negative of its first half, a symmetry every motor drive engineer relies on.

## Smoothness and how fast harmonics fade

::: math
\[ |c_n| = \sqrt{a_n^2 + b_n^2} \;\propto\; \frac{1}{n} \;(\text{jump}), \qquad \frac{1}{n^2} \;(\text{corner}) \]
- the smoother the signal, the faster its harmonics fade
- on log–log axes the decay shows as a line of slope $-1$ or $-2$
In code: `coeff_mag(x, n)` for the square, sawtooth and triangle
:::


A signal's shape decides how quickly its harmonics die away. A jump (square wave, sawtooth) gives amplitudes falling as 1/n. A corner without a jump (triangle wave) gives 1/n². A smooth signal gives faster still. This matters in practice: a fast-switching square wave contains strong high harmonics, which radiate electrical interference, so motor drives deliberately soften their edges. Predict before running: how much weaker is the 27th harmonic than the fundamental for each shape?

```python type
def coeff_mag(x, n):
    a = 2 * np.mean(x * np.cos(2 * math.pi * n * f * ts))
    b = 2 * np.mean(x * np.sin(2 * math.pi * n * f * ts))
    return math.hypot(a, b)

phase = (f * ts) % 1
shapes = {"square": sq, "sawtooth": 2 * phase - 1, "triangle": 1 - 4 * np.abs(phase - 0.5)}
for name, x in shapes.items():
    mags = [coeff_mag(x, n) for n in [1, 3, 9, 27]]
    print(f"{name:<9} harmonic 1, 3, 9, 27: {np.round(mags, 4)}   ratio 27/1: {mags[3] / mags[0]:.4f}")

fig, ax = plt.subplots(figsize=(6, 3))
ns = np.arange(1, 40)
for name, x in shapes.items():
    ax.loglog(ns, [coeff_mag(x, n) + 1e-12 for n in ns], "o", markersize=3, label=name)
ax.set_xlabel("harmonic n")
ax.set_ylabel("amplitude")
ax.set_ylim(1e-4, 2)
ax.legend()
plt.show()
```

```output
square    harmonic 1, 3, 9, 27: [1.2732 0.4244 0.1415 0.0472]   ratio 27/1: 0.0370
sawtooth  harmonic 1, 3, 9, 27: [0.6366 0.2122 0.0707 0.0236]   ratio 27/1: 0.0370
triangle  harmonic 1, 3, 9, 27: [0.8106 0.0901 0.01   0.0011]   ratio 27/1: 0.0014
```

The log–log axes from the plotting lesson make power laws straight: slope −1 for 1/n, −2 for 1/n².

At the 27th harmonic the square wave and sawtooth still have about 1/27 of their fundamental (0.037), while the triangle has only 1/729 (0.0014). On log–log axes the square and sawtooth points lie on lines of slope −1, the triangle's on slope −2 (the even harmonics of the square and triangle are zero and drop off the bottom). A smoother signal can be described accurately with far fewer harmonics, which is also why smooth signals compress well.

## Power in the harmonics: distortion

::: math
\[ \overline{x^2} = a_0^2 + \tfrac{1}{2}\sum_{n \ge 1}\big(a_n^2 + b_n^2\big), \qquad \text{THD} = \frac{\sqrt{\sum_{n \ge 2} |c_n|^2}}{|c_1|} \]
- Parseval: each harmonic contributes its own mean square, no cross terms
- THD: harmonic content relative to the fundamental
In code: `math.sqrt(0.5 * (mags ** 2).sum())` against the direct RMS; `thd = math.sqrt((mags[1:] ** 2).sum()) / mags[0]`
:::


Orthogonality has another consequence: the power of a signal splits cleanly among its harmonics. The mean square (RMS²) of a periodic signal equals a₀² + ½ Σ(aₙ² + bₙ²), **Parseval's theorem**: each harmonic contributes its own RMS², with no cross terms. Power quality is measured this way. The **total harmonic distortion** (THD) of a supply is the RMS of all the harmonics above the fundamental, as a fraction of the fundamental's RMS. Predict before running: mains voltage with a 5th harmonic of 4% and a 7th of 3% (typical near rectifier loads): what is the THD, and does Parseval hold?

```python type
v = 325 * (np.sin(2 * math.pi * f * ts) + 0.04 * np.sin(2 * math.pi * 5 * f * ts + 0.3) + 0.03 * np.sin(2 * math.pi * 7 * f * ts - 1.1))
mags = np.array([coeff_mag(v, n) for n in range(1, 40)])
rms_direct = math.sqrt(np.mean(v ** 2))
rms_parseval = math.sqrt(0.5 * (mags ** 2).sum())
thd = math.sqrt((mags[1:] ** 2).sum()) / mags[0]
print(f"harmonics found: {[(n + 1, round(float(m), 2)) for n, m in enumerate(mags) if m > 0.5]}")
print(f"RMS from samples {rms_direct:.3f} V, from the harmonics {rms_parseval:.3f} V")
print(f"THD = {100 * thd:.2f}%")
```

```output
harmonics found: [(1, 325.0), (5, 13.0), (7, 9.75)]
RMS from samples 230.097 V, from the harmonics 230.097 V
THD = 5.00%
```

The harmonic amplitudes are their peaks; dividing each squared peak by 2 gives its mean square.

Projection finds exactly the 5th and 7th harmonics put in (13 V and 9.75 V peak), Parseval's sum reproduces the RMS measured directly, and the THD is √(0.04² + 0.03²) = 5.00%. Grid codes typically limit voltage THD to around 5–8%, so this supply is at the edge.

## Filtering a square wave

::: math
\[ |H(\omega)| = \frac{1}{\sqrt{1 + (\omega RC)^2}}, \qquad \angle H(\omega) = -\arctan(\omega RC) \]
- a linear system scales and shifts each harmonic separately
- the output is the sum of the filtered harmonics
In code: `gain, phase_lag = 1 / math.sqrt(1 + (w * RC) ** 2), -math.atan(w * RC)`, then `out += 4 / (math.pi * n) * gain * np.sin(w * t_out + phase_lag)`
:::


A system that is linear treats each harmonic separately: the output is the sum of each input harmonic, multiplied by the system's **gain** at that frequency and shifted by its **phase**. A resistor–capacitor (RC) low-pass filter has gain 1/√(1 + (ωRC)²) and phase −atan(ωRC): it passes low frequencies and suppresses high ones. Feed it a square wave and, once the start-up transient has died away, it removes the high harmonics that make the corners sharp, leaving a rounded wave. Predict before running: with a cutoff at the square wave's fundamental frequency, which harmonics survive?

```python type
RC = 1 / (2 * math.pi * f)
t_out = np.linspace(0, 0.04, 4001)
out = np.zeros_like(t_out)
print(" n   gain    phase")
for k in range(200):
    n = 2 * k + 1
    w = 2 * math.pi * n * f
    gain, phase_lag = 1 / math.sqrt(1 + (w * RC) ** 2), -math.atan(w * RC)
    out += 4 / (math.pi * n) * gain * np.sin(w * t_out + phase_lag)
    if n <= 9:
        print(f"{n:>2}  {gain:.3f}  {math.degrees(phase_lag):6.1f}°")
fig, ax = plt.subplots(figsize=(7, 3))
ax.plot(t_out * 1000, np.sign(np.sin(2 * math.pi * f * t_out)), "k", linewidth=0.8, label="square input")
ax.plot(t_out * 1000, out, label="RC output (harmonic by harmonic)")
ax.set_xlabel("time (ms)")
ax.legend(fontsize=8)
plt.show()
print(f"output swings between {out.min():.3f} and {out.max():.3f}")
```

```output
 n   gain    phase
 1  0.707   -45.0°
 3  0.316   -71.6°
 5  0.196   -78.7°
 7  0.141   -81.9°
 9  0.110   -83.7°
output swings between -0.917 and 0.917
```

With RC = 1/(2πf), the filter's cutoff equals the square wave's fundamental, so the fundamental passes at gain 1/√2 and each harmonic n at roughly 1/n.

The fundamental passes at 0.707 with a 45° lag; the 3rd harmonic at 0.316, the 9th at only 0.11, and since the harmonics were already falling as 1/n, they now fall as about 1/n². The output is the rounded, triangle-like wave of a capacitor charging and discharging, swinging about ±0.92, and the computation never solved a differential equation: it worked harmonic by harmonic. The next lesson turns this view around and looks at a signal's harmonics directly, as a spectrum.

::: challenge Partial sums [easy]
Write `square_partial(t, freq, n_terms)` returning the sum of the first `n_terms` odd harmonics of a ±1 square wave, (4/π) Σ sin(2π(2k+1)ft)/(2k+1) for k = 0..n_terms−1, for a number or an array t. Raise `ValueError` if n_terms < 1 or the frequency is not positive. Then write `peak_overshoot(n_terms)`: the maximum of the partial sum over one period (sample 200,001 evenly spaced points over [0, 1] with frequency 1), minus 1, as a percentage of the full jump (which is 2), rounded to 2 decimal places.

```python starter
def square_partial(t, freq, n_terms):
    return np.sign(np.sin(2 * math.pi * freq * np.asarray(t, dtype=float)))

def peak_overshoot(n_terms):
    return 0.0

print(peak_overshoot(50))
```

```python solution
def square_partial(t, freq, n_terms):
    if n_terms < 1 or freq <= 0:
        raise ValueError("need at least one term and a positive frequency")
    t = np.asarray(t, dtype=float)
    total = np.zeros_like(t)
    for k in range(n_terms):
        n = 2 * k + 1
        total = total + np.sin(2 * math.pi * n * freq * t) / n
    return 4 / math.pi * total

def peak_overshoot(n_terms):
    y = square_partial(np.linspace(0, 1, 200001), 1.0, n_terms)
    return round(float((y.max() - 1) / 2 * 100), 2)

print(peak_overshoot(50))
```

```python test
for _n in ["square_partial", "peak_overshoot"]:
    assert _n in dir(), f"Define {_n}."
assert abs(float(square_partial(0.25, 1, 1)) - 4 / math.pi) < 1e-12, "One term peaks at 4/π."
assert abs(float(square_partial(0.25, 1, 2)) - 4 / math.pi * (1 - 1 / 3)) < 1e-12, "sin(3π/2) = -1."
_t = np.linspace(0, 1, 1001)
assert np.allclose(square_partial(_t, 1, 3), 4 / math.pi * (np.sin(2 * math.pi * _t) + np.sin(6 * math.pi * _t) / 3 + np.sin(10 * math.pi * _t) / 5)), "Odd harmonics only."
for _bad in [(0, 1, 0), (0, 0, 3)]:
    try:
        square_partial(*_bad)
        assert False, f"square_partial{_bad} should raise ValueError."
    except ValueError:
        pass
_o = [peak_overshoot(_n) for _n in (10, 50, 200)]
assert all(8.6 < _x < 9.2 for _x in _o), f"The Gibbs overshoot stays near 9% of the jump; got {_o}."
assert peak_overshoot(1) == round((4 / math.pi - 1) / 2 * 100, 2), "One term overshoots by (4/π - 1)/2."
"SUCCESS: Adding odd harmonics squares off the wave, but the overshoot at each jump never falls below about 9%: the Gibbs phenomenon."
```

Hint: Loop over k, adding sin(2π(2k+1)ft)/(2k+1). The overshoot as a percentage of the jump is (max − 1)/2 × 100.
:::

::: challenge Fourier coefficients [medium]
Write `fourier_coefficients(x, n_max)` for an array x of samples covering **exactly one period** (evenly spaced, the last sample one step before the end of the period): return `(a0, a, b)` where a0 is the mean (a plain Python float), and a and b are NumPy arrays of length n_max holding aₙ = 2 mean(x cos(2πnk/N)) and bₙ = 2 mean(x sin(2πnk/N)) for n = 1..n_max, with k = 0..N−1 the sample index. Raise `ValueError` if n_max < 1 or there are fewer than 2 n_max + 1 samples. Then write `reconstruct(a0, a, b, N)`, which rebuilds N samples of one period from the coefficients, and `amplitudes(a, b)`, the harmonic amplitudes √(aₙ² + bₙ²).

```python starter
def fourier_coefficients(x, n_max):
    return (0.0, np.zeros(n_max), np.zeros(n_max))

def reconstruct(a0, a, b, N):
    return np.full(N, a0)

def amplitudes(a, b):
    return np.zeros(len(a))

N = 1000
k = np.arange(N)
print(fourier_coefficients(np.sign(np.sin(2 * np.pi * k / N)), 5)[2].round(4))
```

```python solution
def fourier_coefficients(x, n_max):
    x = np.asarray(x, dtype=float)
    N = len(x)
    if n_max < 1 or N < 2 * n_max + 1:
        raise ValueError("need n_max >= 1 and at least 2 n_max + 1 samples")
    k = np.arange(N)
    a = np.array([2 * np.mean(x * np.cos(2 * np.pi * n * k / N)) for n in range(1, n_max + 1)])
    b = np.array([2 * np.mean(x * np.sin(2 * np.pi * n * k / N)) for n in range(1, n_max + 1)])
    return (float(np.mean(x)), a, b)

def reconstruct(a0, a, b, N):
    k = np.arange(N)
    out = np.full(N, float(a0))
    for n, (an, bn) in enumerate(zip(a, b), start=1):
        out += an * np.cos(2 * np.pi * n * k / N) + bn * np.sin(2 * np.pi * n * k / N)
    return out

def amplitudes(a, b):
    return np.hypot(np.asarray(a, dtype=float), np.asarray(b, dtype=float))

N = 1000
k = np.arange(N)
print(fourier_coefficients(np.sign(np.sin(2 * np.pi * k / N)), 5)[2].round(4))
```

```python test
for _n in ["fourier_coefficients", "reconstruct", "amplitudes"]:
    assert _n in dir(), f"Define {_n}."
_N = 4000
_k = np.arange(_N)
_x = 1.5 + 2 * np.cos(2 * np.pi * _k / _N) - 0.7 * np.sin(2 * np.pi * 3 * _k / _N) + 0.25 * np.cos(2 * np.pi * 7 * _k / _N + 0.4)
_a0, _a, _b = fourier_coefficients(_x, 8)
assert abs(_a0 - 1.5) < 1e-12 and type(_a0) is float, "The mean."
assert np.allclose(_a[[0, 2]], [2, 0]) and np.allclose(_b[[0, 2]], [0, -0.7]), "Exact recovery of a cosine and a sine."
assert abs(math.hypot(_a[6], _b[6]) - 0.25) < 1e-12 and np.allclose(np.delete(amplitudes(_a, _b), [0, 2, 6]), 0, atol=1e-12), "Phase-shifted harmonic, and nothing else."
assert np.allclose(reconstruct(_a0, _a, _b, _N), _x), "Reconstruction from all the coefficients present."
_sq = np.sign(np.sin(2 * np.pi * _k / _N))
_a0s, _as, _bs = fourier_coefficients(_sq, 9)
assert np.allclose(_bs[[0, 2, 4, 6, 8]], [4 / (np.pi * _n) for _n in (1, 3, 5, 7, 9)], atol=2e-3) and np.allclose(_bs[[1, 3, 5, 7]], 0, atol=2e-3), "Square wave: 4/(πn) for odd n."
for _bad in [(_x, 0), (np.zeros(10), 5)]:
    try:
        fourier_coefficients(*_bad)
        assert False, "Bad n_max or too few samples should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Multiply by each harmonic and average: orthogonality picks out every coefficient, and adding them back rebuilds the signal."
```

Hint: With k = np.arange(N), harmonic n is `np.cos(2*np.pi*n*k/N)`; twice the mean of the product with x gives aₙ (and the same with sine for bₙ). To rebuild, add a0 and every aₙ cos + bₙ sin term.
:::

::: challenge Distortion and filtering [hard]
Write `thd(samples, n_harmonics)`: for samples covering exactly one period of a periodic signal, the total harmonic distortion as a percentage, 100 × √(Σ amplitude² of harmonics 2..n_harmonics) / amplitude of harmonic 1, rounded to 2 decimal places, computing amplitudes by projection as in the previous challenge. Raise `ValueError` if the fundamental is zero (within 1e-12). Then write `rc_output(t, freq, rc, n_terms)`: the output of an RC low-pass filter fed a ±1 square wave of the given frequency, computed harmonic by harmonic over the first `n_terms` odd harmonics (gain 1/√(1 + (ωRC)²), phase −atan(ωRC) for each), at times t (number or array). Finally write `ripple(freq, rc, n_terms=400)`: the peak-to-peak swing of `rc_output` over one period sampled at 20,001 points, rounded to 4 decimal places.

```python starter
def thd(samples, n_harmonics):
    return 0.0

def rc_output(t, freq, rc, n_terms):
    return np.zeros_like(np.asarray(t, dtype=float))

def ripple(freq, rc, n_terms=400):
    return 2.0

print(ripple(50, 1 / (2 * np.pi * 50)))
```

```python solution
def _amp(x, n):
    k = np.arange(len(x))
    return math.hypot(2 * np.mean(x * np.cos(2 * np.pi * n * k / len(x))), 2 * np.mean(x * np.sin(2 * np.pi * n * k / len(x))))

def thd(samples, n_harmonics):
    x = np.asarray(samples, dtype=float)
    fund = _amp(x, 1)
    if fund < 1e-12:
        raise ValueError("the fundamental is zero")
    rest = math.sqrt(sum(_amp(x, n) ** 2 for n in range(2, n_harmonics + 1)))
    return round(100 * rest / fund, 2)

def rc_output(t, freq, rc, n_terms):
    t = np.asarray(t, dtype=float)
    out = np.zeros_like(t)
    for k in range(n_terms):
        n = 2 * k + 1
        w = 2 * np.pi * n * freq
        out = out + 4 / (np.pi * n) / math.sqrt(1 + (w * rc) ** 2) * np.sin(w * t - math.atan(w * rc))
    return out

def ripple(freq, rc, n_terms=400):
    y = rc_output(np.linspace(0, 1 / freq, 20001), freq, rc, n_terms)
    return round(float(y.max() - y.min()), 4)

print(ripple(50, 1 / (2 * np.pi * 50)))
```

```python test
for _n in ["thd", "rc_output", "ripple"]:
    assert _n in dir(), f"Define {_n}."
_N = 5000
_k = np.arange(_N)
_v = np.sin(2 * np.pi * _k / _N) + 0.04 * np.sin(2 * np.pi * 5 * _k / _N + 0.3) + 0.03 * np.sin(2 * np.pi * 7 * _k / _N - 1.1)
assert thd(_v, 20) == 5.0, f"√(4² + 3²) = 5%; got {thd(_v, 20)}."
assert thd(np.sin(2 * np.pi * _k / _N), 20) == 0.0, "A pure sine has no distortion."
assert abs(thd(np.sign(np.sin(2 * np.pi * _k / _N)), 99) - 100 * math.sqrt(sum(1 / _n ** 2 for _n in range(3, 100, 2)))) < 0.3, "Square wave THD from its harmonics."
try:
    thd(np.sin(2 * np.pi * 2 * _k / _N), 10)
    assert False, "No fundamental: raise ValueError."
except ValueError:
    pass
_t = np.linspace(0, 0.02, 101)
_rc = 1 / (2 * np.pi * 50)
assert np.allclose(rc_output(_t, 50, _rc, 1), 4 / np.pi / math.sqrt(2) * np.sin(2 * np.pi * 50 * _t - np.pi / 4)), "One term: gain 1/√2, 45° lag at the cutoff."
assert ripple(50, 1e-9) > 2.0 and ripple(50, 1e-9) < 2.4, "A negligible RC passes the square wave (with Gibbs overshoot)."
_r1, _r2 = ripple(50, _rc), ripple(50, 10 * _rc)
assert 1.4 < _r1 < 1.9 and _r2 < 0.35 and _r2 < _r1, f"A larger RC smooths more; got {_r1} and {_r2}."
_tau = _rc
_exact = 2 * math.tanh(1 / (4 * 50 * _tau))
assert abs(_r1 - _exact) < 0.01, f"Matches the exact charge–discharge swing 2 tanh(T/4RC) = {_exact:.4f}; got {_r1}."
"SUCCESS: Harmonic by harmonic, distortion is measured and a filter's output predicted, with no differential equation in sight."
```

Hint: The amplitude of harmonic n is √(aₙ² + bₙ²) from projections. For the filter, each odd harmonic n of amplitude 4/(πn) is scaled by the gain and shifted by the phase at ω = 2πnf, then summed.
:::

## What you learned

- A periodic signal is a sum of harmonics at whole multiples of its fundamental frequency; a square wave contains odd harmonics with amplitudes 4/(πn).
- Partial sums of a jump overshoot by about 9% of the jump however many terms are used (the Gibbs phenomenon).
- Sines and cosines of different harmonics are orthogonal over a period, so each coefficient is found by multiplying by that harmonic and averaging.
- Jumps make harmonics fade as 1/n, corners as 1/n², smooth signals faster.
- Parseval: the mean square splits among the harmonics; THD is the harmonics' RMS relative to the fundamental's.
- A linear filter scales and shifts each harmonic separately, so its output can be built harmonic by harmonic.

The next lesson computes a signal's harmonics directly, as a spectrum, to find the source of a vibration.
