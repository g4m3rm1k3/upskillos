# Rational functions, poles and asymptotes

Divide one polynomial by another and you get a **rational function**. Rational functions describe where a lens forms an image, how a filter treats each frequency, and how hard a machine on mounts shakes near resonance. They differ from polynomials in one dramatic way: where the denominator is zero they shoot off to infinity, at a **pole**. Far out, they settle along an **asymptote**. Poles are where the physics happens: the object at a lens's focal point whose image is at infinity, the resonance where a lightly damped system responds enormously. This lesson studies their anatomy, then applies it to lenses and to second-order filters, and ends with partial fractions, which split a rational function into simple pieces.

This lesson covers:

- poles and removable holes, and the domain of a rational function;
- vertical, horizontal and oblique asymptotes from the degrees;
- the thin-lens equation as a rational function;
- second-order responses: poles near the axis mean resonance;
- partial fractions, and a telescoping sum.

## Poles and holes

::: math
\[ r(x) = \frac{p(x)}{q(x)}, \qquad q(a) = 0,\; p(a) \ne 0: \text{pole}, \qquad \frac{(x - a)\,g(x)}{(x - a)\,h(x)}: \text{hole at } a \text{ (removable)} \]
- the domain excludes every root of the denominator
- at a pole the function grows without bound; the sign changes across a pole of odd multiplicity and stays the same across an even one
- a factor shared by numerator and denominator cancels, leaving a single missing point (a hole), not a pole
In code: `sp.cancel` removes shared factors; the remaining denominator's roots are the poles
:::

A rational function p(x)/q(x) is defined wherever q(x) ≠ 0. At a root a of q there are two possibilities. If p(a) ≠ 0, the function blows up there: a **pole**, with a vertical asymptote on the graph. Like the roots of the polynomials lesson, poles have multiplicities. An odd one makes the function jump from +∞ to −∞; an even one sends both sides the same way. If p(a) = 0 too, then x − a is a common factor. It cancels, and the function is perfectly finite near a with just that single point missing: a removable **hole**. Simplifying a formula can silently remove the hole, so the domain should be read from the formula **before** cancelling.

Predict before running: r(x) = (x² − 1)/(x² − 3x + 2). Where are its poles, and where are its holes?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt
import sympy as sp

x = sp.symbols("x")
r = (x ** 2 - 1) / (x ** 2 - 3 * x + 2)
num, den = sp.fraction(r)
print("factored:", sp.factor(num), "/", sp.factor(den))
simplified = sp.cancel(r)
print("after cancelling:", simplified)
roots_den = sp.solve(den, x)
poles = sp.solve(sp.fraction(simplified)[1], x)
holes = [a for a in roots_den if a not in poles]
print("denominator zeros:", roots_den, " poles:", poles, " holes:", [(a, simplified.subs(x, a)) for a in holes])
for a in [1.999, 2.001]:
    print(f"r({a}) = {float(r.subs(x, a)):.1f}")
```

```output
factored: (x - 1)*(x + 1) / (x - 2)*(x - 1)
after cancelling: (x + 1)/(x - 2)
denominator zeros: [1, 2]  poles: [2]  holes: [(1, -2)]
r(1.999) = -2999.0
r(2.001) = 3001.0
```

The numerator is (x − 1)(x + 1) and the denominator (x − 1)(x − 2). The shared x − 1 cancels to (x + 1)/(x − 2). So x = 2 is a pole: r jumps from −2999 just below 2 to +3001 just above, a simple pole's sign change. x = 1 is a hole: the simplified formula gives −2 there, but the original is undefined. The graph is a smooth curve through the place where (1, −2) should be, with that single point missing.

## Asymptotes from the degrees

::: math
\[ \frac{p(x)}{q(x)} = s(x) + \frac{\rho(x)}{q(x)}, \quad \deg \rho < \deg q \;\Longrightarrow\; \frac{p}{q} - s(x) \to 0 \text{ as } x \to \pm\infty \]
- polynomial division splits $p/q$ into a polynomial part $s$ and a part that vanishes far away
- $\deg p < \deg q$: horizontal asymptote $y = 0$; equal degrees: $y = $ ratio of the leading coefficients; one degree more: an oblique (slanted) asymptote $y = s(x)$
In code: `np.polydiv(p, q)` for three examples, checked far out
:::

Far from the poles, a rational function behaves like a polynomial. Dividing p by q, as the polynomials lesson divided by x − r, gives a quotient s(x) and a remainder ρ(x) of lower degree than q. The leftover fraction ρ/q shrinks to zero far away, so the graph hugs s(x). The degrees decide the outcome. A numerator of lower degree gives the asymptote y = 0. Equal degrees give the horizontal line at the ratio of leading coefficients. A numerator one degree higher gives a slanted line.

Predict before running: what are the asymptotes of 3x/(x² + 1), (2x² + 1)/(x² − 4) and (x² + 3x + 1)/(x − 1)?

```python type
cases = {
    "3x / (x² + 1)": ([3, 0], [1, 0, 1]),
    "(2x² + 1) / (x² - 4)": ([2, 0, 1], [1, 0, -4]),
    "(x² + 3x + 1) / (x - 1)": ([1, 3, 1], [1, -1]),
}
for label, (pn, qd) in cases.items():
    quotient, remainder = np.polydiv(pn, qd)
    far = 1e4
    gap = np.polyval(pn, far) / np.polyval(qd, far) - np.polyval(quotient, far)
    print(f"{label:<26} quotient {np.round(quotient, 6)}, remainder {np.round(remainder, 6)}; at x = 10⁴ the gap to the asymptote is {gap:.2e}")
