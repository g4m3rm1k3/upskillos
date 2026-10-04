# Right-triangle trigonometry

The sine and cosine lesson built sin, cos and tan from rotation and connected them to right triangles. This lesson puts the right triangle to work. A slope can be stated three ways: as an angle, as a percentage grade, or as a "1 in n" ratio. A load on a ramp splits its weight into a part that drives it down the slope and a part pressed into the surface. A height can be found from two angle readings without ever reaching the object. The small-angle approximations that engineers use daily (sin θ ≈ θ, cos θ ≈ 1 − θ²/2) have errors you can bound. And the sine bar, a block of hardened steel, sets precise angles in a metrology lab using nothing but a sine.

This lesson covers:

- slopes as angles, grades and ratios, and converting between them;
- forces on an inclined plane, friction and the angle of repose;
- heights and distances from angles of elevation;
- the small-angle approximations, and how wrong they get;
- the sine bar: setting angles from lengths, and how errors propagate.

## Angles, grades and ratios

::: math
\[ \text{grade} = \tan\theta = \frac{\text{rise}}{\text{run}}, \qquad \text{grade}\,\% = 100\tan\theta, \qquad \text{"1 in } n\text{"}: \; \tan\theta = \frac{1}{n} \]
- $\theta$: the slope angle; rise: vertical gain; run: horizontal distance (not the length along the slope)
- a 100% grade is 45°, not vertical; grade and angle are close only for gentle slopes
- the length along the slope is $\text{run}/\cos\theta = \text{rise}/\sin\theta$
In code: conversions between angle, grade and ratio for several slopes; the length of an access ramp
:::

The same slope is described three ways in different trades. Road signs and civil engineers use the **grade** in percent, rise per hundred units of horizontal run. Wheelchair-ramp standards say "1 in 12". Surveyors and machinists use angles. All three are the tangent of the slope angle, written differently. Because the tangent is not proportional to the angle, the conversions are not linear: a 100% grade is a 45° slope, and a vertical wall is an infinite grade. For gentle slopes, grade, angle in radians and sine are almost equal, which is why they are often confused.

Predict before running: what angle is a 1-in-12 ramp, a 10% road and a 100% grade? How long must a ramp be to climb 0.75 m at 1 in 12?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

def grade_from_angle(deg):
    return 100 * math.tan(math.radians(deg))

def angle_from_grade(pct):
    return math.degrees(math.atan(pct / 100))

for name, pct in [("1 in 12 ramp", 100 / 12), ("10% road", 10.0), ("1 in 4 ramp", 25.0), ("100% grade", 100.0)]:
    print(f"{name:<14} grade {pct:6.2f}%  angle {angle_from_grade(pct):6.3f}°  sin {math.sin(math.atan(pct / 100)):.4f}")
rise = 0.75
run = rise * 12
along = math.hypot(rise, run)
print(f"climbing {rise} m at 1 in 12: run {run:.2f} m, ramp length along the slope {along:.3f} m")
```

A 1-in-12 ramp rises at 4.76°, a 10% road at 5.71°, and a 100% grade at exactly 45°. For gentle slopes the grade (as a fraction), the sine and the angle in radians nearly agree: 0.0833, 0.0830 and 0.0831 for the ramp. They drift apart on steep ones. Climbing 0.75 m at 1 in 12 needs 9 m of run and a ramp 9.031 m long along its surface. Building codes add landings every 9 m or so, which is why accessible entrances have their characteristic switchbacks.

## Forces on a slope

::: math
\[ F_\parallel = m g \sin\theta, \qquad N = m g \cos\theta, \qquad F_\text{push} = m g\,(\sin\theta + \mu\cos\theta), \qquad \text{slides when } \tan\theta > \mu_s \]
- the weight $mg$ splits into a part along the slope, $F_\parallel$, and a part pressing into it, $N$
- friction can supply up to $\mu N$; $\mu_s$: static friction coefficient
- the **angle of repose** $\theta_r = \arctan\mu_s$ is the steepest slope on which a load stays put; loose materials pile up at this angle
In code: the force to push a 200 kg crate up ramps of increasing angle; the angle of repose for several friction coefficients
:::

A load on a slope feels its weight mg straight down. Resolved along and across the slope, as in the components lesson, that gives mg sin θ trying to slide it down and mg cos θ pressing it into the surface. The pressing part sets the friction available, up to μ times the normal force. To push the load up at steady speed takes mg(sin θ + μ cos θ). The load slides on its own once mg sin θ exceeds μ_s mg cos θ, that is, once tan θ > μ_s. That threshold, the **angle of repose**, is why sand and gravel always pile at the same angle, and why conveyor belts have a maximum incline.

Predict before running: a 200 kg crate on steel rollers (μ = 0.05) and on a wooden ramp (μ = 0.4). How hard must you push up a 10° ramp in each case, and at what angle does the crate start sliding back on its own?

```python
m, g = 200.0, 9.81
for surface, mu in [("rollers", 0.05), ("wood", 0.4)]:
    for deg in [5, 10, 20]:
        th = math.radians(deg)
        push = m * g * (math.sin(th) + mu * math.cos(th))
        print(f"{surface:<8} μ = {mu}: {deg:>2}° ramp needs {push:6.0f} N ({push / (m * g):.1%} of the weight)")
    print(f"  angle of repose: {math.degrees(math.atan(mu)):.1f}°")
