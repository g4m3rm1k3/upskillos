# The laws of sines and cosines

Two survey stations are 40 metres apart. Both can see a marker across a river, but neither can measure the distance to it directly. Each station can measure an angle. The resulting triangle has no right angle, so ordinary right-triangle formulas do not immediately give the missing distances.

By the end of this notebook, you will choose a triangle formula from the information you have, calculate inaccessible distances, and recognise when the measurements allow two different answers. You will also see why nearly flat surveying triangles amplify angle errors.

Prerequisites: [right-triangle trigonometry](#/notebook-lab?lesson=math-right-triangle-trigonometry), [inverse trigonometry](#/notebook-lab?lesson=math-inverse-trig-and-atan2), and [trigonometric identities](#/notebook-lab?lesson=math-trig-identities). We use Python functions and `if` statements. Run the demos in order for their shared imports; the final reference lists the procedure without requiring the whole story again.

## 1. Name the triangle before calculating

Call the three corners **A**, **B** and **C**. An uppercase letter also names the angle at that corner. A lowercase letter names the opposite side: **a** faces A, **b** faces B, and **c** faces C. “Opposite” means the side does not touch that corner. This convention matters more than the triangle's orientation on the page.

For our river survey, station A is at the left end of the baseline and station B at the right. The known baseline AB is therefore side c. We measure A as 50° and B as 70°. The remaining angle C is 60°, because a plane triangle's angles total 180°. A distance labelled a runs from B to C, not from A to C.

::: math
\[ C=180°-50°-70°=60° \]
- $A,B,C$: interior angles at the named corners, each strictly between 0° and 180°.
- $a,b,c$: positive opposite-side lengths, all expressed in the same unit.
In code: subtract the two known angles from 180; use matching uppercase and lowercase names to keep pairs together.
:::

Predict before running: which unknown side should be longer, a opposite 50° or b opposite 70°? The larger angle faces the longer side.

```python
import math
import numpy as np
import matplotlib.pyplot as plt

A_deg = 50.0
B_deg = 70.0
C_deg = 180.0 - A_deg - B_deg
c = 40.0
print("Angles A, B, C (degrees):", A_deg, B_deg, C_deg)
print("Known side c = AB (metres):", c)
print("Longer unknown side predicted: b, opposite angle B")
```

The `_deg` suffix records that these variables contain degrees. Python's `math.sin`, `math.cos` and inverse functions use radians, so every angle passed to them must be converted. `math.radians(50)` converts the number 50 from degrees to radians; it does not change the physical angle. Conversion belongs at the boundary of the calculation, where we can see it.

## 2. One height gives the law of sines

Drop a perpendicular from C to the baseline AB. Call its length h. The left right triangle has hypotenuse b, so its height is b times sin(A). The right one has hypotenuse a, so the same height is a times sin(B). Equating those heights and rearranging gives a/sin(A) = b/sin(B). Repeating the construction with another baseline includes the third pair. For an obtuse triangle the perpendicular may meet an extended side; the same sine relation follows because supplementary angles have equal sines.

::: math
\[ h=b\sin A=a\sin B, \qquad \frac{a}{\sin A}=\frac{b}{\sin B}=\frac{c}{\sin C} \]
\[ a=40\frac{\sin 50°}{\sin 60°}, \qquad b=40\frac{\sin 70°}{\sin 60°} \]
- $h$: perpendicular height above the baseline, in metres.
- Each fraction pairs a side with its own opposite angle. The common ratio has units of length.
In code: find `scale = c / sin(C)` once, then multiply it by `sin(A)` and `sin(B)`.
:::

The law of sines is useful when you know a side and its opposite angle, plus another angle or side. Here the two measured angles supply C, so the known pair is c and C. Predict before running: will either unknown distance exceed the 40 m baseline?

```python
A = math.radians(A_deg)
B = math.radians(B_deg)
C = math.radians(C_deg)
scale = c / math.sin(C)
a = scale * math.sin(A)
b = scale * math.sin(B)
height = b * math.sin(A)
horizontal = b * math.cos(A)
print(f"BC = a = {a:.3f} m; AC = b = {b:.3f} m")
print(f"Marker position from A: {horizontal:.3f} m along, {height:.3f} m across")
print("Height calculated from B:", a * math.sin(B))
fig, ax = plt.subplots(figsize=(7, 4))
ax.plot([0, c, horizontal, 0], [0, 0, height, 0], "o-")
for label, px, py in [("A: 50°", 0, 0), ("B: 70°", c, 0), ("C: 60°", horizontal, height)]:
    ax.annotate(label, (px, py), xytext=(5, 6), textcoords="offset points")
ax.set(xlabel="Along baseline (m)", ylabel="Across river (m)", title="A triangle built from a baseline and two angles")
ax.set_aspect("equal", adjustable="box")
ax.margins(0.2)
fig.tight_layout()
plt.show()
```

Side a is about 35.38 m and side b about 43.40 m, consistent with their opposite angles. The height is about 33.25 m. In code, `horizontal` and `height` are the horizontal and vertical components of side b. The plotted point lists follow the perimeter A, B, C, A; the final repeated A closes the drawing. Equal axis scaling keeps a metre equally long in both directions, so the plotted angles are meaningful.

::: challenge Survey from a baseline [easy]
Write `survey(c, A_deg, B_deg)` returning `(a, b)` in the baseline's units. Use the law of sines. Raise `ValueError` when the baseline or either angle is nonpositive, or when the two angles total 180° or more. Inputs are finite scalars. A valid survey may include an obtuse angle.
```python starter
def survey(c, A_deg, B_deg):
    return c, c
```
```python solution
def survey(c, A_deg, B_deg):
    if c <= 0 or A_deg <= 0 or B_deg <= 0 or A_deg + B_deg >= 180:
        raise ValueError("Need a positive baseline and positive angles totalling less than 180 degrees")
    C_deg = 180 - A_deg - B_deg
    scale = c / math.sin(math.radians(C_deg))
    return scale * math.sin(math.radians(A_deg)), scale * math.sin(math.radians(B_deg))
```
```python test
assert np.allclose(survey(10, 60, 60), (10, 10)), "Equal angles require equal sides."
assert np.allclose(survey(2, 30, 60), (1, math.sqrt(3))), "Pair each side with its opposite angle and convert degrees to radians."
_a, _b = survey(40, 50, 70)
assert np.allclose((_a, _b), (35.38207723783673, 43.40254300529994)), "Check the inferred third angle and the baseline/opposite-angle pair."
assert np.allclose(survey(80, 50, 70), (2 * _a, 2 * _b)), "Doubling the baseline doubles both inferred distances."
assert survey(5, 110, 30)[0] > survey(5, 110, 30)[1], "An obtuse angle is valid; its opposite side must be longer."
for _args in [(0, 50, 70), (4, -10, 30), (4, 30, 0), (4, 100, 80), (4, 100, 90)]:
    try:
        survey(*_args)
    except ValueError:
        pass
    else:
        assert False, "Reject nonpositive inputs and angle sums of 180 degrees or more."
"SUCCESS: The baseline and its opposite angle set the scale for the whole triangle."
```
Hint: Validate the inputs first. Compute the third angle, divide c by its sine, then multiply that common scale by each known angle's sine.
:::

## 3. Two sides and their included angle give the law of cosines

Now suppose two rods have lengths 3 m and 4 m and meet at a 60° hinge. We need the distance between their free ends. Neither known rod has a known opposite angle, so the law of sines cannot start the calculation.

Place the hinge C at the origin and rod b along the horizontal axis. Its free end A is (b, 0). The other free end B is (a cos(C), a sin(C)). Subtract their horizontal coordinates and their vertical coordinates, square those differences, and add. This is the distance formula. Expanding the squares and using cos²(C) + sin²(C) = 1 yields the law of cosines.

::: math
\[ c^2=(b-a\cos C)^2+(a\sin C)^2=a^2+b^2-2ab\cos C \]
\[ c=\sqrt{3^2+4^2-2(3)(4)\cos60°}=\sqrt{13} \]
- $C$: the **included angle**, between the two known sides a and b.
- $c$: the distance across from that hinge. The square root converts squared metres back to metres.
In code: form the sum of squared lengths, subtract the cosine correction, then take `math.sqrt`.
:::

Predict before running: how does c change as the hinge opens from 60° to 90° to 120°? At 90° the cosine correction is zero, recovering Pythagoras.

```python
def opposite_side(a, b, C_deg):
    C = math.radians(C_deg)
    correction = 2 * a * b * math.cos(C)
    squared_distance = a * a + b * b - correction
    return math.sqrt(squared_distance)

for angle_deg in [60, 90, 120]:
    print(f"Hinge {angle_deg}°: endpoint separation {opposite_side(3, 4, angle_deg):.6f} m")
```

The distances are about 3.606 m, 5 m and 6.083 m. An acute hinge has positive cosine, reducing the squared distance below a² + b². An obtuse hinge has negative cosine, so subtracting the correction increases it. The intermediate variable names mirror those two operations and make a sign mistake easier to locate.

With all three sides known, rearrange to get cos(C) = (a² + b² - c²)/(2ab), then use `acos` and convert its result to degrees. First check that the largest side is smaller than the other two together. Clipping a wildly invalid cosine into [-1, 1] would hide an impossible triangle; clipping is only appropriate for a tiny rounding overshoot after validity checks.

::: challenge Find an angle from three sides [medium]
Write `opposite_angle(a, b, c)` returning the angle in degrees opposite c. Accept finite positive lengths forming a non-flat triangle. Raise `ValueError` otherwise. Check the triangle inequality before using the inverse cosine, and clip its argument to [-1, 1] for rounding.
```python starter
def opposite_angle(a, b, c):
    return 90.0
```
```python solution
def opposite_angle(a, b, c):
    small, middle, large = sorted([a, b, c])
    if small <= 0 or small + middle <= large:
        raise ValueError("Lengths must form a non-flat triangle")
    cosine = (a * a + b * b - c * c) / (2 * a * b)
    cosine = max(-1.0, min(1.0, cosine))
    return math.degrees(math.acos(cosine))
```
```python test
assert math.isclose(opposite_angle(3, 4, 5), 90, abs_tol=1e-10), "The angle opposite the 5 in a 3-4-5 triangle is right."
assert math.isclose(opposite_angle(2, 2, 2), 60, abs_tol=1e-10), "An equilateral triangle has 60-degree angles."
assert math.isclose(opposite_angle(3, 4, math.sqrt(37)), 120, abs_tol=1e-10), "Keep the sign of cosine so obtuse angles survive."
assert math.isclose(opposite_angle(30, 40, 50), opposite_angle(3, 4, 5)), "Scaling all lengths leaves the angle unchanged."
for _sides in [(1, 2, 3), (1, 2, 4), (0, 2, 2), (-1, 2, 2)]:
    try:
        opposite_angle(*_sides)
    except ValueError:
        pass
    else:
        assert False, "Reject impossible, flat, and nonpositive triangles before clipping the cosine."
"SUCCESS: Side lengths determine a unique triangle angle when the triangle is valid."
```
Hint: After validating sorted lengths, use the original a, b, c in the cosine formula. `acos` returns radians, so finish with `math.degrees`.
:::

## 4. The ambiguous case: two triangles can fit

Suppose angle A is 30°, side a is 7 m, and side b is 10 m. The law of sines gives sin(B) = 10 sin(30°)/7 = 5/7. `asin` gives about 45.58°, but 134.42° has exactly the same sine. Both choices leave a positive angle C. The measurements therefore describe two different triangles.

This is the **side-side-angle**, or SSA, case: the known angle is not between the two known sides. It is not the included-angle case of the previous section. The ambiguity belongs to the geometry, not to an inaccurate calculator.

::: math
\[ u=\frac{b\sin A}{a}, \qquad B_1=\arcsin u, \qquad B_2=180°-B_1 \]
- $u$: the required sine of B. If u is greater than one, no triangle exists.
- For each candidate B, compute C = 180° - A - B; keep it only if C is positive.
- When B is 90°, the two candidates coincide and represent one triangle.
In code: generate candidates, loop over them, reject invalid angle sums, and calculate c for each survivor.
:::

Predict before running: how many triangles survive for a = 4, 5, 7 and 12, while b = 10 and A = 30° stay fixed?

```python
def possible_triangles(a, b, A_deg):
    if a <= 0 or b <= 0 or not 0 < A_deg < 180:
        raise ValueError("Need positive sides and an interior angle")
    A = math.radians(A_deg)
    u = b * math.sin(A) / a
    if u > 1 + 1e-12:
        return []
    u = min(u, 1.0)
    first = math.degrees(math.asin(u))
    candidates = [first]
    if not math.isclose(first, 90.0, abs_tol=1e-10):
        candidates.append(180 - first)
    answers = []
    for B_deg in candidates:
        C_deg = 180 - A_deg - B_deg
        if C_deg > 1e-10:
            c = a * math.sin(math.radians(C_deg)) / math.sin(A)
            answers.append((B_deg, C_deg, c))
    return answers

for known_a in [4, 5, 7, 12]:
    answers = possible_triangles(known_a, 10, 30)
    print(f"a={known_a}: {len(answers)} triangle(s)")
    for B_deg, C_deg, c in answers:
        print(f"  B={B_deg:.3f}°, C={C_deg:.3f}°, c={c:.3f} m")
```

The counts are zero, one, two and one. `candidates` is a list of possible B angles. The `for` loop applies the same angle-sum check to each possibility; `append` retains only the valid ones. Returning a list makes ambiguity explicit instead of silently choosing whichever answer `asin` happens to return. The tiny tolerances handle arithmetic at the right-angle boundary; they are not a model of survey measurement uncertainty and are unsuitable for distinguishing almost-flat triangles at those scales.

## 5. A valid answer can still be poorly determined

An exact formula cannot recover information that the measurements barely contain. For a symmetric survey with A = B = 89°, the third angle is only 2°. The baseline is tiny compared with the target distance. Small angle changes then move the inferred target a long way.

::: math
\[ a=c\frac{\sin A}{\sin(180°-A-B)} \]
- As the third angle approaches zero, its sine approaches zero and the inferred distance becomes large.
- Compare the change in inferred distance with the original distance to measure sensitivity.
In code: perturb both measured angles by 0.1° and compare an ordinary survey with a nearly flat one.
:::

Predict before running: will the same 0.1° change matter more for 50°/70° or 89°/89°? This is a sensitivity experiment, not a probability model for the instrument.

```python
def distance_from_angles(c, A_deg, B_deg):
    C_deg = 180 - A_deg - B_deg
    return c * math.sin(math.radians(A_deg)) / math.sin(math.radians(C_deg))

for first, second in [(50.0, 70.0), (89.0, 89.0)]:
    original = distance_from_angles(40, first, second)
    changed = distance_from_angles(40, first + 0.1, second + 0.1)
    percent_change = 100 * (changed - original) / original
    print(f"Angles {first}°/{second}°: {original:.3f} -> {changed:.3f} m ({percent_change:+.2f}%)")
```

The nearly flat setup changes by about eleven percent. A better baseline or a different station location can improve the information; printing extra decimal places cannot. This is why a geometry model should include a sketch and an input-sensitivity check, not just a final number.

## Reference: choose the formula from what is known

1. Label each side opposite its corresponding angle. Use one length unit and convert degrees before trigonometric calls.
2. Two angles and a side: find the third angle, then use the law of sines. In code, divide the known side by the sine of its opposite angle to get the common scale.
3. Two sides and their included angle: use the law of cosines. In code, `math.sqrt(a*a + b*b - 2*a*b*math.cos(C))` expects C in radians.
4. Three sides: validate the triangle inequality, rearrange the cosine law, then call `acos` and convert to degrees.
5. Two sides and a non-included angle: test both inverse-sine candidates. Report every valid triangle or explain that there is none.
6. Check the angle sum, opposite-side ordering, units and sensitivity before interpreting the result.

For independent practice, use `possible_triangles(7, 10, 30)` and draw both triangles on paper. Decide what extra observation would distinguish them. Is the angle at B acute or obtuse? A single such observation resolves the ambiguity. The next notebook uses angles and lengths to describe circular paths and tangent lines.