```

```output
3x / (x² + 1)              quotient [0.], remainder [3. 0.]; at x = 10⁴ the gap to the asymptote is 3.00e-04
(2x² + 1) / (x² - 4)       quotient [2.], remainder [9.]; at x = 10⁴ the gap to the asymptote is 9.00e-08
(x² + 3x + 1) / (x - 1)    quotient [1. 4.], remainder [5.]; at x = 10⁴ the gap to the asymptote is 5.00e-04
```

3x/(x² + 1) has quotient 0, so y = 0 is its asymptote. (2x² + 1)/(x² − 4) has quotient 2: it levels off at y = 2. (x² + 3x + 1)/(x − 1) has quotient x + 4, so far out it runs alongside the slanted line y = x + 4, the remainder 5/(x − 1) dying away. At x = 10⁴ the gaps are 3 × 10⁻⁴, 9 × 10⁻⁸ and 5 × 10⁻⁴. The leftover ρ/q shrinks like 1/x when ρ has degree one less than q, and like 1/x² for the middle function, whose remainder is two degrees lower.

## The thin lens

::: math
\[ \frac{1}{u} + \frac{1}{v} = \frac{1}{f} \;\Longrightarrow\; v(u) = \frac{u f}{u - f}, \qquad m = -\frac{v}{u} = \frac{f}{f - u} \]
- $u$: object distance; $v$: image distance (positive: a real image behind the lens); $f$: focal length; $m$: magnification (negative: inverted)
- pole at $u = f$: an object at the focal point sends its image to infinity; horizontal asymptote $v \to f$ as $u \to \infty$
- for $u < f$, $v$ is negative: a virtual image on the same side as the object (a magnifying glass)
In code: `image_distance(u, f)` for objects from far away to inside the focal length
:::

A thin lens of focal length f forms an image at distance v of an object at distance u, with 1/u + 1/v = 1/f. Solved for v, that is a rational function of u with a pole at u = f and horizontal asymptote v = f. Each feature is a fact of optics. A distant object (u → ∞) is imaged at the focal plane, which is why cameras focused at infinity have the sensor at f. An object at the focal point produces parallel rays, an image at infinity: the pole. Inside the focal length the image distance turns negative: the virtual, upright, enlarged image of a magnifying glass, on the far side of the pole.

Predict before running: a 50 mm lens. Where is the image of objects at 10 m, 1 m, 0.1 m, 0.06 m and 0.04 m, and how large?

```python type
def image_distance(u, f):
    return u * f / (u - f)

f_lens = 0.050
for u in [10.0, 1.0, 0.1, 0.06, 0.051, 0.04]:
    v_img = image_distance(u, f_lens)
    print(f"object at {u * 1000:7.1f} mm: image at {v_img * 1000:9.2f} mm, magnification {-v_img / u:+.3f}")

