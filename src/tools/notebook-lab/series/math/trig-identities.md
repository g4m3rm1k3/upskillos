# Trigonometric identities, by computation

A rotating arm has a horizontal position described by a cosine. Add an angular offset, combine its vibration with another signal, or ask how far it moved from its starting position, and the model fills with trigonometric expressions. An **identity** lets us rewrite those expressions without changing their mathematical value. The reward is more than shorter algebra: a rewrite can expose a signal's amplitude, eliminate an unnecessary inverse function, or rescue a tiny displacement that the computer otherwise rounds to zero.

You already know sine, cosine, radians and `atan2`. Here you will derive identities from a rotating unit vector, test them computationally, and use them to simplify models. All code takes angles in **radians** unless it explicitly converts degrees. Run the demonstration cells in order; they share imports. Allow about 40 minutes, including the challenges.

This lesson covers:

- identities versus equations, and numerical evidence versus proof;
- angle addition, subtraction and double angles;
- amplitude and phase of two signals with the same frequency;
- products of oscillations and the frequencies they contain;
- domains and rounding error when choosing an equivalent formula.

## 1. An identity is a statement about every allowed input

A point on the unit circle has coordinates $(\cos\theta,\sin\theta)$. Its distance from the origin is one. Pythagoras therefore gives the first identity below for every real angle. In contrast, the equation $\sin\theta=1/2$ holds only at particular angles. An identity is a reusable rule; an equation is a condition to solve.

::: math
\[ \cos^2\theta+\sin^2\theta=1, \qquad r(\theta)=\cos^2\theta+\sin^2\theta-1 \]
- $\cos^2\theta$ means $(\cos\theta)^2$, not $\cos(\theta^2)$.
- $r$: the **residual**, the left side minus the right side; an exact identity has residual zero.
In code: sample the residual across several turns and compare it with a deliberately false rule.
:::

Predict before running: will `sin(theta) + cos(theta) == 1` hold everywhere? Will the correct squared identity produce exactly zero residual at every sampled angle?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

theta = np.linspace(-4 * np.pi, 4 * np.pi, 1001)
residual = np.cos(theta)**2 + np.sin(theta)**2 - 1
wrong_residual = np.cos(theta) + np.sin(theta) - 1
print("Largest residual of squared identity:", np.max(np.abs(residual)))
print("Largest residual of false rule:", np.max(np.abs(wrong_residual)))
print("Squared identity within 1e-12:", np.all(np.abs(residual) < 1e-12))
print("At pi/4, sin + cos =", math.sin(math.pi / 4) + math.cos(math.pi / 4))
```

The correct residual is around floating-point rounding size, while the false rule has errors of order one. At $\pi/4$, sine plus cosine is $\sqrt{2}$, already a counterexample. A **counterexample** is one allowed input where a claim fails; one is enough to disprove a universal claim.

Passing a finite sample cannot prove an identity over infinitely many angles. Sampling only multiples of $\pi/2$, for example, would make the false claim $\sin(2\theta)=0$ look convincing. The unit-circle argument proves the squared identity; the computation checks whether our code represents it faithfully. A small absolute tolerance accommodates rounding here because the quantities have size near one. It is not a universal tolerance for all physical measurements.

## 2. Adding angles means composing rotations

Start with a unit vector pointing at angle $a$. Rotate it through another angle $b$. A horizontal unit step becomes $(\cos b,\sin b)$, and a vertical unit step becomes $(-\sin b,\cos b)$. Multiply those rotated steps by the original horizontal and vertical components, then add. The new coordinates are exactly the cosine and sine of $a+b$. This derives both addition formulas from geometry instead of treating them as facts to memorise.

::: math
\[ \cos(a+b)=\cos a\cos b-\sin a\sin b \]
\[ \sin(a+b)=\sin a\cos b+\cos a\sin b \]
- Replacing $b$ with $-b$ gives the subtraction formulas, since cosine is even and sine is odd.
- **Even** means $\cos(-b)=\cos b$; **odd** means $\sin(-b)=-\sin b$.
In code: rotate an arm through two successive angles and compare with one rotation through their sum.
:::

For a concrete hand calculation, $\cos(60°+30°)=(1/2)(\sqrt{3}/2)-(\sqrt{3}/2)(1/2)=0$. The vertical component is $1/4+3/4=1$. An arm of length 120 mm should therefore finish at $(0,120)$ mm. Predict before running: does the incorrect shortcut $\cos a+\cos b$ give that horizontal position?

```python
a, b = np.deg2rad([60.0, 30.0])
length = 120.0
composed = length * np.array([
    np.cos(a) * np.cos(b) - np.sin(a) * np.sin(b),
    np.sin(a) * np.cos(b) + np.cos(a) * np.sin(b),
])
direct = length * np.array([np.cos(a + b), np.sin(a + b)])
print("Successive rotations (mm):", np.round(composed, 10))
print("One combined rotation (mm):", np.round(direct, 10))
print("Incorrect horizontal shortcut (mm):", length * (np.cos(a) + np.cos(b)))
print("Position discrepancy (mm):", np.linalg.norm(composed - direct))
```

Both correct constructions reach the same point to rounding accuracy. Adding the cosine values does not add angles: it adds two horizontal components of two different vectors. Notice also that we never needed `acos` to recover an intermediate angle. When a sensor already supplies sine and cosine components, the addition formulas let us work directly with those components and retain quadrant information.

::: challenge Rotate measured components [easy]
An encoder supplies `c = cos(a)` and `s = sin(a)`. Write `advance_components(c, s, delta)` returning `(cos(a + delta), sin(a + delta))`, using the addition formulas. `delta` is in radians. Inputs are scalar floats representing a unit vector; you do not need to validate them. Do not recover `a` with an inverse function.
```python starter
def advance_components(c, s, delta):
    return c, s