print(f"lifting straight up needs {m * g:.0f} N")
```

On rollers a 10° ramp needs about 437 N, 22% of the weight, so a ramp really is a force multiplier. On wood it needs about 1,114 N, more than half the weight, most of it spent fighting friction. The crate slides back on its own above 2.9° on rollers but only above 21.8° on wood. That is the tilting-board test for measuring a static friction coefficient: raise the board until the block starts to slide, and μ_s is the tangent of that angle.

## Heights from two angles

::: math
\[ \tan\alpha = \frac{h}{x + d}, \quad \tan\beta = \frac{h}{x} \;\Longrightarrow\; h = \frac{d}{\cot\alpha - \cot\beta}, \qquad x = h\cot\beta \]
- $\alpha$ and $\beta$: angles of elevation to the top, from two points $d$ apart on a line towards the object ($\beta > \alpha$, measured closer)
- $x$: the unknown distance from the nearer point to the foot of the object; $h$: the height above eye level
- two angles and one paced distance give both the height and the distance, without reaching the object
In code: a chimney measured from two points 30 m apart; the effect of a 0.2° error in each angle
:::

The shadow method of the previous lesson needs sunshine. A height can also be found from angles alone, even when the foot of the object cannot be reached, say across a river or behind a fence. Measure the angle of elevation to the top from one point, walk a known distance d straight towards the object, and measure again. Two right triangles share the unknown height h and the unknown distance x. Each gives a tangent equation, and eliminating x leaves h in terms of the two angles and d. This is the classic surveying problem with a theodolite or an inclinometer app on a phone.

Predict before running: a chimney's top is at 18° from one point and 27° from a point 30 m closer. How tall is it above eye level, and how far away? What does a 0.2° error in each angle do to the answer?

```python
def height_two_angles(d, alpha_deg, beta_deg):
    cot = lambda deg: 1 / math.tan(math.radians(deg))
    h = d / (cot(alpha_deg) - cot(beta_deg))
    return h, h * cot(beta_deg)

h, x = height_two_angles(30.0, 18.0, 27.0)
print(f"height above eye level {h:.2f} m, distance from the nearer point {x:.2f} m")
for da, db in [(0.2, 0), (0, 0.2), (0.2, -0.2), (-0.2, 0.2)]:
    hh, _ = height_two_angles(30.0, 18.0 + da, 27.0 + db)
    print(f"  angles off by ({da:+.1f}°, {db:+.1f}°): height {hh:.2f} m ({hh - h:+.2f})")
