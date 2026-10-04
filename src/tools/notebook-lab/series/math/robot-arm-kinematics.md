# Robot arm kinematics

A pick-and-place arm on a packing line has to put its gripper on a part, pointing the right way, then carry it along a straight path without hitting anything. The Jacobian lesson met a two-link arm and solved its angles with Newton's method. Real arms add a wrist, and the wrist changes the problem: there are now more joints than the target needs, so the arm can reach the same point in endlessly many ways, and choosing among them becomes an optimisation. This lesson brings together several earlier ideas: matrices that move points, vectors and gradients, and the Jacobian, plus one new piece of geometry, the law of cosines. Together they make the arm reach.

This lesson covers:

- describing an arm as a chain of homogeneous transformation matrices;
- exact inverse kinematics for two links, from the law of cosines;
- a wrist that sets the gripper's direction, and redundancy: many ways to reach one point;
- reaching as optimisation: the Jacobian transpose and damped least squares;
- moving the tip in a straight line.

## A chain of frames

::: math
\[ T = R(\theta_1)\,S(l_1)\;R(\theta_2)\,S(l_2)\;R(\theta_3)\,S(l_3), \qquad R(\theta) = \begin{pmatrix} \cos\theta & -\sin\theta & 0 \\ \sin\theta & \cos\theta & 0 \\ 0 & 0 & 1 \end{pmatrix}, \quad S(l) = \begin{pmatrix} 1 & 0 & l \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{pmatrix} \]
- $R(\theta)$: turn by the joint angle; $S(l)$: slide along the link by its length $l$
- the last column of $T$ is the tip position; the gripper angle is $\varphi = \theta_1 + \theta_2 + \theta_3$
In code: `frames(angles, lengths)` multiplies `rot(a) @ slide(l)` link by link
:::

Picture a small coordinate frame riding on each link. Each joint turns the next frame relative to the previous one, and each link slides it along its own x axis. In the homogeneous coordinates of the transformations lesson both moves are 3 × 3 matrices, so the frame at the tip is the product of all of them, read from the base outwards. Multiplying the matrices one at a time also gives the position of every joint on the way, which is what a drawing of the arm needs.

The angles are relative: each one is measured from the direction of the previous link. So the direction of the last link, the gripper angle, is the sum of all the joint angles. The matrix product also produces this: the top-left 2 × 2 block of T is a rotation by the total angle.

Predict before running: the arm has links of 0.4, 0.3 and 0.15 m, with joint angles 30°, 45° and −60°. In which direction does the gripper point?

```python
import math
import numpy as np
import matplotlib.pyplot as plt

def rot(deg):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1.0]])

def slide(length):
    return np.array([[1, 0, length], [0, 1, 0], [0, 0, 1.0]])

def frames(angles, lengths):
    T = np.eye(3)
    points = [T[:2, 2].copy()]
    for a, l in zip(angles, lengths):
        T = T @ rot(a) @ slide(l)
        points.append(T[:2, 2].copy())
    return np.array(points), T

L = (0.4, 0.3, 0.15)
pose = (30, 45, -60)
pts, T = frames(pose, L)
print("base, joints and tip (m):\n", pts.round(4))
print("tip frame T:\n", T.round(4))
print("gripper angle from T:", round(math.degrees(math.atan2(T[1, 0], T[0, 0])), 6), "  sum of joint angles:", sum(pose))

fig, ax = plt.subplots(figsize=(5, 4))
ax.plot(pts[:, 0], pts[:, 1], "o-", lw=3)
ax.set_aspect("equal")
ax.grid(alpha=0.3)
ax.set_title("pose (30°, 45°, −60°)")
plt.show()
```

The gripper points at 15°, the sum 30 + 45 − 60, and the rotation block of T, with cos 15° ≈ 0.9659 and sin 15° ≈ 0.2588, says the same. The tip is at (0.5689, 0.5286). Industrial robots work exactly this way in 3D: each joint contributes a 4 × 4 matrix, and the controller multiplies them hundreds of times a second.

## Exact inverse kinematics for two links

::: math
\[ d^2 = x^2 + y^2 = l_1^2 + l_2^2 + 2 l_1 l_2 \cos\theta_2 \;\Longrightarrow\; \cos\theta_2 = \frac{x^2 + y^2 - l_1^2 - l_2^2}{2 l_1 l_2} \]
\[ \theta_1 = \operatorname{atan2}(y, x) - \operatorname{atan2}\big(l_2\sin\theta_2,\; l_1 + l_2\cos\theta_2\big) \]
- the law of cosines in the triangle formed by the base, the elbow and the tip: $c^2 = a^2 + b^2 - 2ab\cos C$
- the triangle's angle at the elbow is $180° - \theta_2$, and $\cos(180° - \theta_2) = -\cos\theta_2$, which turns the minus sign into the plus sign above
- $\theta_2 = \pm\arccos(\cdot)$: two mirror-image solutions; no solution when the right-hand side is outside $[-1, 1]$
In code: `ik2(x, y, l1, l2, elbow)` with `t2 = elbow * math.acos(c2)`
:::

