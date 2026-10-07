# Triangles and similarity

The triangle is the basic unit of geometry, surveying and computing alike. Surveyors measured whole countries by chaining triangles together. Truss bridges are triangles because a triangle cannot change shape without changing a side. Every 3D model on a screen is a mesh of millions of them. This block of lessons returns to geometry and trigonometry with that triangle at the centre. This first lesson covers what makes three lengths a triangle, how **similar** triangles let one measurement scale into another (the oldest surveying trick there is), the special points every triangle has, and the area formula from sides alone, along with the numerical trap hidden in it.

This lesson covers:

- which side lengths make a triangle, and classifying it by sides and angles;
- similar triangles: equal angles, proportional sides, and how areas and volumes scale;
- measuring the inaccessible: heights from shadows and widths across a river;
- the centroid, circumcentre and incentre, from coordinates;
- Heron's formula for the area from the sides, and computing it stably.

## Which lengths make a triangle

::: math
\[ a < b + c, \quad b < a + c, \quad c < a + b, \qquad \cos C = \frac{a^2 + b^2 - c^2}{2ab}, \qquad A + B + C = 180° \]
- the **triangle inequality**: each side is shorter than the other two together, otherwise the sides cannot meet
- the angle opposite the longest side $c$ is right if $c^2 = a^2 + b^2$, obtuse if $c^2 > a^2 + b^2$, acute otherwise (Pythagoras and its converse)
In code: `classify(a, b, c)` sorts the sides and compares squares; the angles from the law of cosines add to 180°
:::

Three lengths form a triangle only if each is shorter than the other two together. That is the triangle inequality, met in the absolute-value lesson as a fact about distances. If one side equals the sum of the others, the "triangle" is flat, three points on a line. Beyond that, a triangle is classified two ways. By its sides it is **equilateral** (all equal), **isosceles** (two equal) or **scalene**. By its largest angle, which faces the longest side, it is **right**, **obtuse** or **acute**. Comparing c² with a² + b² decides which without computing any angle. The law of cosines, which the next lessons develop, then gives each angle, and the three always add to 180°.

Predict before running: which of these side triples are triangles, and of what kinds: (3, 4, 5), (2, 2, 3), (5, 5, 5), (1, 2, 3), (4, 5, 8)?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

def classify(a, b, c):
    a, b, c = sorted([a, b, c])
    if a + b <= c:
        return "not a triangle", None
    sides = "equilateral" if a == c else "isosceles" if a == b or b == c else "scalene"
    angle = "right" if math.isclose(c * c, a * a + b * b) else "obtuse" if c * c > a * a + b * b else "acute"
    return sides, angle

def angles(a, b, c):
    A = math.degrees(math.acos((b * b + c * c - a * a) / (2 * b * c)))
    B = math.degrees(math.acos((a * a + c * c - b * b) / (2 * a * c)))
    return A, B, 180 - A - B

for tri in [(3, 4, 5), (2, 2, 3), (5, 5, 5), (1, 2, 3), (4, 5, 8)]:
    kind = classify(*tri)
    extra = ""
    if kind[1] is not None:
        A, B, C = angles(*tri)
        extra = f"  angles {A:.2f}°, {B:.2f}°, {C:.2f}° (sum {A + B + C:.0f}°)"
    print(f"{tri}: {kind[0]}{', ' + kind[1] if kind[1] else ''}{extra}")