us = np.linspace(0.005, 0.3, 2000)
vs = image_distance(us, f_lens)
vs[np.abs(us - f_lens) < 0.0015] = np.nan
fig, ax = plt.subplots(figsize=(6, 3.2))
ax.plot(us * 1000, vs * 1000)
ax.axvline(50, color="red", linestyle=":", label="pole u = f")
ax.axhline(50, color="grey", linestyle="--", label="asymptote v = f")
ax.set_ylim(-400, 400)
ax.set_xlabel("object distance u (mm)")
ax.set_ylabel("image distance v (mm)")
ax.legend(fontsize=8)
plt.show()
```

```output
object at 10000.0 mm: image at     50.25 mm, magnification -0.005
object at  1000.0 mm: image at     52.63 mm, magnification -0.053
object at   100.0 mm: image at    100.00 mm, magnification -1.000
object at    60.0 mm: image at    300.00 mm, magnification -5.000
object at    51.0 mm: image at   2550.00 mm, magnification -50.000
object at    40.0 mm: image at   -200.00 mm, magnification +5.000
```

At 10 m the image is at 50.25 mm, nearly at f, and tiny and inverted (magnification −0.005). At 0.1 m it is at 100 mm and life-size. At 60 mm, just outside the focal length, it is 300 mm away and five times enlarged: the projector arrangement. At 51 mm it is 2.55 m away, nearly at the pole. At 40 mm, inside the focal length, v is −200 mm: a virtual image enlarged five times and upright, the magnifying glass. The plot shows the two branches either side of the pole and the asymptote at v = f.

## Second-order responses: poles and resonance

::: math
\[ H(s) = \frac{1}{\dfrac{s^2}{\omega_0^2} + \dfrac{s}{Q\,\omega_0} + 1}, \qquad |H(i\omega)| = \frac{1}{\sqrt{\big(1 - (\omega/\omega_0)^2\big)^2 + \big(\omega/(Q\,\omega_0)\big)^2}}, \qquad s_{1,2} = \omega_0\left(-\frac{1}{2Q} \pm i\sqrt{1 - \frac{1}{4Q^2}}\right) \]
- $H$: the transfer function of a resonant system (spring–mass, RLC circuit), a rational function of the complex frequency $s$
- $\omega_0$: natural frequency; $Q$: quality factor, $Q = 1/(2\zeta)$ with the spring–mass lesson's damping ratio $\zeta$
- the poles $s_{1,2}$ sit a distance $\omega_0/(2Q)$ from the imaginary axis (for $Q \ge \tfrac{1}{2}$; below that both poles are real): the smaller that distance, the taller and sharper the resonance peak, of height about $Q$
- $s$: complex frequency; a steady sinusoid of angular frequency $\omega$ corresponds to $s = i\omega$
In code: `np.roots` on the denominator for several $Q$; the peak of $|H(i\omega)|$ on a frequency grid
:::

Filters, vibration mounts and tuned circuits are described by **transfer functions**: rational functions H(s) of a complex frequency s. A sinusoid of angular frequency ω is passed with gain |H(iω)|. The standard second-order system has a quadratic denominator. Its two poles are complex numbers off the real axis, and their position explains its behaviour. Evaluating H along the imaginary axis, s = iω, passes close to the poles when they are near that axis. Close to a pole the denominator is small, so the gain is large: a **resonance** peak. The quality factor Q measures how close: the poles sit at distance ω₀/(2Q) from the axis. This is the spring–mass lesson's amplification formula, now seen through its poles.

Predict before running: for Q = 0.5, 2 and 10 with ω₀ = 1, where are the poles, and how tall is the resonance peak?

```python type
w = np.linspace(0.01, 3, 30000)
for Q in [0.5, 2.0, 10.0]:
    poles = np.roots([1.0, 1.0 / Q, 1.0])
    gain = 1 / np.sqrt((1 - w ** 2) ** 2 + (w / Q) ** 2)
    print(f"Q = {Q:>4}: poles {np.round(poles, 4)}, distance to the imaginary axis {abs(poles[0].real):.3f}; "
          f"peak gain {gain.max():.3f} at ω = {w[np.argmax(gain)]:.3f}")