Newton's method found joint angles by iteration. For two links there is an exact answer, because the base, the elbow and the tip form a triangle with known sides: l₁, l₂, and the distance d from the base to the target. The **law of cosines**, c² = a² + b² − 2ab cos C for a triangle with sides a, b, c and angle C opposite c, gives the elbow angle. It is Pythagoras with a correction for angles other than 90°. The shoulder angle is then the direction to the target, minus the angle the forearm adds at the elbow, which is the direction of the vector (l₁ + l₂ cos θ₂, l₂ sin θ₂).

The arccosine has two answers, ±θ₂, so there are two mirror-image ways to reach the point (the two Newton solutions of the Jacobian lesson). If |cos θ₂| would exceed 1, the target lies outside the ring of reachable points.

Predict before running: with links of 0.4 m and 0.3 m, which joint angles reach (0.5, 0.2)?

```python
def ik2(x, y, l1, l2, elbow=1):
    c2 = (x * x + y * y - l1 * l1 - l2 * l2) / (2 * l1 * l2)
    if abs(c2) > 1:
        raise ValueError("out of reach")
    t2 = elbow * math.acos(c2)
    t1 = math.atan2(y, x) - math.atan2(l2 * math.sin(t2), l1 + l2 * math.cos(t2))
    return math.degrees(t1), math.degrees(t2)

for elbow in (1, -1):
    a = ik2(0.5, 0.2, 0.4, 0.3, elbow)
    tip = frames(a, (0.4, 0.3))[0][-1]
    print(f"elbow {elbow:+d}: θ1 = {a[0]:7.3f}°, θ2 = {a[1]:7.3f}°, forward kinematics puts the tip at {tip.round(12)}")

try:
    ik2(0.8, 0.0, 0.4, 0.3)
except ValueError as err:
    print("(0.8, 0):", err)
```

The two solutions are (−11.517°, 80.406°) and (55.120°, −80.406°). Each puts the tip exactly on (0.5, 0.2): run the forward kinematics on the answer, and check it, as always. The point (0.8, 0) is beyond the 0.7 m reach, and the cosine test catches it before any arithmetic fails.

## A wrist, and many ways to reach

::: math
\[ \mathbf{w} = \mathbf{p} - l_3\,(\cos\varphi,\; \sin\varphi), \qquad (\theta_1, \theta_2) = \text{two-link IK of } \mathbf{w}, \qquad \theta_3 = \varphi - \theta_1 - \theta_2 \]
- $\mathbf{p}$: the target; $\varphi$: the required gripper direction; $\mathbf{w}$: where the wrist must be
- if $\varphi$ is free, every reachable $\varphi$ (and either elbow) gives a solution: the arm is **redundant**
In code: `pick(x, y, phi, lengths, elbow)`, then the choice with the least joint movement from `current`
:::

A gripper usually has to approach from a particular direction, straight down onto a conveyor for example. Fixing the gripper angle φ fixes where the wrist must be: one gripper length back from the target, along φ. The first two links reach the wrist by the exact formula, and the last joint makes up the difference, θ₃ = φ − θ₁ − θ₂.

If the gripper direction does not matter, the three joints have only two coordinates to satisfy, and every φ for which the wrist is within reach gives a valid pose, with either elbow. Having more joints than the task needs is called **redundancy**. It is useful, because the spare freedom can be used for something else. Here it is used to move as little as possible from the current pose. Joint changes are wrapped into (−180°, 180°], since turning a joint by 350° is the same as turning it by −10°.

Predict before running: from the pose (60°, −30°, −20°), which way of reaching (0.5, 0.1) moves the joints least, and is it the gripper-down pose?

```python
def pick(x, y, phi, lengths, elbow=1):
    l1, l2, l3 = lengths
    wx = x - l3 * math.cos(math.radians(phi))
    wy = y - l3 * math.sin(math.radians(phi))
    t1, t2 = ik2(wx, wy, l1, l2, elbow)
    return t1, t2, phi - t1 - t2

down = pick(0.5, 0.1, -90, L)
print("gripper pointing down:", np.round(down, 3), " tip", frames(down, L)[0][-1].round(10))

current = np.array([60.0, -30.0, -20.0])
options = []
for phi in range(-180, 180):
    for elbow in (1, -1):
        try:
            angles = np.array(pick(0.5, 0.1, phi, L, elbow))
        except ValueError:
            continue
        move = (angles - current + 180) % 360 - 180
        options.append((float(np.sum(move ** 2)), phi, elbow, current + move))
print(len(options), "of the 720 (φ, elbow) choices reach the target")
cost, phi_best, elbow_best, best = min(options, key=lambda o: o[0])
print(f"least movement: φ = {phi_best}°, elbow {elbow_best:+d}, angles {best.round(2)}, total change {math.sqrt(cost):.1f}°")

fig, ax = plt.subplots(figsize=(5, 4))
for _, phi, elbow, angles in options[::40]:
    p = frames(angles, L)[0]
    ax.plot(p[:, 0], p[:, 1], "-", color="grey", alpha=0.5)
p = frames(best, L)[0]
ax.plot(p[:, 0], p[:, 1], "o-", lw=3, label="least movement")
ax.plot(0.5, 0.1, "r*", markersize=14)
ax.set_aspect("equal")
ax.legend(fontsize=8)
plt.show()
```