```

```output
(3, 4, 5): scalene, right  angles 36.87°, 53.13°, 90.00° (sum 180°)
(2, 2, 3): isosceles, obtuse  angles 41.41°, 41.41°, 97.18° (sum 180°)
(5, 5, 5): equilateral, acute  angles 60.00°, 60.00°, 60.00° (sum 180°)
(1, 2, 3): not a triangle
(4, 5, 8): scalene, obtuse  angles 24.15°, 30.75°, 125.10° (sum 180°)
```

(3, 4, 5) is the classic right triangle: 9 + 16 = 25, with angles 36.87°, 53.13° and 90°. (2, 2, 3) is isosceles and obtuse, since 9 > 4 + 4, so its largest angle is 97.2°. (5, 5, 5) has three 60° angles. (1, 2, 3) is not a triangle: 1 + 2 is not more than 3, so the "triangle" lies flat. (4, 5, 8) is scalene and obtuse, its largest angle 125.1°. Builders still check a right angle with a tape measure and the 3-4-5 rule.

## Similar triangles

::: math
\[ \frac{a'}{a} = \frac{b'}{b} = \frac{c'}{c} = k \;\Longleftrightarrow\; \text{equal angles}, \qquad \text{area}' = k^2\,\text{area}, \qquad \text{volume}' = k^3\,\text{volume} \]
- two triangles are **similar** when one is a scaled copy of the other: the same angles, and all sides in the same ratio $k$
- two equal angles are enough (the third then matches, since the angles add to 180°)
- lengths scale by $k$, areas by $k^2$ and volumes by $k^3$: the ratios lesson's square–cube law
In code: `similar(t1, t2)` compares sorted side ratios; the areas of a triangle and its 1:50 model
:::

Two triangles are **similar** when they have the same shape: equal angles and proportional sides, every side multiplied by the same scale factor k. Equal angles force proportional sides, and the reverse. Since the angles always add to 180°, two matching angles are enough. Similarity is what makes scale drawings and models work. Every length in a 1:50 model is 1/50 of the real one, but every area is 1/2500 and every volume 1/125,000, the square–cube law of the ratios lesson.

Predict before running: are the triangles (3, 4, 5) and (7.5, 10, 12.5) similar? A triangular gusset plate has sides 300, 400 and 500 mm. What is the area of its 1:50 model, compared with the full-size plate?

```python type
def similar(t1, t2, tol=1e-9):
    r = np.array(sorted(t2), dtype=float) / np.array(sorted(t1), dtype=float)
    return bool(np.allclose(r, r[0], rtol=tol)), float(r[0])

def heron_simple(a, b, c):
    s = (a + b + c) / 2
    return math.sqrt(s * (s - a) * (s - b) * (s - c))

print("(3, 4, 5) and (7.5, 10, 12.5):", similar((3, 4, 5), (7.5, 10, 12.5)))
print("(3, 4, 5) and (6, 8, 11):", similar((3, 4, 5), (6, 8, 11)))
full, model = (300, 400, 500), tuple(v / 50 for v in (300, 400, 500))
print(f"plate area {heron_simple(*full):,.0f} mm²; model {heron_simple(*model):.1f} mm²; ratio {heron_simple(*full) / heron_simple(*model):,.0f} = 50²")
```

```output
(3, 4, 5) and (7.5, 10, 12.5): (True, 2.5)
(3, 4, 5) and (6, 8, 11): (False, 2.0)
plate area 60,000 mm²; model 24.0 mm²; ratio 2,500 = 50²
```

(3, 4, 5) and (7.5, 10, 12.5) are similar with scale factor 2.5; (6, 8, 11) is not, since 11/5 differs from 8/4. The plate has an area of 60,000 mm². Its 1:50 model, with sides 6, 8 and 10 mm, has 24 mm², a ratio of 2,500 = 50². A wind-tunnel or water-tunnel model (the dimensional-analysis lesson) has every area, and so every force from pressure, scaled by k².

## Measuring what cannot be reached

::: math
\[ \frac{H}{S} = \frac{h}{s} \;\Longrightarrow\; H = S\,\frac{h}{s}, \qquad \frac{W}{b} = \frac{W + p}{q} \;\Longrightarrow\; W = \frac{b\,p}{q - b} \]
- Thales: a pole of height $h$ casting shadow $s$ and a building casting shadow $S$ form similar triangles with the sun's rays
- across a river: a baseline and two sight lines to the same far mark make two similar triangles sharing an angle (the intercept theorem)
In code: the building's height from shadows; a river's width from three paced lengths
:::

Similarity lets one measure what cannot be reached. According to tradition, Thales measured the height of an Egyptian pyramid from its shadow. At any moment the sun's rays make the same angle with the ground everywhere, so a pole and a building, with their shadows, form similar triangles. The building's height is the pole's height times the ratio of the shadows. The same idea crosses a river. Sight a mark on the far bank from two points along a line perpendicular to the river, and the sight lines and baselines form two similar triangles nested inside each other, with the river's width as the unknown side. The **intercept theorem** turns three paced distances into the width.

Here is the river setup. You stand on the near bank at A, directly opposite a tree T on the far bank. You walk b metres along the bank to B and plant a stake. You keep walking p metres back from the river, perpendicular to it, to a point D, and from there walk along until you stand at E, where the stake and the tree line up; that sideways walk is q metres. Triangles TAB and TDE are similar.

Predict before running: a 2 m pole casts a 1.6 m shadow while a building casts 18.4 m. How tall is the building? And with b = 20 m, p = 10 m and q = 30 m, how wide is the river?

```python type
h_pole, s_pole, s_building = 2.0, 1.6, 18.4
print(f"building height {s_building * h_pole / s_pole:.1f} m")
b_base, p_back, q_side = 20.0, 10.0, 30.0
W = b_base * p_back / (q_side - b_base)
print(f"river width {W:.1f} m")
print(f"check the similar triangles: W / b = {W / b_base:.3f}, (W + p) / q = {(W + p_back) / q_side:.3f}")
for q_err in [29.5, 30.5]:
    print(f"  if q were {q_err} m: width {b_base * p_back / (q_err - b_base):.2f} m")