```

The chimney rises about 26.9 m above eye level and stands about 52.8 m from the nearer point. Angle errors matter. A 0.2° error in one angle moves the height by 0.4 to 0.9 m, and opposite errors in both move it by about 1.3 m, roughly 5%. The formula divides by cot α − cot β, which is small when the two angles are similar. As with the river in the previous lesson, good surveying geometry means making that difference large: a long baseline, or a nearer second point.

## Small-angle approximations

::: math
\[ \sin\theta \approx \theta, \qquad \tan\theta \approx \theta, \qquad \cos\theta \approx 1 - \frac{\theta^2}{2} \qquad (\theta \text{ in radians}) \]
- the relative error of $\sin\theta \approx \theta$ is about $\theta^2/6$, of $\tan\theta \approx \theta$ about $\theta^2/3$; the cosine approximation's error is about $\theta^4/24$
- below about 10° (0.17 rad) the sine and tangent approximations are within about 1% and 2%
In code: the relative errors at several angles against the predicted $\theta^2/6$ and $\theta^2/3$
:::

Engineers routinely replace sin θ and tan θ by θ for small angles: in the pendulum's period, in beam deflections, in optics' paraxial rays, in surveying corrections. The approximations come from the first terms of the Taylor series, which the calculus block derives: sin θ = θ − θ³/6 + .... So the relative error of sin θ ≈ θ is about θ²/6, and of tan θ ≈ θ about θ²/3. The approximations work only in radians, another reason radians are the natural unit, and their errors grow quickly with the angle.

Predict before running: at 5°, 10°, 20° and 30°, what are the relative errors of sin θ ≈ θ and tan θ ≈ θ, and of cos θ ≈ 1 − θ²/2?

```python
for deg in [1, 5, 10, 20, 30]:
    th = math.radians(deg)
    e_sin = (th - math.sin(th)) / math.sin(th)
    e_tan = (math.tan(th) - th) / math.tan(th)
    e_cos = (1 - th ** 2 / 2 - math.cos(th)) / math.cos(th)
    print(f"{deg:>2}°: sin≈θ {e_sin:8.4%} (θ²/6 {th ** 2 / 6:7.4%}), tan≈θ {e_tan:8.4%} (θ²/3 {th ** 2 / 3:7.4%}), cos≈1-θ²/2 {e_cos:+.2e}")
```

At 5° the approximations are within 0.13% (sine) and 0.25% (tangent); at 10°, within 0.5% and 1%. At 30° the tangent approximation is 9% off. The predicted θ²/6 and θ²/3 track the actual errors closely for small angles. The cosine approximation is far more accurate, its error growing like θ⁴: about 4 × 10⁻⁹ at 1° and 0.36% at 30°. A useful rule: below about 10°, replacing sin and tan by the angle in radians costs under 1%.

## The sine bar

::: math
\[ \sin\theta = \frac{H}{L}, \qquad H = L\sin\theta, \qquad \delta\theta \approx \frac{\delta H}{L\cos\theta} \]
- $L$: the distance between the sine bar's two rollers (typically 100 or 200 mm); $H$: the height of the gauge-block stack under one roller
- the angle's error from a height error grows like $1/\cos\theta$: sine bars become inaccurate above about 45° and useless near 90°
In code: the stack height for several angles on a 100 mm bar; the angle error from a 1 µm stack error
:::

How do you set a workpiece at exactly 17.5° for grinding or inspection? A **sine bar** is a precision steel bar resting on two rollers whose centres are exactly L apart. One roller stands on the surface plate; the other is raised on a stack of **gauge blocks**, hardened steel blocks made to within fractions of a micrometre. The bar's angle satisfies sin θ = H/L, so setting an angle means building a stack of height L sin θ. Lengths can be made far more accurately than angles can be measured directly, which is why this centuries-old idea still sets angles in metrology labs. The weak point is steep angles. Near 90° the sine barely changes with the angle, so a tiny height error becomes a large angle error: the inverse-derivative effect of the composition lesson.

Predict before running: on a 100 mm sine bar, what stack heights set 17.5°, 45° and 80°? If the stack is 1 µm out, how large is the angle error at each?

```python
L_bar = 100.0
for deg in [5, 17.5, 30, 45, 60, 80]:
    th = math.radians(deg)
    H = L_bar * math.sin(th)
    err_arcsec = math.degrees(0.001 / (L_bar * math.cos(th))) * 3600
    print(f"{deg:>5}°: stack {H:8.4f} mm; a 1 µm stack error moves the angle by {err_arcsec:5.2f} arc-seconds")