All 720 combinations reach: the wrist circle of radius 0.15 m around (0.5, 0.1) lies entirely inside the two-link ring, which runs from 0.1 m to 0.7 m from the base. The gripper-down pose needs the last joint at about −160°. The pose that moves least points the gripper at −71° with the elbow bent the other way from the gripper-down pose (θ₂ negative), a total change of about 63.7° (the root of the sum of the squared joint changes). A real controller would add other costs: joint limits, distance from obstacles, distance from singular poses. Choosing among redundant solutions is an optimisation problem.

## Reaching as optimisation

::: math
\[ E(\boldsymbol{\theta}) = \tfrac{1}{2}\lVert \mathbf{t} - \mathbf{p}(\boldsymbol{\theta}) \rVert^2, \qquad \nabla E = -J^\mathsf{T}\mathbf{e}, \qquad \mathbf{e} = \mathbf{t} - \mathbf{p}(\boldsymbol{\theta}) \]
\[ \text{transpose: } \Delta\boldsymbol{\theta} = \eta\,J^\mathsf{T}\mathbf{e}, \qquad \text{damped least squares: } \Delta\boldsymbol{\theta} = J^\mathsf{T}\big(JJ^\mathsf{T} + \lambda^2 I\big)^{-1}\mathbf{e}, \qquad J_{:,j} = \begin{pmatrix} -(y_\text{tip} - y_j) \\ x_\text{tip} - x_j \end{pmatrix} \]
- $\mathbf{t}$: the target; $\mathbf{p}(\boldsymbol{\theta})$: the tip position for joint angles $\boldsymbol{\theta}$
- $J$: the 2 × 3 Jacobian per radian; column $j$ is the tip velocity when joint $j$ turns, perpendicular to the line from that joint to the tip
- $\eta$: a learning rate; $\lambda$: damping that keeps steps bounded near singular poses
In code: `jac(angles, lengths)` builds $J$ from the joint positions; `reach(target, angles, lengths, method)` iterates
:::

Formulas like the one above exist only for simple arms. A general method treats reaching as minimising the squared distance E between the tip and the target. Its gradient follows from the chain rule: ∇E = −Jᵀe, where e is the error vector. The Jacobian of a planar arm has a neat geometric form. Turning joint j moves the tip around a circle centred on that joint, so the tip's velocity is the vector from the joint to the tip, rotated by 90°.

Two update rules use it:

- **Jacobian transpose**: gradient descent on E, the walking-downhill lesson again. It is simple and never needs to solve anything, but it needs a learning rate, and too large a rate diverges.
- **Damped least squares**: the step that best reduces the error, Newton-like, plus a penalty λ² on large steps. With λ = 0 it is Newton's method with the pseudo-inverse (the step that uses the least joint motion when there are more joints than coordinates). Near a singular pose that undamped step explodes; the damping keeps it bounded.

Predict before running: from the pose (60°, −30°, −20°), how many steps does each method need to reach (0.5, 0.1)? And what happens with a target 1 m away, beyond the arm's 0.85 m reach?