```

```output
building height 23.0 m
river width 20.0 m
check the similar triangles: W / b = 1.000, (W + p) / q = 1.000
  if q were 29.5 m: width 21.05 m
  if q were 30.5 m: width 19.05 m
```

The building is 23 m tall. The river is 20 m wide, and the two triangles' ratios agree at 1.000. The sensitivity is worth noticing: measuring the sideways walk as 29.5 or 30.5 m instead of 30 gives widths of 21.05 or 19.05 m. A 0.5 m error in one paced distance moves the answer by about 1 m, because the formula divides by the small difference q − b. Good survey geometry keeps such differences large, the conditioning lesson in surveying form.

## The special points of a triangle

::: math
\[ G = \frac{A + B + C}{3}, \qquad |O - A| = |O - B| = |O - C| = R, \qquad I = \frac{aA + bB + cC}{a + b + c} \]
- the **centroid** $G$ (balance point) is the average of the vertices; the medians meet there
- the **circumcentre** $O$ is equidistant from the three vertices: the centre of the circle through them, where the perpendicular bisectors meet
- the **incentre** $I$ is equidistant from the three sides: the centre of the inscribed circle, a weighted average of the vertices by the lengths of the opposite sides $a$, $b$, $c$
In code: the three points for one triangle; the circumcentre from a 2 × 2 linear system
:::

Every triangle has several special points, each answering a practical question. The **centroid**, the average of the three vertices, is where a triangular plate balances, the centre of mass of a uniform sheet. The **circumcentre** is equally far from all three corners, so it is the place for a wireless access point serving three machines equally, or for a pivot reaching three holes. It is found by solving the linear system that says the distances are equal, which the circle subtraction trick of the nonlinear-systems lesson makes linear. The **incentre** is equally far from the three sides, the centre of the largest circle that fits inside: the largest round hole a triangular gusset can take.

Predict before running: for the triangle (0, 0), (8, 0), (2, 6), where are the three points, and is the circumcentre inside the triangle?

```python type
A, B, C = np.array([0.0, 0.0]), np.array([8.0, 0.0]), np.array([2.0, 6.0])
G = (A + B + C) / 3
M = 2 * np.array([B - A, C - A])
rhs = np.array([B @ B - A @ A, C @ C - A @ A])
O = np.linalg.solve(M, rhs)
a_len, b_len, c_len = np.linalg.norm(B - C), np.linalg.norm(C - A), np.linalg.norm(A - B)
I = (a_len * A + b_len * B + c_len * C) / (a_len + b_len + c_len)
area = 0.5 * abs((B - A)[0] * (C - A)[1] - (B - A)[1] * (C - A)[0])
r_in = 2 * area / (a_len + b_len + c_len)
print(f"centroid {G.round(4)}; circumcentre {O.round(4)}, radius {np.linalg.norm(O - A):.4f} (to each vertex: {[round(float(np.linalg.norm(O - P)), 4) for P in (A, B, C)]})")
print(f"incentre {I.round(4)}, inscribed radius {r_in:.4f}; area {area}")