```

17.5° needs a stack of 30.0706 mm, 45° needs 70.7107 mm and 80° needs 98.4808 mm. A 1 µm error in the stack moves the angle by about 2.1 arc-seconds at small angles, 2.9 at 45° and 11.9 at 80°, because the cosine in the denominator shrinks. One arc-second is 1/3600 of a degree, so even 12 is tiny. But it grows without limit near 90°, and inspection practice keeps sine-bar angles below about 45°, measuring steeper angles from the complementary side.

::: challenge Slopes [easy]
Write `angle_from_grade(pct)` and `grade_from_angle(deg)` (plain floats; raise `ValueError` for a grade below 0, or an angle outside [0, 90)). Write `ratio_n(pct)`: the n in "1 in n" for a grade, as a plain float (raise `ValueError` for a grade ≤ 0). Then write `ramp(rise, n)`: for a ramp climbing `rise` at 1 in n, return `(run, length_along_slope, angle_deg)` as plain floats, raising `ValueError` unless rise > 0 and n > 0.

```python starter
import math

def angle_from_grade(pct):
    return 0.0

def grade_from_angle(deg):
    return 0.0

def ratio_n(pct):
    return 0.0

def ramp(rise, n):
    return (0.0, 0.0, 0.0)

print(angle_from_grade(10), ramp(0.75, 12))
```

```python solution
import math

def angle_from_grade(pct):
    if pct < 0:
        raise ValueError("grade must not be negative")
    return float(math.degrees(math.atan(pct / 100)))

def grade_from_angle(deg):
    if not 0 <= deg < 90:
        raise ValueError("angle must be in [0, 90)")
    return float(100 * math.tan(math.radians(deg)))

def ratio_n(pct):
    if pct <= 0:
        raise ValueError("grade must be positive")
    return float(100 / pct)

def ramp(rise, n):
    if rise <= 0 or n <= 0:
        raise ValueError("rise and n must be positive")
    run = rise * n
    return float(run), float(math.hypot(rise, run)), float(math.degrees(math.atan(1 / n)))

print(angle_from_grade(10), ramp(0.75, 12))
```

```python test
import math
for _n in ["angle_from_grade", "grade_from_angle", "ratio_n", "ramp"]:
    assert _n in dir(), f"Define {_n}."
assert abs(angle_from_grade(100) - 45) < 1e-12 and abs(angle_from_grade(10) - 5.710593) < 1e-6 and angle_from_grade(0) == 0.0, "100% is 45°; 10% is 5.71°."
assert abs(grade_from_angle(45) - 100) < 1e-9 and abs(grade_from_angle(angle_from_grade(37.5)) - 37.5) < 1e-9, "Inverse conversions."
for _bad in [lambda: angle_from_grade(-1), lambda: grade_from_angle(90), lambda: grade_from_angle(-5), lambda: ratio_n(0)]:
    try:
        _bad()
        assert False, "Out-of-range input should raise ValueError."
    except ValueError:
        pass
assert abs(ratio_n(100 / 12) - 12) < 1e-12 and ratio_n(25) == 4.0 and type(ratio_n(10)) is float, "1 in 12; 1 in 4."
_run, _len, _ang = ramp(0.75, 12)
assert abs(_run - 9.0) < 1e-12 and abs(_len - math.hypot(0.75, 9)) < 1e-12 and abs(_ang - 4.763642) < 1e-6, f"0.75 m at 1 in 12: 9 m run, 9.031 m long, 4.76°; got {(_run, _len, _ang)}."
assert all(type(_v) is float for _v in ramp(1, 20)), "Plain floats."
try:
    ramp(0, 12)
    assert False, "rise = 0 should raise ValueError."
except ValueError:
    pass
"SUCCESS: Grade, angle and '1 in n' are all the tangent of the slope, written three ways."
```

Hint: grade % = 100 tan θ, so θ = atan(grade/100); "1 in n" means tan θ = 1/n, so n = 100/grade. The run is rise × n, and the length along the slope is √(rise² + run²).
:::

::: challenge Inclines and elevations [medium]
Write `push_force(mass, angle_deg, mu, g=9.81)`: the force parallel to the slope needed to push a load up at steady speed, mg(sin θ + μ cos θ), as a plain float; raise `ValueError` if mass ≤ 0, mu < 0 or the angle is outside [0, 90]. Write `slides(angle_deg, mu_static)`: True (a plain bool) if a load on that slope slides by itself (tan θ > μ_s). Then write `height_and_distance(d, alpha_deg, beta_deg)`: from elevation angles α (farther point) and β (nearer point, d closer), return `(h, x)`: the height above eye level and the distance from the nearer point, as plain floats; raise `ValueError` unless 0 < α < β < 90 and d > 0.

```python starter
import math