```python
def jac(angles, lengths):
    pts = frames(angles, lengths)[0]
    tip = pts[-1]
    return np.array([[-(tip[1] - p[1]), tip[0] - p[0]] for p in pts[:-1]]).T

h = 1e-6
numeric = np.column_stack([(frames(np.add(pose, np.degrees(h) * np.eye(3)[j]), L)[0][-1]
                            - frames(np.subtract(pose, np.degrees(h) * np.eye(3)[j]), L)[0][-1]) / (2 * h) for j in range(3)])
print("largest difference from a numerical Jacobian:", np.abs(numeric - jac(pose, L)).max())

def reach(target, angles, lengths, method, steps=300, tol=1e-6, lam=0.05, rate=1.0):
    th = np.array(angles, dtype=float)
    for k in range(steps):
        e = np.asarray(target) - frames(th, lengths)[0][-1]
        if np.linalg.norm(e) < tol:
            return th, k, np.linalg.norm(e)
        J = jac(th, lengths)
        if method == "transpose":
            d = rate * J.T @ e
        else:
            d = J.T @ np.linalg.solve(J @ J.T + lam ** 2 * np.eye(2), e)
        th = th + np.degrees(d)
    return th, steps, np.linalg.norm(e)

for name, kw in [("transpose, rate 1", dict(method="transpose", rate=1.0)), ("transpose, rate 8", dict(method="transpose", rate=8.0)),
                 ("damped least squares", dict(method="dls"))]:
    th, k, err = reach((0.5, 0.1), current, L, **kw)
    print(f"{name:<22} {k:>3} steps, error {err:.1e} m, angles {th.round(2)}")

start_err = np.linalg.norm(np.array([1.0, 0.0]) - frames(current, L)[0][-1])
print(f"\ntarget (1, 0): starting error {start_err:.3f} m; the best possible is 1 − 0.85 = 0.15 m")
for lam in [0.0, 0.05, 0.2]:
    th, errs = current.copy(), []
    for _ in range(300):
        e = np.array([1.0, 0.0]) - frames(th, L)[0][-1]
        errs.append(np.linalg.norm(e))
        J = jac(th, L)
        th = th + np.degrees(J.T @ np.linalg.solve(J @ J.T + lam ** 2 * np.eye(2), e))
    late = np.array(errs[200:])
    print(f"λ = {lam}: over the last 100 of 300 steps the error ranges from {late.min():.3f} to {late.max():.3f} m")
print("λ = 0.2 on the reachable target:", reach((0.5, 0.1), current, L, "dls", lam=0.2)[1], "steps")
```

The analytic Jacobian matches the numerical one to about 10⁻¹⁰. Damped least squares reaches the target in 6 steps, against 139 for the transpose method at rate 1. At rate 8 the transpose method overshoots, and is still about 0.16 m from the target after 300 steps. Both converging methods end within about 9° per joint of (64°, −87°, −48°), the least-movement pose found by the search above. Starting from the current pose and taking small corrections naturally finds a nearby solution.

The unreachable target shows why the damping matters, and that its size is a trade-off. The best the arm can do is to stretch straight towards the target, 0.15 m short, but that straight pose is singular. Undamped (λ = 0), the steps explode near it and the arm thrashes: the error never settles. A little damping (λ = 0.05) keeps the steps bounded, but the arm still jitters around the stretched pose. With λ = 0.2 the steps are small enough near the singularity that the arm settles exactly on the best possible 0.15 m. The price is speed on ordinary targets: 10 steps instead of 6. Industrial controllers therefore adjust λ as they go, small far from singular poses and larger near them. A controller would rather get a steady "as close as possible" than wild motion.

## Moving in a straight line

::: math
\[ \boldsymbol{\theta}(s) = \boldsymbol{\theta}_A + s\,(\boldsymbol{\theta}_B - \boldsymbol{\theta}_A) \quad\text{versus}\quad \mathbf{p}(s) = \mathbf{a} + s\,(\mathbf{b} - \mathbf{a}), \quad 0 \le s \le 1 \]
- interpolating the joints moves the tip along a curve, because $\mathbf{p}(\boldsymbol{\theta})$ is non-linear
- straight-line motion solves IK at many points of the line, each starting from the previous solution
- distance of a point $\mathbf{q}$ from the line: $\dfrac{|(\mathbf{b} - \mathbf{a}) \times (\mathbf{q} - \mathbf{a})|}{\lVert \mathbf{b} - \mathbf{a} \rVert}$
In code: `thA + si * (thB - thA)` against `reach(A + si * (B - A), th, L, "dls")` with `th` carried forward
:::

There are two ways to move from one point to another. Moving each joint smoothly from its start angle to its end angle is simple, and robot controllers offer it as a "joint move". But the tip then follows whatever curve the kinematics produce, which can swing wide. For gluing, welding or sliding a part into a slot, the tip must follow a straight line (a "linear move"). That means solving inverse kinematics at closely spaced points along the line, starting each solve from the previous answer (a **warm start**), so that consecutive poses stay close together.

The 2D cross product (b − a) × (q − a) = (b − a)ₓ(q − a)ᵧ − (b − a)ᵧ(q − a)ₓ measures how far the point q lies to the side of the line.

Predict before running: moving the tip from (0.6, −0.1) to (0.2, 0.5), how far does a joint move stray from the straight line?