```
```python solution
def advance_components(c, s, delta):
    cd, sd = math.cos(delta), math.sin(delta)
    return c * cd - s * sd, s * cd + c * sd
```
```python test
for _a, _delta in [(0.0, math.pi / 2), (2.4, -0.7), (-2.8, 1.1), (0.3, 0.0), (1.7, 2 * math.pi)]:
    _got = advance_components(math.cos(_a), math.sin(_a), _delta)
    assert isinstance(_got, (tuple, list)) and len(_got) == 2, "Return two components: cosine first, sine second."
    assert np.allclose(_got, [math.cos(_a + _delta), math.sin(_a + _delta)], atol=1e-12, rtol=0), "Check the minus sign in cosine, the plus sign in sine, and the rotation direction."
    assert math.isclose(_got[0]**2 + _got[1]**2, 1.0, abs_tol=1e-12), "A rotation must preserve the unit vector's length."
"SUCCESS: Components can be rotated without recovering an ambiguous inverse angle."
```
Hint: Multiply the old cosine by cos(delta) and subtract the old sine times sin(delta). Derive the second component from the sine addition formula.
:::

## 3. Double angles reveal a hidden oscillation

Set $b=a$ in the addition formulas. That gives $\sin(2a)=2\sin a\cos a$ and $\cos(2a)=\cos^2a-\sin^2a$. Combining the second result with the unit-circle identity gives two more ways to write it. Rearranging produces the **power-reduction formulas** below: squares become a constant plus an oscillation at twice the frequency.

::: math
\[ \cos(2a)=2\cos^2a-1=1-2\sin^2a \]
\[ \cos^2a=\frac{1+\cos(2a)}{2}, \qquad \sin^2a=\frac{1-\cos(2a)}{2} \]
- For displacement $x=A\cos(\omega t)$, $x^2=A^2[1+\cos(2\omega t)]/2$.
- $A$: amplitude; $\omega$: angular frequency in radians per second; $t$: time in seconds.
In code: square a 3 mm oscillation and inspect its mean and doubled frequency over one complete period.
:::

Predict before running: is the mean squared displacement zero because the displacement has mean zero? How many peaks does the squared signal have per original period?

```python
phase = np.linspace(0, 2 * np.pi, 800, endpoint=False)
x = 3.0 * np.cos(phase)
x_squared = x**2
rewritten = 9.0 * (1 + np.cos(2 * phase)) / 2
print("Mean displacement (mm):", round(float(np.mean(x)), 12))
print("Mean squared displacement (mm^2):", np.mean(x_squared))
print("Largest rewrite discrepancy:", np.max(np.abs(x_squared - rewritten)))
fig, ax = plt.subplots(figsize=(8, 3.5))
ax.plot(phase / (2 * np.pi), x_squared, label="Squared displacement")
ax.plot(phase / (2 * np.pi), rewritten, "--", label="Double-angle rewrite")
ax.axhline(4.5, color="gray", linestyle=":", label="Mean = 4.5 mm²")
ax.set(xlabel="Original cycles", ylabel="Squared displacement (mm²)", title="Squaring doubles the oscillation frequency")
ax.legend()
fig.tight_layout()
plt.show()
```

The mean is $9/2=4.5$ mm². Squaring makes both the positive and negative extremes into positive peaks, so there are two peaks per original period. Uniform samples cover a full cycle without duplicating its endpoint; averaging a partial cycle would generally give a different result. This distinction matters when estimating vibration intensity from a short recording.

The same identity gives the root mean square of a pure cosine: take the square root of its mean square to get $A/\sqrt{2}$ for nonnegative amplitude $A$. Mean displacement measures a centre; mean square measures size without positive and negative excursions cancelling.

## 4. Combine equal-frequency signals into amplitude and phase

Suppose two contributions to a machine's displacement combine as $3\cos\theta+4\sin\theta$ mm. Adding their coefficients gives 7, but the two terms do not peak together. Expand $R\cos(\theta-\phi)$ using the subtraction formula and match coefficients: $A=R\cos\phi$ and $B=R\sin\phi$. These are coordinates of a vector, so the previous lesson's `hypot` and `atan2` solve the problem.

::: math
\[ A\cos\theta+B\sin\theta=R\cos(\theta-\phi), \qquad R=\sqrt{A^2+B^2}, \quad \phi=\operatorname{atan2}(B,A) \]
- $R\geq0$: amplitude; $\phi$: phase in radians, with the **minus** sign shown in the cosine.
- If $A=B=0$, the signal is zero and phase is undefined; our code convention will return zero phase.
In code: compare the original vibration with its amplitude-phase form and mark its predicted peak.
:::

Predict before running: what is the amplitude for coefficients 3 and 4? At which phase does the maximum occur?

```python
A, B = 3.0, 4.0
R, phi = math.hypot(A, B), math.atan2(B, A)
angle = np.linspace(0, 2 * np.pi, 500)
original = A * np.cos(angle) + B * np.sin(angle)
combined = R * np.cos(angle - phi)
print(f"Amplitude: {R:.3f} mm; phase: {math.degrees(phi):.3f} degrees")
print("Value at predicted peak (mm):", A * math.cos(phi) + B * math.sin(phi))
print("Largest reconstruction error (mm):", np.max(np.abs(original - combined)))
fig, ax = plt.subplots(figsize=(8, 3.5))
ax.plot(angle, original, label="3 cos θ + 4 sin θ")
ax.plot(angle, combined, "--", label="5 cos(θ − φ)")
ax.scatter([phi], [R], color="black", zorder=3, label="Predicted peak")
ax.set(xlabel="Phase θ (radians)", ylabel="Displacement (mm)", title="Two components, one vibration")
ax.legend()
fig.tight_layout()
plt.show()
```

The amplitude is 5 mm and the peak occurs at about 53.13°, plus whole turns. Using `atan(B/A)` would lose the quadrant when $A$ is negative and divide by zero when $A=0$. These contributions must share the same frequency for a single constant amplitude and phase to describe their sum. Different-frequency signals need a different model.

::: challenge Recover amplitude and phase [medium]
Write `amplitude_phase(A, B)` returning `(R, phi)` for `A*cos(theta) + B*sin(theta) = R*cos(theta - phi)`. Accept finite scalar coefficients of either sign. Return nonnegative amplitude and a phase in `[-pi, pi]`. For the zero signal return `(0.0, 0.0)` by convention.
```python starter
def amplitude_phase(A, B):
    return 0.0, 0.0