def push_force(mass, angle_deg, mu, g=9.81):
    return 0.0

def slides(angle_deg, mu_static):
    return False

def height_and_distance(d, alpha_deg, beta_deg):
    return (0.0, 0.0)

print(push_force(200, 10, 0.05), height_and_distance(30, 18, 27))
```

```python solution
import math

def push_force(mass, angle_deg, mu, g=9.81):
    if mass <= 0 or mu < 0 or not 0 <= angle_deg <= 90:
        raise ValueError("bad input")
    th = math.radians(angle_deg)
    return float(mass * g * (math.sin(th) + mu * math.cos(th)))

def slides(angle_deg, mu_static):
    return bool(math.tan(math.radians(angle_deg)) > mu_static)

def height_and_distance(d, alpha_deg, beta_deg):
    if d <= 0 or not 0 < alpha_deg < beta_deg < 90:
        raise ValueError("need d > 0 and 0 < alpha < beta < 90")
    ca = 1 / math.tan(math.radians(alpha_deg))
    cb = 1 / math.tan(math.radians(beta_deg))
    h = d / (ca - cb)
    return float(h), float(h * cb)

print(push_force(200, 10, 0.05), height_and_distance(30, 18, 27))
```

```python test
import math
for _n in ["push_force", "slides", "height_and_distance"]:
    assert _n in dir(), f"Define {_n}."
_f = push_force(200, 10, 0.05)
assert type(_f) is float and abs(_f - 200 * 9.81 * (math.sin(math.radians(10)) + 0.05 * math.cos(math.radians(10)))) < 1e-9, "Rollers, 10°."
assert abs(push_force(50, 0, 0.3) - 0.3 * 50 * 9.81) < 1e-9 and abs(push_force(50, 90, 0.3) - 50 * 9.81) < 1e-9, "Level ground: friction only; vertical: the full weight."
for _bad in [(0, 10, 0.1), (10, 10, -0.1), (10, 95, 0.1)]:
    try:
        push_force(*_bad)
        assert False, f"push_force{_bad} should raise ValueError."
    except ValueError:
        pass
assert slides(25, 0.4) is True and slides(20, 0.4) is False and slides(3, 0.05) is True, "Above the angle of repose it slides."
_h, _x = height_and_distance(30, 18, 27)
assert type(_h) is float and abs(math.tan(math.radians(27)) * _x - _h) < 1e-9 and abs(math.tan(math.radians(18)) * (_x + 30) - _h) < 1e-9, "Both elevation angles must check."
assert abs(_h - 26.9) < 0.1 and abs(_x - 52.8) < 0.1, f"About 26.9 m high, 52.8 m away; got {(_h, _x)}."
for _bad in [(30, 27, 18), (0, 18, 27), (30, 18, 90)]:
    try:
        height_and_distance(*_bad)
        assert False, f"height_and_distance{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: A slope splits the weight into sine and cosine parts, and two elevation angles fix a height without reaching it."
```

Hint: Push force: the component along the slope plus μ times the normal component. With cot = 1/tan, h = d/(cot α − cot β) and x = h cot β.
:::

::: challenge The sine bar [hard]
Write `stack_height(L, angle_deg)`: the gauge-block stack height L sin θ for a sine bar of roller spacing L, as a plain float rounded to 4 decimal places (0.1 µm for millimetres); raise `ValueError` unless 0 ≤ angle < 90 and L > 0. Write `angle_from_stack(L, H)`: the angle in degrees set by a stack of height H, raising `ValueError` unless 0 ≤ H < L. Write `angle_error_arcsec(L, angle_deg, dH)`: the angle error in arc-seconds caused by a stack error dH, using the linear estimate dθ = dH/(L cos θ), as a plain float. Then write `small_angle_error(deg, which)`: the relative error of the small-angle approximation for `which` = "sin" ((θ − sin θ)/sin θ) or "tan" ((tan θ − θ)/tan θ), as a plain float; raise `ValueError` for any other `which` or an angle outside (0, 90).

```python starter
import math

def stack_height(L, angle_deg):
    return 0.0

def angle_from_stack(L, H):
    return 0.0

def angle_error_arcsec(L, angle_deg, dH):
    return 0.0

def small_angle_error(deg, which):
    return 0.0