```python
A, B = np.array([0.6, -0.1]), np.array([0.2, 0.5])
thA = reach(A, current, L, "dls")[0]
thB = reach(B, thA, L, "dls")[0]

def off_line(q):
    q = np.atleast_2d(q) - A
    d = B - A
    return np.abs(d[0] * q[:, 1] - d[1] * q[:, 0]) / np.linalg.norm(d)

s = np.linspace(0, 1, 101)
joint_move = np.array([frames(thA + si * (thB - thA), L)[0][-1] for si in s])

th = thA.copy()
line_tips, biggest_step = [], 0.0
for si in s:
    new = reach(A + si * (B - A), th, L, "dls")[0]
    biggest_step = max(biggest_step, np.abs(new - th).max())
    th = new
    line_tips.append(frames(th, L)[0][-1])
line_tips = np.array(line_tips)

print(f"joint move: tip strays up to {off_line(joint_move).max() * 1000:.0f} mm from the line")
print(f"linear move: tip within {off_line(line_tips).max() * 1000:.4f} mm; largest joint change between neighbouring points {biggest_step:.2f}°")
print("final angles, joint move:", thB.round(2), "  linear move:", th.round(2))

fig, ax = plt.subplots(figsize=(5, 4))
ax.plot(joint_move[:, 0], joint_move[:, 1], label="joint move")
ax.plot(line_tips[:, 0], line_tips[:, 1], "--", label="linear move")
for angles in [thA, thB]:
    p = frames(angles, L)[0]
    ax.plot(p[:, 0], p[:, 1], "o-", color="grey", alpha=0.6)
ax.set_aspect("equal")
ax.legend(fontsize=8)
plt.show()
```

The joint move swings the tip about 129 mm away from the straight line: enough to hit a fixture. The linear move stays within a thousandth of a millimetre, and no joint changes by more than about 1.1° between neighbouring points, so the motion is smooth. The two moves even end in slightly different poses, about 12° apart at the wrist. The arm is redundant, and the path taken decides which of the many end poses it arrives in. Planning a real path adds speed limits for each joint and checks for collisions, but at its core is this loop: interpolate in the space where the task is defined, and solve the kinematics at every step.

::: challenge Joint positions and gripper angle [easy]
Write `joint_positions(angles_deg, lengths)` for a planar arm whose joint angles (in **degrees**) are each measured from the previous link: return a NumPy array of shape (n + 1, 2) holding the base (0, 0), then each joint, then the tip. Raise `ValueError` if the two lists have different lengths or any link length is not positive. Then write `gripper_angle(angles_deg)`: the direction of the last link, the sum of the angles, normalised to (−180, 180] and returned as a plain float.

```python starter
import math
import numpy as np

def joint_positions(angles_deg, lengths):
    return np.zeros((len(lengths) + 1, 2))

def gripper_angle(angles_deg):
    return 0.0

print(joint_positions([30, 45, -60], [0.4, 0.3, 0.15]))
```

```python solution
import math
import numpy as np

def joint_positions(angles_deg, lengths):
    if len(angles_deg) != len(lengths):
        raise ValueError("one angle per link")
    if any(l <= 0 for l in lengths):
        raise ValueError("link lengths must be positive")
    points = [np.zeros(2)]
    heading = 0.0
    for a, l in zip(angles_deg, lengths):
        heading += math.radians(a)
        points.append(points[-1] + l * np.array([math.cos(heading), math.sin(heading)]))
    return np.array(points)

def gripper_angle(angles_deg):
    a = sum(angles_deg) % 360
    return float(a - 360 if a > 180 else a)

print(joint_positions([30, 45, -60], [0.4, 0.3, 0.15]))
```

```python test
for _n in ["joint_positions", "gripper_angle"]:
    assert _n in dir(), f"Define {_n}."
_p = np.asarray(joint_positions([30, 45, -60], [0.4, 0.3, 0.15]))
assert _p.shape == (4, 2), f"Base, two joints and the tip give shape (4, 2); got {_p.shape}."
assert np.allclose(_p, [[0, 0], [0.34641, 0.2], [0.42406, 0.48978], [0.56895, 0.52860]], atol=1e-5), f"Positions for (30, 45, -60): got {_p.round(5)}."
assert np.allclose(joint_positions([90, 90], [1, 1]), [[0, 0], [0, 1], [-1, 1]], atol=1e-12), "Angles are relative to the previous link."
assert np.allclose(joint_positions([0], [2.5]), [[0, 0], [2.5, 0]]), "A single link."
for _bad in [([10, 20], [1.0]), ([10], [0.0]), ([10, 20], [1.0, -1.0])]:
    try:
        joint_positions(*_bad)
        assert False, f"joint_positions{_bad} should raise ValueError."
    except ValueError:
        pass
assert gripper_angle([30, 45, -60]) == 15.0, "The sum of the angles."
assert gripper_angle([170, 20]) == -170.0 and gripper_angle([90, 90]) == 180.0 and gripper_angle([-90, -90]) == 180.0, "Normalise to (-180, 180]."
assert gripper_angle([0]) == 0.0 and type(gripper_angle([10, 20])) is float, "A plain float."
"SUCCESS: Relative angles add up along the chain, so each joint is the last one plus a link in the accumulated direction."
```

Hint: Keep a running heading: add each angle to it, then step one link length in that direction (cos, sin of the heading) from the previous point. For the gripper angle, take the sum modulo 360 and subtract 360 if the result is above 180.
:::