```

```output
Q =  0.5: poles [-1. -1.], distance to the imaginary axis 1.000; peak gain 1.000 at ω = 0.010
Q =  2.0: poles [-0.25+0.9682j -0.25-0.9682j], distance to the imaginary axis 0.250; peak gain 2.066 at ω = 0.935
Q = 10.0: poles [-0.05+0.9987j -0.05-0.9987j], distance to the imaginary axis 0.050; peak gain 10.013 at ω = 0.998
```

With Q = 0.5 (critical damping) the poles coincide at −1 on the real axis, and there is no peak: the gain is largest at low frequency, 1. At Q = 2 the poles move to −0.25 ± 0.968i, a distance 0.25 from the axis, and the gain peaks at about 2.07 near ω = 0.94. At Q = 10 they sit just 0.05 from the axis, and the peak reaches about 10.0 at ω ≈ 1.0. Closer poles mean a taller, narrower resonance. Engineers design filters and vibration isolators by placing poles, and the stability rule "all poles in the left half-plane" is the control block's starting point.

## Partial fractions

::: math
\[ \frac{1}{k(k + 1)} = \frac{1}{k} - \frac{1}{k + 1}, \qquad \sum_{k=1}^{n} \frac{1}{k(k + 1)} = 1 - \frac{1}{n + 1} \]
- a rational function with a factored denominator splits into simple fractions, one per pole (more for repeated poles)
- partial fractions turn hard sums and integrals into easy ones: here the sum **telescopes**, every middle term cancelling
In code: `sp.apart` on two examples; the telescoping sum checked with exact fractions
:::

A rational function whose denominator factors can be split into a sum of simpler fractions, one for each pole: **partial fractions**. The split is unique, and SymPy's `apart` finds it. It is the standard first step in integrating rational functions, in inverting Laplace transforms in control engineering, and in summing series. The classic example: 1/(k(k + 1)) = 1/k − 1/(k + 1). A sum of these terms **telescopes**: each −1/(k + 1) cancels the next term's +1/(k + 1), leaving only the first and last.

Predict before running: what are the partial fractions of (3x + 5)/((x + 1)(x + 2)), and what is Σ 1/(k(k + 1)) for k up to 99?

```python type
from fractions import Fraction

print("(3x + 5)/((x + 1)(x + 2)) =", sp.apart((3 * x + 5) / ((x + 1) * (x + 2)), x))
print("1/(x(x + 1)) =", sp.apart(1 / (x * (x + 1)), x))
print("1/((x - 1)²(x + 1)) =", sp.apart(1 / ((x - 1) ** 2 * (x + 1)), x))
total = sum(Fraction(1, k * (k + 1)) for k in range(1, 100))
print("sum up to 99:", total, " = 1 - 1/100:", total == 1 - Fraction(1, 100))
```

```output
(3x + 5)/((x + 1)(x + 2)) = 1/(x + 2) + 2/(x + 1)
1/(x(x + 1)) = -1/(x + 1) + 1/x
1/((x - 1)²(x + 1)) = 1/(4*(x + 1)) - 1/(4*(x - 1)) + 1/(2*(x - 1)**2)
sum up to 99: 99/100  = 1 - 1/100: True
```

(3x + 5)/((x + 1)(x + 2)) splits into 2/(x + 1) + 1/(x + 2), one term per pole, and 1/(x(x + 1)) into 1/x − 1/(x + 1). A repeated pole needs one term per power: 1/((x − 1)²(x + 1)) has terms in 1/(x − 1)², 1/(x − 1) and 1/(x + 1). Ninety-nine terms of 1/(k(k + 1)) add up to exactly 99/100: the telescoping leaves 1 − 1/100, and the sum tends to 1 as more terms are added.

::: challenge Lenses and asymptotes [easy]
Write `lens(u, f)`: the image distance v = uf/(u − f) and the magnification m = −v/u for an object at u (u > 0, f ≠ 0; f may be negative: a diverging lens), as a tuple of plain floats; raise `ValueError` if u ≤ 0 or u = f (the image is at infinity). Then write `asymptote(p, q)`: given numerator and denominator coefficient lists (highest power first, leading coefficients non-zero), return `("horizontal", value)` when deg p ≤ deg q (value 0.0 when deg p < deg q, otherwise the ratio of leading coefficients), `("oblique", (slope, intercept))` when deg p = deg q + 1, and `("none", None)` otherwise. Numbers are plain floats.

```python starter
def lens(u, f):
    return (0.0, 0.0)

def asymptote(p, q):
    return ("none", None)

print(lens(0.1, 0.05), asymptote([1, 3, 1], [1, -1]))
```

```python solution
import numpy as np

def lens(u, f):
    if u <= 0 or u == f:
        raise ValueError("need u > 0 and u != f")
    v = u * f / (u - f)
    return float(v), float(-v / u)