print(stack_height(100, 17.5), angle_error_arcsec(100, 80, 0.001))
```

```python solution
import math

def stack_height(L, angle_deg):
    if L <= 0 or not 0 <= angle_deg < 90:
        raise ValueError("need L > 0 and 0 <= angle < 90")
    return float(round(L * math.sin(math.radians(angle_deg)), 4))

def angle_from_stack(L, H):
    if L <= 0 or not 0 <= H < L:
        raise ValueError("need 0 <= H < L")
    return float(math.degrees(math.asin(H / L)))

def angle_error_arcsec(L, angle_deg, dH):
    return float(math.degrees(dH / (L * math.cos(math.radians(angle_deg)))) * 3600)

def small_angle_error(deg, which):
    if not 0 < deg < 90:
        raise ValueError("angle must be in (0, 90)")
    th = math.radians(deg)
    if which == "sin":
        return float((th - math.sin(th)) / math.sin(th))
    if which == "tan":
        return float((math.tan(th) - th) / math.tan(th))
    raise ValueError("which must be 'sin' or 'tan'")

print(stack_height(100, 17.5), angle_error_arcsec(100, 80, 0.001))
```

```python test
import math
for _n in ["stack_height", "angle_from_stack", "angle_error_arcsec", "small_angle_error"]:
    assert _n in dir(), f"Define {_n}."
assert stack_height(100, 17.5) == 30.0706 and stack_height(100, 45) == 70.7107 and stack_height(200, 30) == 100.0, "Stack heights to 0.1 µm."
assert type(stack_height(100, 10)) is float and stack_height(100, 0) == 0.0, "Plain float; zero angle needs no stack."
for _bad in [(0, 10), (100, 90), (100, -1)]:
    try:
        stack_height(*_bad)
        assert False, f"stack_height{_bad} should raise ValueError."
    except ValueError:
        pass
assert abs(angle_from_stack(100, 30.0706) - 17.5) < 1e-4 and abs(angle_from_stack(100, 50) - 30) < 1e-12, "Back from the stack to the angle."
try:
    angle_from_stack(100, 100)
    assert False, "H = L would be 90°: ValueError."
except ValueError:
    pass
_e = angle_error_arcsec(100, 80, 0.001)
assert type(_e) is float and abs(_e - 11.88) < 0.01 and abs(angle_error_arcsec(100, 0, 0.001) - 2.0627) < 1e-3, f"1 µm on a 100 mm bar: about 2.06 arc-seconds at 0°, 11.9 at 80°; got {_e}."
assert abs(small_angle_error(10, "sin") - 0.005095) < 1e-5 and abs(small_angle_error(10, "tan") - 0.010175) < 1e-5, "At 10°: about 0.5% and 1%."
assert abs(small_angle_error(1, "sin") / (math.radians(1) ** 2 / 6) - 1) < 0.01, "For small angles the error is close to θ²/6."
for _bad in [(10, "cos"), (0, "sin"), (95, "tan")]:
    try:
        small_angle_error(*_bad)
        assert False, f"small_angle_error{_bad} should raise ValueError."
    except ValueError:
        pass
"SUCCESS: A sine bar turns a length into an angle, accurately at small angles and ever less so near 90°, where the sine flattens."
```

Hint: H = L sin θ; θ = asin(H/L). Differentiating H = L sin θ gives dH = L cos θ dθ, so dθ = dH/(L cos θ) in radians; multiply degrees by 3600 for arc-seconds.
:::

## What you learned

- Grade, "1 in n" and slope angle all express the tangent of the slope; they agree only for gentle slopes, and a 100% grade is 45°.
- On a slope the weight splits into mg sin θ along it and mg cos θ into it; pushing up needs mg(sin θ + μ cos θ), and a load slides by itself once tan θ exceeds μ_s (the angle of repose).
- Two elevation angles and a paced baseline give an object's height and distance, h = d/(cot α − cot β), best when the two angles differ well.
- sin θ ≈ θ and tan θ ≈ θ (radians) have relative errors about θ²/6 and θ²/3: under 1% below about 10°.
- A sine bar sets angles from gauge-block lengths, sin θ = H/L; the angle error per unit length error grows like 1/cos θ, so sine bars are used below about 45°.

The next lesson runs the trigonometric functions backwards: inverse trigonometry and atan2, recovering angles from measurements.