::: challenge Exact inverse kinematics [medium]
Write `two_link_ik(x, y, l1, l2, bend=1)` returning the joint angles `(theta1, theta2)` in degrees that put the tip of a two-link arm at (x, y), using the law of cosines: θ₂ has the sign of `bend` (+1 or −1). If the computed cos θ₂ is outside [−1, 1] by no more than 1e-9, clamp it (the target is on the edge of reach); if it is further outside, raise `ValueError`. Also raise `ValueError` if `bend` is not 1 or −1. Then write `pick_pose(x, y, phi_deg, lengths, bend=1)` for a three-link arm (`lengths` = (l1, l2, l3)) whose gripper must point at angle `phi_deg`: return `(theta1, theta2, theta3)`. In both functions return plain floats, each normalised to (−180, 180].

```python starter
import math

def two_link_ik(x, y, l1, l2, bend=1):
    return (0.0, 0.0)

def pick_pose(x, y, phi_deg, lengths, bend=1):
    return (0.0, 0.0, 0.0)

print(two_link_ik(0.5, 0.2, 0.4, 0.3))
```

```python solution
import math

def _wrap(a):
    a = a % 360
    return float(a - 360 if a > 180 else a)

def two_link_ik(x, y, l1, l2, bend=1):
    if bend not in (1, -1):
        raise ValueError("bend must be 1 or -1")
    c2 = (x * x + y * y - l1 * l1 - l2 * l2) / (2 * l1 * l2)
    if abs(c2) > 1 + 1e-9:
        raise ValueError("target out of reach")
    c2 = max(-1.0, min(1.0, c2))
    t2 = bend * math.acos(c2)
    t1 = math.atan2(y, x) - math.atan2(l2 * math.sin(t2), l1 + l2 * math.cos(t2))
    return _wrap(math.degrees(t1)), _wrap(math.degrees(t2))

def pick_pose(x, y, phi_deg, lengths, bend=1):
    l1, l2, l3 = lengths
    wx = x - l3 * math.cos(math.radians(phi_deg))
    wy = y - l3 * math.sin(math.radians(phi_deg))
    t1, t2 = two_link_ik(wx, wy, l1, l2, bend)
    return t1, t2, _wrap(phi_deg - t1 - t2)

print(two_link_ik(0.5, 0.2, 0.4, 0.3))
```

```python test
import math
for _n in ["two_link_ik", "pick_pose"]:
    assert _n in dir(), f"Define {_n}."
def _tip(_angles, _lengths):
    _h, _x, _y = 0.0, 0.0, 0.0
    for _a, _l in zip(_angles, _lengths):
        _h += math.radians(_a)
        _x, _y = _x + _l * math.cos(_h), _y + _l * math.sin(_h)
    return _x, _y
_s = two_link_ik(0.5, 0.2, 0.4, 0.3)
assert len(_s) == 2 and all(type(_v) is float for _v in _s), "Return a tuple of two plain floats."
assert abs(_s[0] - -11.5169) < 1e-3 and abs(_s[1] - 80.4059) < 1e-3, f"bend=+1 at (0.5, 0.2): expected about (-11.517, 80.406), got {_s}."
_m = two_link_ik(0.5, 0.2, 0.4, 0.3, bend=-1)
assert _m[1] < 0 and math.dist(_tip(_m, (0.4, 0.3)), (0.5, 0.2)) < 1e-12, f"bend=-1 gives the mirror solution; got {_m}."
for _t in [(0.1, 0.65), (-0.3, -0.2), (0.0, 0.25), (-0.6, 0.05)]:
    for _b in (1, -1):
        _a = two_link_ik(*_t, 0.4, 0.3, bend=_b)
        assert math.dist(_tip(_a, (0.4, 0.3)), _t) < 1e-12, f"two_link_ik{_t} bend {_b}: the tip misses."
        assert all(-180 < _v <= 180 for _v in _a), f"Normalise to (-180, 180]; got {_a}."
_e = two_link_ik(0.7, 0.0, 0.4, 0.3)
assert abs(_e[0]) < 1e-4 and abs(_e[1]) < 1e-4, f"At full reach the arm is straight; got {_e}."
assert math.dist(_tip(two_link_ik(0.1, 0.0, 0.4, 0.3), (0.4, 0.3)), (0.1, 0.0)) < 1e-9, "Fully folded, at the inner edge of reach."
for _bad in [dict(x=0.8, y=0.0), dict(x=0.05, y=0.0), dict(x=0.5, y=0.2, bend=0)]:
    try:
        two_link_ik(l1=0.4, l2=0.3, **_bad)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
_L = (0.4, 0.3, 0.15)
for _phi, _b in [(-90, 1), (-90, -1), (0, 1), (135, -1), (180, 1)]:
    _p = pick_pose(0.5, 0.1, _phi, _L, _b)
    assert len(_p) == 3 and all(type(_v) is float and -180 < _v <= 180 for _v in _p), f"Three plain floats in (-180, 180]; got {_p}."
    assert math.dist(_tip(_p, _L), (0.5, 0.1)) < 1e-12, f"pick_pose with φ = {_phi}: the tip misses."
    _g = sum(_p) % 360
    assert min(abs(_g - _phi % 360), 360 - abs(_g - _phi % 360)) < 1e-9, f"The gripper must point at {_phi}°."
assert abs(pick_pose(0.5, 0.1, -90, _L)[2] - -160.263) < 1e-3, "The gripper-down pose from the lesson."
try:
    pick_pose(0.95, 0.0, 0, _L)
    assert False, "A wrist out of reach should raise ValueError."
except ValueError:
    pass
"SUCCESS: The law of cosines gives the elbow, atan2 the shoulder, and a fixed gripper direction moves the problem back to the wrist."
```