```
```python solution
def amplitude_phase(A, B):
    R = math.hypot(A, B)
    return (R, math.atan2(B, A)) if R != 0 else (0.0, 0.0)
```
```python test
for _A, _B in [(3.0, 4.0), (-3.0, 4.0), (-3.0, -4.0), (3.0, -4.0), (0.0, 2.0), (2.0, 0.0), (0.0, 0.0)]:
    _R, _phi = amplitude_phase(_A, _B)
    assert _R >= 0 and math.isclose(_R, math.hypot(_A, _B), abs_tol=1e-12), "Amplitude is the length of the coefficient vector, not the sum of its coefficients."
    assert -math.pi <= _phi <= math.pi, "Return phase in radians in [-pi, pi]."
    if _A == _B == 0:
        assert _phi == 0, "Use zero phase for the zero signal by convention."
    for _theta in [-2.3, 0.0, 0.9, 4.1]:
        assert math.isclose(_R * math.cos(_theta - _phi), _A * math.cos(_theta) + _B * math.sin(_theta), abs_tol=1e-11), "Reconstruction failed: check atan2 argument order, quadrant, and the phase sign."
"SUCCESS: The recovered amplitude and phase reconstruct signals in every quadrant, including axis cases."
```
Hint: The coefficients are Cartesian coordinates. Use their length for R and atan2(B, A) for phi; handle the zero vector explicitly.
:::

## 5. Multiplication creates sum and difference frequencies

Add the cosine addition and subtraction formulas. Their sine-product terms cancel, leaving $2\cos a\cos b$. This gives a **product-to-sum identity**. It predicts what happens when an instrument multiplies two signals, a process called mixing. Multiplication is a different operation from the addition in the previous section.

::: math
\[ \cos a\cos b=\frac{\cos(a-b)+\cos(a+b)}{2} \]
- For $a=2\pi f_1t$ and $b=2\pi f_2t$, the product contains frequencies $|f_1-f_2|$ and $f_1+f_2$.
- $f$: frequency in cycles per second (Hz); each resulting cosine has amplitude $1/2$ for unit-amplitude inputs.
In code: multiply 12 Hz and 10 Hz signals, then reconstruct the product from 2 Hz and 22 Hz components.
:::

Predict before running: does multiplying these signals produce 120 Hz, 22 Hz alone, or two frequencies?

```python
t = np.linspace(0, 1, 2000, endpoint=False)
product = np.cos(2 * np.pi * 12 * t) * np.cos(2 * np.pi * 10 * t)
slow = 0.5 * np.cos(2 * np.pi * 2 * t)
fast = 0.5 * np.cos(2 * np.pi * 22 * t)
print("Predicted output frequencies (Hz):", abs(12 - 10), 12 + 10)
print("Largest reconstruction error:", np.max(np.abs(product - slow - fast)))
fig, axes = plt.subplots(2, 1, figsize=(8, 5), sharex=True)
axes[0].plot(t, product, label="Product")
axes[0].plot(t, slow + fast, "--", label="Sum/difference reconstruction")
axes[0].legend()
axes[1].plot(t, slow, label="2 Hz component")
axes[1].plot(t, fast, alpha=0.65, label="22 Hz component")
axes[1].legend()
axes[1].set_xlabel("Time (s)")
for ax in axes:
    ax.set_ylabel("Signal (unitless)")