fig, ax = plt.subplots(figsize=(4.5, 4))
tri = np.array([A, B, C, A])
ax.plot(tri[:, 0], tri[:, 1], "k-")
for P, name in [(G, "centroid"), (O, "circumcentre"), (I, "incentre")]:
    ax.plot(*P, "o", label=name)
circle = np.linspace(0, 2 * np.pi, 200)
ax.plot(O[0] + np.linalg.norm(O - A) * np.cos(circle), O[1] + np.linalg.norm(O - A) * np.sin(circle), ":", color="grey")
ax.plot(I[0] + r_in * np.cos(circle), I[1] + r_in * np.sin(circle), ":", color="grey")
ax.set_aspect("equal")
ax.legend(fontsize=8)
plt.show()
```

```output
centroid [3.3333 2.    ]; circumcentre [4. 2.], radius 4.4721 (to each vertex: [4.4721, 4.4721, 4.4721])
incentre [2.9196 2.1044], inscribed radius 2.1044; area 24.0
```

The centroid is at (3.333, 2), the circumcentre at (4, 2) with radius 4.472 (the same distance to all three corners), and the incentre at about (2.92, 2.10) with an inscribed radius of about 2.10. The triangle's largest angle, at (0, 0), is about 71.6°: acute. So the circumcentre lies inside. For a right triangle it would sit at the middle of the hypotenuse, and for an obtuse one outside the triangle altogether: an access point "equidistant from three machines" may need to be outside the building.

## Heron's formula, computed carefully

::: math
\[ \text{Area} = \sqrt{s(s - a)(s - b)(s - c)}, \quad s = \frac{a + b + c}{2}; \qquad \text{stable: } \tfrac{1}{4}\sqrt{\big(a + (b + c)\big)\big(c - (a - b)\big)\big(c + (a - b)\big)\big(a + (b - c)\big)}, \;\; a \ge b \ge c \]
- Heron's formula gives the area from the three sides alone
- for a thin "needle" triangle, $s - a$ subtracts nearly equal numbers and loses digits (catastrophic cancellation)
- Kahan's rearrangement, with the sides sorted and the brackets exactly as written, keeps full precision
In code: both formulas on ordinary and needle triangles, against an exact calculation with `Fraction`
:::

Heron of Alexandria's formula gives a triangle's area from its three sides, no angles needed. Surveyors and mesh-generation codes use it constantly. It hides the trap of the when-numbers-betray-you lesson. For a long, thin triangle, s is barely larger than the longest side a, so s − a is a difference of nearly equal numbers, and most of its digits are rounding noise. William Kahan's rearrangement sorts the sides (a ≥ b ≥ c) and groups the arithmetic so that no subtraction of nearly equal quantities loses information. The brackets must be kept exactly as written.

Predict before running: for a needle triangle with sides 1, 1 and 10⁻⁷, how many correct digits does each formula give?

```python type
from fractions import Fraction

def heron_naive(a, b, c):
    s = (a + b + c) / 2
    return math.sqrt(max(s * (s - a) * (s - b) * (s - c), 0.0))

def heron_kahan(a, b, c):
    a, b, c = sorted([a, b, c], reverse=True)
    return 0.25 * math.sqrt((a + (b + c)) * (c - (a - b)) * (c + (a - b)) * (a + (b - c)))