Hint: cos θ₂ = (x² + y² − l₁² − l₂²)/(2 l₁ l₂); θ₂ = bend × acos of that; θ₁ = atan2(y, x) − atan2(l₂ sin θ₂, l₁ + l₂ cos θ₂). For the wrist, step back l₃ from the target along φ, solve the two-link problem there, and set θ₃ = φ − θ₁ − θ₂. Wrap every angle into (−180, 180]: take it `% 360`, then subtract 360 if the result is above 180.
:::

::: challenge Damped least squares and straight lines [hard]
Write `dls_reach(target, angles_deg, lengths, damping=0.05, tol=1e-6, max_iter=300)` for a planar arm with any number of links: starting from `angles_deg`, repeat the damped least-squares step Δθ = Jᵀ(JJᵀ + λ²I)⁻¹e (θ in radians, J the 2 × n Jacobian per radian, e = target − tip) until |e| < `tol` or `max_iter` steps have been taken. Return `(angles, error)`: the final angles in degrees as a tuple of plain floats (not normalised) and the final distance |e| as a plain float. Raise `ValueError` if the number of angles and lengths differ or `damping` is negative.

Then write `linear_move(angles_deg, a, b, lengths, n=20)`: first reach point `a` from `angles_deg`, then reach the n points a + (k/n)(b − a) for k = 1, ..., n in turn, starting each solve from the previous solution. Return a NumPy array of shape (n + 1, number of joints) with the joint angles at a and at each point. Raise `RuntimeError` if any solve ends with an error of `tol` or more (use the default tolerance).

```python starter
import math
import numpy as np

def dls_reach(target, angles_deg, lengths, damping=0.05, tol=1e-6, max_iter=300):
    return tuple(float(a) for a in angles_deg), 1.0

def linear_move(angles_deg, a, b, lengths, n=20):
    return np.zeros((n + 1, len(lengths)))

print(dls_reach((0.5, 0.1), (60, -30, -20), (0.4, 0.3, 0.15)))
```

```python solution
import math
import numpy as np

def _points(th, lengths):
    pts, h, p = [np.zeros(2)], 0.0, np.zeros(2)
    for a, l in zip(th, lengths):
        h += a
        p = p + l * np.array([math.cos(h), math.sin(h)])
        pts.append(p)
    return np.array(pts)

def dls_reach(target, angles_deg, lengths, damping=0.05, tol=1e-6, max_iter=300):
    if len(angles_deg) != len(lengths):
        raise ValueError("one angle per link")
    if damping < 0:
        raise ValueError("damping must not be negative")
    th = np.radians(np.array(angles_deg, dtype=float))
    target = np.asarray(target, dtype=float)
    for _ in range(max_iter + 1):
        pts = _points(th, lengths)
        e = target - pts[-1]
        err = float(np.linalg.norm(e))
        if err < tol:
            break
        if _ == max_iter:
            break
        r = pts[-1] - pts[:-1]
        J = np.vstack([-r[:, 1], r[:, 0]])
        th = th + J.T @ np.linalg.solve(J @ J.T + damping ** 2 * np.eye(2), e)
    return tuple(float(a) for a in np.degrees(th)), err

def linear_move(angles_deg, a, b, lengths, n=20):
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    poses = []
    th = angles_deg
    for k in range(n + 1):
        th, err = dls_reach(a + k / n * (b - a), th, lengths)
        if err >= 1e-6:
            raise RuntimeError(f"could not reach point {k}")
        poses.append(th)
    return np.array(poses)

print(dls_reach((0.5, 0.1), (60, -30, -20), (0.4, 0.3, 0.15)))
```