def asymptote(p, q):
    dp, dq = len(p) - 1, len(q) - 1
    if dp < dq:
        return ("horizontal", 0.0)
    if dp == dq:
        return ("horizontal", float(p[0] / q[0]))
    if dp == dq + 1:
        quotient, _ = np.polydiv(np.asarray(p, dtype=float), np.asarray(q, dtype=float))
        return ("oblique", (float(quotient[0]), float(quotient[1])))
    return ("none", None)

print(lens(0.1, 0.05), asymptote([1, 3, 1], [1, -1]))
```

```python test
for _n in ["lens", "asymptote"]:
    assert _n in dir(), f"Define {_n}."
_v, _m = lens(0.1, 0.05)
assert type(_v) is float and abs(_v - 0.1) < 1e-12 and abs(_m + 1) < 1e-12, "At 2f the image is at 2f, life-size and inverted."
_v2, _m2 = lens(0.04, 0.05)
assert abs(_v2 + 0.2) < 1e-12 and abs(_m2 - 5) < 1e-12, "Inside f: virtual (negative v), upright and enlarged five times."
assert abs(lens(1e6, 0.05)[0] - 0.05) < 1e-8, "Far away: the image is at the focal plane."
assert abs(lens(0.3, -0.1)[0] + 0.075) < 1e-12, "A diverging lens (negative f) gives a virtual image."
for _bad in [(0.05, 0.05), (0.0, 0.05), (-1.0, 0.05)]:
    try:
        lens(*_bad)
        assert False, f"lens{_bad} should raise ValueError."
    except ValueError:
        pass
assert asymptote([3, 0], [1, 0, 1]) == ("horizontal", 0.0), "Lower degree on top: y = 0."
assert asymptote([2, 0, 1], [1, 0, -4]) == ("horizontal", 2.0) and asymptote([6, 1], [-3, 2]) == ("horizontal", -2.0), "Equal degrees: ratio of leading coefficients."
assert asymptote([1, 3, 1], [1, -1]) == ("oblique", (1.0, 4.0)), "One degree more: y = x + 4."
assert asymptote([2, 0, 0, 1], [1, 0, 1]) == ("oblique", (2.0, 0.0)) and asymptote([1, 0, 0, 0], [1, 1]) == ("none", None), "y = 2x; degree difference 2 has no line asymptote."
"SUCCESS: The lens equation is a rational function with a pole at the focal point, and the degrees decide the asymptote."
```

Hint: v = uf/(u − f). Compare the lengths of the coefficient lists to get the degrees; for an oblique asymptote, `np.polydiv(p, q)` returns the quotient [slope, intercept] and a remainder.
:::

::: challenge Poles and holes [medium]
Write `poles_and_holes(num, den)`: for SymPy expressions in the symbol x, return `(poles, holes)`: the sorted lists of real points where the original denominator is zero, split into poles (still zeros of the denominator after `sp.cancel(num / den)`) and holes (removed by cancelling), as plain floats. Write `pole_order(num, den, a)`: the multiplicity of a as a pole of the cancelled function (0 if it is not a pole), as a plain int. Then write `hole_value(num, den, a)`: the value the function approaches at a hole a (the cancelled function's value there) as a plain float; raise `ValueError` if a is not a hole.

```python starter
import sympy as sp

x = sp.symbols("x")

def poles_and_holes(num, den):
    return ([], [])

def pole_order(num, den, a):
    return 0

def hole_value(num, den, a):
    return 0.0

print(poles_and_holes(x ** 2 - 1, x ** 2 - 3 * x + 2))
```

```python solution
import sympy as sp

x = sp.symbols("x")

def _real_roots(expr):
    out = []
    for r in sp.solve(expr, x):
        z = complex(sp.N(r))
        if abs(z.imag) < 1e-12:
            out.append(float(z.real))
    return sorted(set(out))

def poles_and_holes(num, den):
    zeros = _real_roots(den)
    reduced_den = sp.fraction(sp.cancel(num / den))[1]
    poles = [a for a in zeros if abs(float(reduced_den.subs(x, a))) < 1e-12]
    holes = [a for a in zeros if a not in poles]
    return poles, holes