fig.tight_layout()
plt.show()
```

The traces agree: both 2 Hz and 22 Hz are present. A later filtering stage could keep the slow component and suppress the fast one, but multiplication alone does not remove either. The identity tells us which frequencies to expect before we write a frequency-analysis program. As a quick consistency check, both inputs equal one at time zero, and the two half-amplitude outputs add to one there.

## 6. Equivalent algebra still needs a domain and a numerical strategy

An identity applies only where its expressions are defined. Dividing the unit-circle identity by $\cos^2\theta$ gives $1+\tan^2\theta=1/\cos^2\theta$, but only when $\cos\theta\ne0$. At odd multiples of $\pi/2$ it is undefined. A computer returning a huge finite tangent near such an angle does not make the excluded angle valid: the stored approximation to $\pi/2$ is not exact.

Even away from undefined inputs, equivalent formulas can have different rounding errors. Consider the horizontal setback of an arm of length $L$ after a small rotation: $d=L-L\cos\theta$. At $\theta=10^{-8}$ radians and $L=100$ mm, the true setback is about $5\times10^{-15}$ mm. Subtracting nearly equal floating-point numbers can erase the meaningful digits. This is **cancellation**.

::: math
\[ d=L(1-\cos\theta)=2L\sin^2(\theta/2) \]
- The rewrite follows from $\cos(2a)=1-2\sin^2a$ with $a=\theta/2$.
- Both expressions are mathematically valid for every real $\theta$; the second avoids subtracting numbers close to one.
In code: compare the direct subtraction with the half-angle rewrite as the rotation shrinks.
:::

Predict before running: which expression will still return a positive value at $10^{-8}$ radians? The small-angle estimate $L\theta^2/2$ is a useful comparison, but remains an approximation rather than an identity.

```python
L = 100.0
for th in [1e-2, 1e-4, 1e-6, 1e-8]:
    direct = L * (1 - math.cos(th))
    stable = 2 * L * math.sin(th / 2)**2
    estimate = L * th**2 / 2
    print(f"theta={th:.0e}: direct={direct:.12e}, half-angle={stable:.12e}, estimate={estimate:.12e} mm")