```python test
import math
import numpy as np
for _n in ["dls_reach", "linear_move"]:
    assert _n in dir(), f"Define {_n}."
def _tip(_angles, _lengths):
    _h, _x, _y = 0.0, 0.0, 0.0
    for _a, _l in zip(_angles, _lengths):
        _h += math.radians(_a)
        _x, _y = _x + _l * math.cos(_h), _y + _l * math.sin(_h)
    return _x, _y
_L = (0.4, 0.3, 0.15)
_a, _e = dls_reach((0.5, 0.1), (60, -30, -20), _L)
assert isinstance(_a, tuple) and len(_a) == 3 and all(type(_v) is float for _v in _a) and type(_e) is float, "Return (tuple of plain floats, plain float)."
assert _e < 1e-6 and math.dist(_tip(_a, _L), (0.5, 0.1)) < 1e-6, f"Reach (0.5, 0.1): error {_e}, tip {_tip(_a, _L)}."
assert abs(_e - math.dist(_tip(_a, _L), (0.5, 0.1))) < 1e-9, "The returned error is the distance from the final tip to the target."
assert all(abs(_x - _y) < 15 for _x, _y in zip(_a, (64.0, -87.0, -48.0))), f"From (60, -30, -20) the damped steps settle near (64, -87, -48); got {np.round(_a, 1)}."
for _lens, _start, _t in [((0.4, 0.3), (45, 45), (0.2, 0.5)), ((0.3, 0.3, 0.2, 0.1), (10, 20, 30, 40), (-0.3, 0.6)), ((1.0,), (0,), (0.0, 1.0))]:
    _q, _r = dls_reach(_t, _start, _lens)
    assert len(_q) == len(_lens) and _r < 1e-6 and math.dist(_tip(_q, _lens), _t) < 1e-6, f"{len(_lens)} links to {_t}: error {_r}."
_q, _r = dls_reach((0.5, 0.1), (60, -30, -20), _L, damping=0.0)
assert _r < 1e-6, "damping=0 is allowed (plain least squares) when the pose is not singular."
_q, _r = dls_reach((1.0, 0.0), (60, -30, -20), _L, damping=0.2, max_iter=300)
assert all(math.isfinite(_v) for _v in _q) and 0.15 - 1e-9 <= _r < 0.151 and abs(_r - math.dist(_tip(_q, _L), (1.0, 0.0))) < 1e-9, f"Out of reach with damping 0.2: stretch straight at it, 0.15 m short; error {_r}."
_q1, _r1 = dls_reach((0.5, 0.1), (60, -30, -20), _L, max_iter=1)
assert _r1 > 1e-6 and _r1 < math.dist(_tip((60, -30, -20), _L), (0.5, 0.1)), "max_iter limits the number of steps."
for _bad in [dict(target=(0.5, 0.1), angles_deg=(10, 20), lengths=_L), dict(target=(0.5, 0.1), angles_deg=(60, -30, -20), lengths=_L, damping=-0.1)]:
    try:
        dls_reach(**_bad)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
_A, _B = np.array([0.6, -0.1]), np.array([0.2, 0.5])
_m = np.asarray(linear_move((60, -30, -20), _A, _B, _L, n=20))
assert _m.shape == (21, 3), f"Shape (n + 1, joints) = (21, 3); got {_m.shape}."
_d = _B - _A
for _k, _row in enumerate(_m):
    _p = np.array(_tip(_row, _L))
    assert np.linalg.norm(_p - (_A + _k / 20 * _d)) < 1e-5, f"Row {_k} must put the tip at a + {_k}/20 (b - a)."
assert np.abs(np.diff(_m, axis=0)).max() < 15, "Warm starts keep neighbouring poses close together."
for _k in range(1, 21):
    _ref = dls_reach(_A + _k / 20 * _d, tuple(_m[_k - 1]), _L)[0]
    assert np.allclose(_m[_k], _ref, atol=1e-9), "Start each solve from the previous row's angles (warm start)."
try:
    linear_move((60, -30, -20), _A, (1.2, 0.0), _L, n=5)
    assert False, "A line leaving the workspace should raise RuntimeError."
except RuntimeError:
    pass
"SUCCESS: Damped least squares reaches any arm's target with bounded steps, and warm-started solves along a line give a straight, smooth motion."
```

Hint: Column j of the Jacobian is the vector from joint j to the tip turned by 90°: (−(y_tip − y_j), x_tip − x_j). Keep the angles in radians inside the loop and convert at the end. For `linear_move`, feed each solve's angles into the next one and check the error it returns.
:::

## What you learned

- An arm is a chain of homogeneous transformations, one rotation and one slide per link. Their product gives the tip position, and the gripper angle is the sum of the joint angles.
- For two links, the law of cosines gives the elbow angle exactly, with two mirror solutions, and atan2 gives the shoulder. Fixing the gripper direction reduces a three-link arm to this problem at the wrist.
- With more joints than the task needs, the arm is redundant. The spare freedom can be spent on a goal such as moving the joints as little as possible.
- Reaching is minimising ½|e|². The Jacobian transpose is gradient descent; damped least squares, Δθ = Jᵀ(JJᵀ + λ²I)⁻¹e, converges in a few steps and stays bounded near singular poses and unreachable targets.
- Interpolating joint angles moves the tip along a curve. A straight-line move solves the kinematics at points along the line, warm-starting each solve from the last.

The next lesson moves from a mechanism to a material: heat spreading along a bar, the first partial differential equation of the series.