def pole_order(num, den, a):
    reduced_den = sp.Poly(sp.fraction(sp.cancel(num / den))[1], x)
    k = 0
    root = sp.nsimplify(a)
    while reduced_den.degree() > 0 and reduced_den.eval(root) == 0:
        reduced_den = sp.Poly(sp.quo(reduced_den.as_expr(), x - root), x)
        k += 1
    return k

def hole_value(num, den, a):
    if a not in poles_and_holes(num, den)[1]:
        raise ValueError(f"{a} is not a hole")
    return float(sp.cancel(num / den).subs(x, sp.nsimplify(a)))

print(poles_and_holes(x ** 2 - 1, x ** 2 - 3 * x + 2))
```

```python test
import sympy as sp
for _n in ["poles_and_holes", "pole_order", "hole_value"]:
    assert _n in dir(), f"Define {_n}."
_x = sp.symbols("x")
_p, _h = poles_and_holes(_x ** 2 - 1, _x ** 2 - 3 * _x + 2)
assert _p == [2.0] and _h == [1.0] and all(type(_v) is float for _v in _p + _h), f"(x² - 1)/(x² - 3x + 2): pole 2, hole 1; got {(_p, _h)}."
assert hole_value(_x ** 2 - 1, _x ** 2 - 3 * _x + 2, 1.0) == -2.0, "At the hole the cancelled function is -2."
_p2, _h2 = poles_and_holes(_x + 3, (_x - 1) ** 2 * (_x + 3) * (_x ** 2 + 1))
assert _p2 == [1.0] and _h2 == [-3.0], "x² + 1 has no real zeros; x + 3 cancels."
assert pole_order(_x + 3, (_x - 1) ** 2 * (_x + 3) * (_x ** 2 + 1), 1.0) == 2 and pole_order(sp.Integer(1), _x ** 3, 0.0) == 3, "Double and triple poles."
assert pole_order(_x - 1, _x - 1, 1.0) == 0 and type(pole_order(1, _x, 0.0)) is int, "A hole is not a pole; plain int."
assert poles_and_holes(sp.Integer(1), _x ** 2 + 4) == ([], []), "No real zeros at all."
try:
    hole_value(_x ** 2 - 1, _x ** 2 - 3 * _x + 2, 2.0)
    assert False, "2 is a pole, not a hole: ValueError."
except ValueError:
    pass
"SUCCESS: Shared factors cancel into holes; what remains of the denominator's zeros are the poles, each with its multiplicity."
```

Hint: Real zeros of the original denominator are the candidates. `sp.cancel(num / den)` removes common factors; `sp.fraction` splits the result into numerator and denominator. A candidate is a pole if the reduced denominator still vanishes there; count multiplicity by dividing out (x − a) while it still does.
:::

::: challenge Resonance [hard]
For the second-order response |H(iω)| = 1/√((1 − r²)² + (r/Q)²) with r = ω/ω₀, write `gain(w, w0, Q)` (w may be a number or a NumPy array; return a plain float for a number and a NumPy array for an array; this is the spring–mass lesson's amplification with ζ = 1/(2Q)). Write `peak(w0, Q)`: for Q > 1/√2 the peak is at ω_p = ω₀√(1 − 1/(2Q²)) with gain Q/√(1 − 1/(4Q²)); return `(w_p, gain_p)` as plain floats, and for Q ≤ 1/√2 return `(0.0, 1.0)` (no peak away from zero). Then write `bandwidth(w0, Q)`: the width ω₂ − ω₁ of the band where the gain is at least the peak gain divided by √2 (the −3 dB points), found numerically by bisection on each side of the peak to within 1e-9 relative accuracy, as a plain float (if the gain stays at or above the threshold all the way down to ω = 0, which happens for Q below about 1.31, take ω₁ = 0); raise `ValueError` if Q ≤ 1/√2.

```python starter
import math
import numpy as np

def gain(w, w0, Q):
    return w

def peak(w0, Q):
    return (0.0, 1.0)

def bandwidth(w0, Q):
    return 0.0

print(peak(1.0, 10.0), bandwidth(1.0, 10.0))
```

```python solution
import math
import numpy as np

def gain(w, w0, Q):
    r = np.asarray(w, dtype=float) / w0
    g = 1 / np.sqrt((1 - r ** 2) ** 2 + (r / Q) ** 2)
    return float(g) if np.ndim(g) == 0 else g

def peak(w0, Q):
    if Q <= 1 / math.sqrt(2):
        return 0.0, 1.0
    return float(w0 * math.sqrt(1 - 1 / (2 * Q * Q))), float(Q / math.sqrt(1 - 1 / (4 * Q * Q)))