```

At the smallest angle, direct subtraction typically returns zero while the rewrite retains the tiny positive setback. This is an arithmetic demonstration, not a claim that a real workshop instrument can resolve that displacement. The rewrite cannot create measurement precision; it avoids throwing away precision that was already available in the input model. For extremely small values, even the rewritten expression can underflow to zero, so it is not an unlimited-precision solution.

::: challenge Preserve a small setback [medium]
Write `setback(length, theta)` for nonnegative finite arm lengths and finite angles in radians. Return the horizontal setback using the half-angle identity. It should work for clockwise rotations, zero angle, and ordinary large angles as well as small ones. No input validation is required.
```python starter
def setback(length, theta):
    return length * (1 - math.cos(theta))
```
```python solution
def setback(length, theta):
    return 2 * length * math.sin(theta / 2)**2
```
```python test
assert setback(100.0, 0.0) == 0, "At zero rotation the setback must be zero."
assert setback(0.0, 0.7) == 0, "A zero-length arm has zero setback."
for _length, _theta, _expected in [(100.0, 1e-8, 5e-15), (2.0, -1e-9, 1e-18), (3.0, math.pi, 6.0), (8.0, math.pi / 2, 8.0)]:
    _got = setback(_length, _theta)
    assert math.isclose(_got, _expected, rel_tol=1e-12, abs_tol=0.0), "Tiny setbacks need relative accuracy: avoid subtracting cos(theta) from 1, and include the half-angle factor."
assert math.isclose(setback(7.0, -0.4), setback(7.0, 0.4), rel_tol=1e-12), "Setback is unchanged when the rotation direction reverses."
assert math.isclose(setback(6.0, 0.7), 2 * setback(3.0, 0.7), rel_tol=1e-12), "Doubling arm length must double the setback."
"SUCCESS: The half-angle identity preserves tiny displacements that direct subtraction loses."
```
Hint: Use 1 - cos(theta) = 2 sin(theta/2)**2. An absolute tolerance such as 1e-12 would incorrectly accept zero for the tiny test cases, so these tests deliberately compare relative error.
:::

You now have a method for choosing an identity: identify the question the model must answer, derive a form that exposes that answer, check its allowed inputs, and compare implementations numerically. Rotation composition exposes addition formulas; a squared oscillation exposes double frequency; a sum of equal-frequency components exposes amplitude and phase; a product exposes sum and difference frequencies; a tiny setback calls for a formula without cancellation.

Before moving on, explain why testing a thousand angles is not a proof, why coefficients 3 and 4 produce amplitude 5 rather than 7, and why two exact expressions can disagree in floating-point arithmetic. For a transfer experiment, change the vibration coefficients to -3 and 4, predict the new peak's quadrant, then rerun the amplitude-phase demo. The next lesson uses these geometric relationships to solve triangles that have no right angle.