def heron_exact(a, b, c):
    a, b, c = (Fraction(v) for v in (a, b, c))
    s = (a + b + c) / 2
    return math.sqrt(s * (s - a) * (s - b) * (s - c))

for tri in [(3.0, 4.0, 5.0), (1.0, 1.0, 1e-7), (1e6, 1e6, 1e-3), (10.0, 5.000001, 5.000001)]:
    ex = heron_exact(*tri)
    print(f"{tri}: naive rel. error {abs(heron_naive(*tri) - ex) / ex:.1e}, Kahan rel. error {abs(heron_kahan(*tri) - ex) / ex:.1e}")
```

```output
(3.0, 4.0, 5.0): naive rel. error 0.0e+00, Kahan rel. error 0.0e+00
(1.0, 1.0, 1e-07): naive rel. error 1.6e-09, Kahan rel. error 1.3e-16
(1000000.0, 1000000.0, 0.001): naive rel. error 6.9e-08, Kahan rel. error 0.0e+00
(10.0, 5.000001, 5.000001): naive rel. error 4.4e-10, Kahan rel. error 0.0e+00
```

For the 3-4-5 triangle both formulas are exact. For the needle triangle (1, 1, 10⁻⁷) the naive formula's relative error is around 10⁻⁹: about seven of the sixteen digits are gone. Kahan's version is correct to rounding. The (10⁶, 10⁶, 10⁻³) needle is worse for the naive formula, and the nearly flat (10, 5.000001, 5.000001), whose tiny area comes from a small height, loses digits as well. Thin triangles are common in real meshes, so geometry codes use the stable form.

::: challenge Classifying triangles [easy]
Write `classify(a, b, c, tol=1e-9)`: return `(by_sides, by_angle)` for three positive side lengths: by_sides is "equilateral", "isosceles" or "scalene" (sides equal when they differ by at most tol relative to the largest side) and by_angle is "right", "obtuse" or "acute" (right when |c² − a² − b²| ≤ tol × c² for the longest side c). Return `("not a triangle", None)` if the largest side is at least the sum of the other two, and raise `ValueError` if any side is not positive. Then write `similar(t1, t2, tol=1e-9)`: True (a plain bool) when the two side triples are proportional (sorted ratios equal within tol relative), and `scale_area(area, k)`: the area of a copy scaled by k, as a plain float.

```python starter
def classify(a, b, c, tol=1e-9):
    return ("scalene", "acute")

def similar(t1, t2, tol=1e-9):
    return False

def scale_area(area, k):
    return area

print(classify(3, 4, 5), similar((3, 4, 5), (7.5, 10, 12.5)))
```

```python solution
def classify(a, b, c, tol=1e-9):
    if min(a, b, c) <= 0:
        raise ValueError("sides must be positive")
    a, b, c = sorted([a, b, c])
    if a + b <= c:
        return ("not a triangle", None)
    eq = lambda x, y: abs(x - y) <= tol * c
    sides = "equilateral" if eq(a, c) else "isosceles" if eq(a, b) or eq(b, c) else "scalene"
    gap = c * c - a * a - b * b
    angle = "right" if abs(gap) <= tol * c * c else "obtuse" if gap > 0 else "acute"
    return (sides, angle)

def similar(t1, t2, tol=1e-9):
    r = [y / x for x, y in zip(sorted(t1), sorted(t2))]
    return bool(all(abs(v - r[0]) <= tol * abs(r[0]) for v in r))

def scale_area(area, k):
    return float(area * k * k)

print(classify(3, 4, 5), similar((3, 4, 5), (7.5, 10, 12.5)))
```

```python test
for _n in ["classify", "similar", "scale_area"]:
    assert _n in dir(), f"Define {_n}."