def _edge(lo, hi, target, w0, Q, rising):
    while hi - lo > 1e-9 * hi:
        mid = (lo + hi) / 2
        above = gain(mid, w0, Q) >= target
        if above == rising:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2

def bandwidth(w0, Q):
    if Q <= 1 / math.sqrt(2):
        raise ValueError("no resonance peak")
    wp, gp = peak(w0, Q)
    target = gp / math.sqrt(2)
    w1 = _edge(0.0, wp, target, w0, Q, True)
    hi = wp * 2
    while gain(hi, w0, Q) >= target:
        hi *= 2
    w2 = _edge(wp, hi, target, w0, Q, False)
    return float(w2 - w1)

print(peak(1.0, 10.0), bandwidth(1.0, 10.0))
```

```python test
import math
import numpy as np
for _n in ["gain", "peak", "bandwidth"]:
    assert _n in dir(), f"Define {_n}."
assert type(gain(1.0, 1.0, 10.0)) is float and abs(gain(1.0, 1.0, 10.0) - 10.0) < 1e-12, "At ω = ω0 the gain is exactly Q."
_ws = np.linspace(0.1, 3, 50)
_g = gain(_ws, 1.0, 2.0)
assert isinstance(_g, np.ndarray) and _g.shape == (50,), "Arrays in, arrays out."
assert abs(gain(0.0, 5.0, 3.0) - 1.0) < 1e-12 and gain(100.0, 1.0, 2.0) < 1e-3, "Gain 1 at zero frequency; falls off at high frequency."
_wp, _gp = peak(1.0, 2.0)
_grid = np.linspace(0.5, 1.5, 200001)
_gg = gain(_grid, 1.0, 2.0)
assert abs(_wp - _grid[np.argmax(_gg)]) < 1e-4 and abs(_gp - _gg.max()) < 1e-8, f"The formula matches a fine search: {(_wp, _gp)}."
assert peak(3.0, 0.5) == (0.0, 1.0) and peak(1.0, 1 / math.sqrt(2)) == (0.0, 1.0), "No peak at or below Q = 1/√2."
assert abs(peak(1.0, 10.0)[1] - 10.0 / math.sqrt(1 - 1 / 400)) < 1e-12, "High Q: peak gain about Q."
_bw = bandwidth(1.0, 10.0)
assert type(_bw) is float and abs(_bw - 0.1) < 0.003, f"High Q: bandwidth about ω0/Q = 0.1; got {_bw}."
assert abs(bandwidth(50.0, 25.0) - 2.0) < 0.02, "ω0 = 50, Q = 25: about 2."
_b2 = bandwidth(1.0, 2.0)
_target = peak(1.0, 2.0)[1] / math.sqrt(2)
_above = _grid[_gg >= _target]
assert abs(_b2 - (_above.max() - _above.min())) < 1e-4, "Low Q: matches the band measured on a fine grid."
try:
    bandwidth(1.0, 0.5)
    assert False, "No peak, no bandwidth: ValueError."
except ValueError:
    pass
"SUCCESS: Poles close to the axis make a tall, narrow peak: about Q high and ω0/Q wide."
```

Hint: The gain is largest where (1 − r²)² + (r/Q)² is smallest; the formulas in the task give that point. For the bandwidth, the gain rises up to the peak and falls after it, so bisect on [0, ω_p] for the lower −3 dB point and on [ω_p, a large ω] for the upper one.
:::

## What you learned

- A rational function p/q is undefined where q = 0: a pole if p ≠ 0 there (odd poles change sign, even ones do not), a removable hole if the factor cancels.
- Polynomial division gives the far-field behaviour: asymptote y = 0, a horizontal line at the ratio of leading coefficients, or a slanted line, depending on the degrees.
- The thin-lens equation v = uf/(u − f) has its pole at the focal point and asymptote v = f; inside the focal length the image is virtual and enlarged.
- A second-order transfer function's poles sit ω₀/(2Q) from the imaginary axis; the closer they are, the taller (about Q) and narrower (about ω₀/Q) the resonance.
- Partial fractions split a rational function into one simple term per pole; sums of such terms can telescope.

The next lesson builds functions from pieces: piecewise definitions, the trapezoidal motion profiles that drive every servo axis, and how to make the joins smooth.