assert classify(3, 4, 5) == ("scalene", "right") and classify(5, 3, 4) == ("scalene", "right"), "3-4-5 in any order."
assert classify(2, 2, 3) == ("isosceles", "obtuse") and classify(5, 5, 5) == ("equilateral", "acute"), "Isosceles obtuse; equilateral."
assert classify(4, 5, 8) == ("scalene", "obtuse") and classify(6, 7, 8) == ("scalene", "acute"), "Obtuse and acute scalene."
assert classify(1, 2, 3) == ("not a triangle", None) and classify(1, 1, 5) == ("not a triangle", None), "Degenerate and impossible."
assert classify(1, 1, 2 ** 0.5) == ("isosceles", "right"), "Right isosceles, despite √2 being inexact."
try:
    classify(0, 3, 4)
    assert False, "A zero side should raise ValueError."
except ValueError:
    pass
assert similar((3, 4, 5), (7.5, 10, 12.5)) is True and similar((3, 4, 5), (12.5, 7.5, 10)) is True, "Proportional, in any order."
assert similar((3, 4, 5), (6, 8, 11)) is False, "Not proportional."
assert scale_area(24.0, 50) == 60000.0 and type(scale_area(6, 0.5)) is float, "Areas scale by k²."
"SUCCESS: Three sides make a triangle only if each is shorter than the other two together; similar triangles share angles and scale areas by k²."
```

Hint: Sort the sides so c is the longest. The sum test decides whether it is a triangle; comparing c² with a² + b² decides the largest angle. For similarity, divide the sorted sides of one by the sorted sides of the other and check that the ratios agree.
:::

::: challenge Triangle centres [medium]
Write `centroid(A, B, C)`, `circumcentre(A, B, C)` and `incentre(A, B, C)` for three points given as pairs (lists, tuples or arrays). Each returns a tuple of plain floats. The circumcentre solves the linear system 2(B − A)·O = |B|² − |A|², 2(C − A)·O = |C|² − |A|²; the incentre is (aA + bB + cC)/(a + b + c) with a = |B − C|, b = |C − A|, c = |A − B|. Raise `ValueError` in all three if the points are collinear (twice the signed area below 1e-12 times the square of the longest side). Then write `inradius(A, B, C)` (twice the area divided by the perimeter) and `circumradius(A, B, C)`, both plain floats.

```python starter
import numpy as np

def centroid(A, B, C):
    return (0.0, 0.0)

def circumcentre(A, B, C):
    return (0.0, 0.0)

def incentre(A, B, C):
    return (0.0, 0.0)

def inradius(A, B, C):
    return 0.0

def circumradius(A, B, C):
    return 0.0

print(circumcentre((0, 0), (8, 0), (2, 6)))
```

```python solution
import numpy as np

def _pts(A, B, C):
    A, B, C = (np.asarray(P, dtype=float) for P in (A, B, C))
    cross = (B - A)[0] * (C - A)[1] - (B - A)[1] * (C - A)[0]
    longest = max(np.linalg.norm(B - A), np.linalg.norm(C - B), np.linalg.norm(A - C))
    if abs(cross) < 1e-12 * longest ** 2:
        raise ValueError("the points are collinear")
    return A, B, C, cross

def centroid(A, B, C):
    A, B, C, _ = _pts(A, B, C)
    G = (A + B + C) / 3
    return float(G[0]), float(G[1])

def circumcentre(A, B, C):
    A, B, C, _ = _pts(A, B, C)
    M = 2 * np.array([B - A, C - A])
    O = np.linalg.solve(M, np.array([B @ B - A @ A, C @ C - A @ A]))
    return float(O[0]), float(O[1])

def incentre(A, B, C):
    A, B, C, _ = _pts(A, B, C)
    a, b, c = np.linalg.norm(B - C), np.linalg.norm(C - A), np.linalg.norm(A - B)
    I = (a * A + b * B + c * C) / (a + b + c)
    return float(I[0]), float(I[1])

def inradius(A, B, C):
    A, B, C, cross = _pts(A, B, C)
    perimeter = np.linalg.norm(B - C) + np.linalg.norm(C - A) + np.linalg.norm(A - B)
    return float(abs(cross) / perimeter)

def circumradius(A, B, C):
    O = np.array(circumcentre(A, B, C))
    return float(np.linalg.norm(O - np.asarray(A, dtype=float)))

print(circumcentre((0, 0), (8, 0), (2, 6)))
```

```python test
import math
import numpy as np
for _n in ["centroid", "circumcentre", "incentre", "inradius", "circumradius"]:
    assert _n in dir(), f"Define {_n}."
_A, _B, _C = (0, 0), (8, 0), (2, 6)
assert np.allclose(centroid(_A, _B, _C), (10 / 3, 2)) and all(type(_v) is float for _v in centroid(_A, _B, _C)), "Centroid (3.33, 2); plain floats."
_O = circumcentre(_A, _B, _C)
assert np.allclose(_O, (4, 2)) and abs(circumradius(_A, _B, _C) - math.sqrt(20)) < 1e-12, "Circumcentre (4, 2), radius √20."
assert np.allclose(circumcentre([0, 0], [6, 0], [0, 8]), (3, 4)), "Right triangle: the circumcentre is the hypotenuse's midpoint."
_I = incentre(_A, _B, _C)
_r = inradius(_A, _B, _C)
_d = lambda _P, _Q, _X: abs((_Q[0] - _P[0]) * (_P[1] - _X[1]) - (_P[0] - _X[0]) * (_Q[1] - _P[1])) / math.dist(_P, _Q)
assert all(abs(_d(_P, _Q, _I) - _r) < 1e-9 for _P, _Q in [(_A, _B), (_B, _C), (_C, _A)]), "The incentre is the inradius away from every side."
assert np.allclose(incentre((0, 0), (3, 0), (0, 4)), (1, 1)) and abs(inradius((0, 0), (3, 0), (0, 4)) - 1) < 1e-12, "3-4-5: inradius 1 at (1, 1)."
_obt = circumcentre((0, 0), (10, 0), (1, 1))
assert _obt[1] < 0, "An obtuse triangle's circumcentre lies outside, across the long side."
for _f in (centroid, circumcentre, incentre):
    try:
        _f((0, 0), (1, 1), (3, 3))
        assert False, f"{_f.__name__} with collinear points should raise ValueError."
    except ValueError:
        pass
"SUCCESS: The centroid averages the corners, the circumcentre is equidistant from them, and the incentre from the sides."
```

Hint: Twice the signed area is the 2D cross product (B − A) × (C − A). The circumcentre's two equations come from |O − A|² = |O − B|² and |O − A|² = |O − C|²: the squares of O cancel, leaving a 2 × 2 linear system.
:::

::: challenge Areas that keep their digits [hard]
Write `heron_naive(a, b, c)` (Heron's formula as usually written, with s = (a + b + c)/2) and `heron_stable(a, b, c)` (Kahan's form: sort so a ≥ b ≥ c and compute ¼√((a + (b + c))(c − (a − b))(c + (a − b))(a + (b − c))) with exactly those brackets). Both return plain floats and raise `ValueError` if the sides do not form a triangle (including the flat case) or any side is not positive. Then write `heron_exact(a, b, c)`: the area computed with exact `Fraction` arithmetic for s(s − a)(s − b)(s − c), taking the square root only at the end, as a plain float. Finally write `digits_lost(a, b, c)`: −log₁₀ of the naive formula's relative error against the exact one, subtracted from 16 and clipped to [0, 16], as a plain float (16 when the naive answer is exact).

```python starter
import math
from fractions import Fraction

def heron_naive(a, b, c):
    return 0.0

def heron_stable(a, b, c):
    return 0.0

def heron_exact(a, b, c):
    return 0.0

def digits_lost(a, b, c):
    return 0.0

print(heron_naive(1, 1, 1e-7), heron_stable(1, 1, 1e-7))
```

```python solution
import math
from fractions import Fraction

def _check(a, b, c):
    if min(a, b, c) <= 0:
        raise ValueError("sides must be positive")
    x, y, z = sorted([a, b, c])
    if x + y <= z:
        raise ValueError("not a triangle")

def heron_naive(a, b, c):
    _check(a, b, c)
    s = (a + b + c) / 2
    return float(math.sqrt(max(s * (s - a) * (s - b) * (s - c), 0.0)))

def heron_stable(a, b, c):
    _check(a, b, c)
    a, b, c = sorted([a, b, c], reverse=True)
    return float(0.25 * math.sqrt((a + (b + c)) * (c - (a - b)) * (c + (a - b)) * (a + (b - c))))

def heron_exact(a, b, c):
    _check(a, b, c)
    a, b, c = (Fraction(v) for v in (a, b, c))
    s = (a + b + c) / 2
    return float(math.sqrt(s * (s - a) * (s - b) * (s - c)))

def digits_lost(a, b, c):
    exact = heron_exact(a, b, c)
    err = abs(heron_naive(a, b, c) - exact) / exact
    if err == 0:
        return 16.0
    return float(min(16.0, max(0.0, 16 + math.log10(err))))

print(heron_naive(1, 1, 1e-7), heron_stable(1, 1, 1e-7))
```

```python test
import math
for _n in ["heron_naive", "heron_stable", "heron_exact", "digits_lost"]:
    assert _n in dir(), f"Define {_n}."
for _f in (heron_naive, heron_stable, heron_exact):
    assert _f(3, 4, 5) == 6.0 and type(_f(3.0, 4.0, 5.0)) is float, f"{_f.__name__}: 3-4-5 has area 6."
    assert abs(_f(2, 2, 2) - math.sqrt(3)) < 1e-15, f"{_f.__name__}: equilateral of side 2."
    for _bad in [(1, 2, 3), (1, 1, 5), (0, 1, 1)]:
        try:
            _f(*_bad)
            assert False, f"{_f.__name__}{_bad} should raise ValueError."
        except ValueError:
            pass
for _tri in [(1.0, 1.0, 1e-7), (1e6, 1e6, 1e-3), (10.0, 5.000001, 5.000001), (7.0, 1e-8, 7.0)]:
    _ex = heron_exact(*_tri)
    assert abs(heron_stable(*_tri) - _ex) <= 1e-14 * _ex, f"Kahan's form keeps full precision for {_tri}."
assert abs(heron_stable(1e-8, 7.0, 7.0) - heron_stable(7.0, 7.0, 1e-8)) < 1e-30, "Side order does not matter."
assert abs(heron_naive(1.0, 1.0, 1e-7) - heron_exact(1.0, 1.0, 1e-7)) / heron_exact(1.0, 1.0, 1e-7) > 1e-12, "The naive formula really does lose accuracy on a needle."
_dl = digits_lost(1.0, 1.0, 1e-7)
assert type(_dl) is float and 4 <= _dl <= 10, f"The needle triangle loses several digits; got {_dl:.1f}."
assert digits_lost(3, 4, 5) == 16.0 or digits_lost(3, 4, 5) < 1, "An ordinary triangle loses (almost) nothing."
"SUCCESS: Heron's formula is exact on paper; Kahan's ordering keeps it exact in floating point, even for needle triangles."
```

Hint: Keep Kahan's brackets exactly: (a + (b + c)), (c − (a − b)), (c + (a − b)), (a + (b − c)) with a ≥ b ≥ c. For the exact area, convert each float with `Fraction(v)` so nothing is rounded until the final square root.
:::

## What you learned

- Three lengths form a triangle only if each is shorter than the other two together; comparing the longest side's square with the sum of the others' squares classifies the largest angle as right, obtuse or acute.
- Similar triangles have equal angles and proportional sides; lengths scale by k, areas by k² and volumes by k³.
- Similar triangles measure the inaccessible: heights from shadows, river widths from paced baselines, with accuracy that depends on avoiding small differences.
- The centroid averages the vertices, the circumcentre is equidistant from them (a 2 × 2 linear system), and the incentre is equidistant from the sides.
- Heron's formula gives the area from the sides; Kahan's sorted, carefully bracketed form avoids catastrophic cancellation for needle-thin triangles.

The next lesson works inside the right triangle: the trigonometric ratios, and the slopes, ramps and forces they describe.
