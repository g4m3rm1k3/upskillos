# The Jacobian: how outputs follow inputs

A robot arm with two joints turns two angles into a position: the shoulder angle and the elbow angle decide where the gripper is. Nudge one joint by a tenth of a degree and the gripper moves; by how much, and in which direction, depends on the pose. Many engineering systems map several inputs to several outputs like this. The gradient described how one output responds to many inputs; the **Jacobian matrix** does the same for many outputs at once, row by row. It answers the practical questions about a robot arm: how far the tip moves for a small joint error, in which poses the arm loses the ability to move in some direction, and, running the relationship backwards with Newton's method, which joint angles reach a target. This lesson builds all three.

This lesson covers:

- vector-valued functions, and a two-link arm's forward kinematics;
- the Jacobian matrix of partial derivatives, analytic and numerical;
- linearisation: small input changes map to output changes through J;
- singular poses, where det J = 0;
- solving for inputs with Newton's method: inverse kinematics.

## A two-link arm

::: math
\[ x = l_1\cos\theta_1 + l_2\cos(\theta_1 + \theta_2), \qquad y = l_1\sin\theta_1 + l_2\sin(\theta_1 + \theta_2) \]
- $\theta_1$: shoulder angle from the $x$ axis; $\theta_2$: elbow angle relative to the upper link
- workspace: the ring $|l_1 - l_2| \le r \le l_1 + l_2$
In code: `forward(t1, t2)` returns the array `[x, y]`
:::


A planar arm has an upper link of length l₁ from the shoulder at the origin, and a forearm of length l₂. The shoulder angle θ₁ is measured from the x axis; the elbow angle θ₂ is measured from the direction of the upper link. Adding the link vectors gives the gripper position, the **forward kinematics**:

\[ x = l_1\cos\theta_1 + l_2\cos(\theta_1 + \theta_2), \qquad y = l_1\sin\theta_1 + l_2\sin(\theta_1 + \theta_2) \]

This is a function from two inputs to two outputs, a **vector-valued** function. The set of all reachable positions is the arm's **workspace**: a ring between radii |l₁ − l₂| and l₁ + l₂. Predict before running: with l₁ = 0.4 m and l₂ = 0.3 m, where is the gripper at θ₁ = 30°, θ₂ = 60°?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

L1, L2 = 0.4, 0.3

def forward(t1, t2, l1=L1, l2=L2):
    return np.array([l1 * np.cos(t1) + l2 * np.cos(t1 + t2), l1 * np.sin(t1) + l2 * np.sin(t1 + t2)])

t1, t2 = math.radians(30), math.radians(60)
elbow = np.array([L1 * math.cos(t1), L1 * math.sin(t1)])
tip = forward(t1, t2)
print(f"elbow at ({elbow[0]:.4f}, {elbow[1]:.4f}) m, gripper at ({tip[0]:.4f}, {tip[1]:.4f}) m, reach {np.linalg.norm(tip):.4f} m")

fig, ax = plt.subplots(figsize=(5, 5))
angles = np.radians(np.arange(0, 360, 3))
A1, A2 = np.meshgrid(angles, angles)
pts = forward(A1, A2)
ax.plot(pts[0].ravel(), pts[1].ravel(), ".", markersize=1, color="lightgrey")
ax.plot([0, elbow[0], tip[0]], [0, elbow[1], tip[1]], "o-", linewidth=3)
ax.set_aspect("equal")
ax.set_title("workspace and one pose")
plt.show()
```

```output
elbow at (0.3464, 0.2000) m, gripper at (0.3464, 0.5000) m, reach 0.6083 m
```

Evaluating `forward` on a grid of both angles fills in the workspace: every reachable point appears as a grey dot.

The gripper is at (0.3464, 0.5000) m, 0.6083 m from the shoulder. With the elbow bent at 60°, the reach is less than the full 0.7 m. The grey ring shows the workspace: nothing closer than 0.1 m or farther than 0.7 m can be reached.

## The Jacobian matrix

::: math
\[ J = \begin{pmatrix} \dfrac{\partial x}{\partial\theta_1} & \dfrac{\partial x}{\partial\theta_2} \\[2mm] \dfrac{\partial y}{\partial\theta_1} & \dfrac{\partial y}{\partial\theta_2} \end{pmatrix}, \qquad \text{column } j \approx \frac{\mathbf{f}(\boldsymbol{\theta} + h\mathbf{e}_j) - \mathbf{f}(\boldsymbol{\theta} - h\mathbf{e}_j)}{2h} \]
- row $i$: the gradient of output $i$; column $j$: how every output responds to input $j$
- the length of column $j$ is the tip speed per radian of joint $j$
In code: `jacobian(t1, t2)` against `numerical_jacobian(f, inputs)`
:::


For a function from n inputs to m outputs, the **Jacobian** J is the m × n matrix of all partial derivatives: row i holds the gradient of output i, column j holds the effect of input j on every output.

\[ J = \begin{pmatrix} \partial x/\partial\theta_1 & \partial x/\partial\theta_2 \\ \partial y/\partial\theta_1 & \partial y/\partial\theta_2 \end{pmatrix} = \begin{pmatrix} -l_1\sin\theta_1 - l_2\sin(\theta_1+\theta_2) & -l_2\sin(\theta_1+\theta_2) \\ l_1\cos\theta_1 + l_2\cos(\theta_1+\theta_2) & l_2\cos(\theta_1+\theta_2) \end{pmatrix} \]

Each column is a velocity: the second column, for example, is how the tip moves per radian of elbow rotation. Numerically, nudge one input at a time and take central differences of the whole output vector: that gives one column per input. Predict before running: does the numerical Jacobian match the formula, and which joint moves the tip more per degree in this pose?

```python type
def jacobian(t1, t2, l1=L1, l2=L2):
    s1, c1 = math.sin(t1), math.cos(t1)
    s12, c12 = math.sin(t1 + t2), math.cos(t1 + t2)
    return np.array([[-l1 * s1 - l2 * s12, -l2 * s12],
                     [l1 * c1 + l2 * c12, l2 * c12]])

def numerical_jacobian(f, inputs, h=1e-6):
    inputs = np.asarray(inputs, dtype=float)
    cols = []
    for j in range(len(inputs)):
        step = np.zeros_like(inputs)
        step[j] = h
        cols.append((f(*(inputs + step)) - f(*(inputs - step))) / (2 * h))
    return np.column_stack(cols)

J = jacobian(t1, t2)
print("analytic J:\n", J.round(6))
print("numerical J:\n", numerical_jacobian(forward, [t1, t2]).round(6))
per_degree = np.linalg.norm(J, axis=0) * math.pi / 180
print(f"tip movement per degree: shoulder {per_degree[0] * 1000:.2f} mm, elbow {per_degree[1] * 1000:.2f} mm")
```

```output
analytic J:
 [[-0.5     -0.3    ]
 [ 0.34641  0.     ]]
numerical J:
 [[-0.5     -0.3    ]
 [ 0.34641  0.     ]]
tip movement per degree: shoulder 10.62 mm, elbow 5.24 mm
```

`np.linalg.norm(J, axis=0)` takes the length of each column: the speed of the tip per radian of that joint.

The two Jacobians agree. One degree at the shoulder moves the tip 10.6 mm, while one degree at the elbow moves it 5.2 mm: the shoulder swings the whole arm, a lever 0.61 m long, while the elbow swings only the 0.3 m forearm. That is why shoulder joints of real robots need the most precise encoders.

## Linearisation and joint errors

::: math
\[ \Delta\mathbf{p} \approx J\,\Delta\boldsymbol{\theta}, \qquad \sigma_x = \sigma\sqrt{J_{11}^2 + J_{12}^2}, \quad \sigma_y = \sigma\sqrt{J_{21}^2 + J_{22}^2} \]
- $\sigma$: each joint's independent angle error, in radians
- the linear prediction is checked by simulating many random joint errors
In code: `sigma * np.sqrt((J ** 2).sum(axis=1))`
:::


Near a pose, the Jacobian is the best linear approximation of the map: a small change in the inputs Δθ produces an output change

\[ \Delta\mathbf{p} \approx J\,\Delta\boldsymbol{\theta} \]

the multi-output version of the tangent line. It turns joint errors into tip errors. If each joint's encoder has an independent error with standard deviation σ, the tip error in x has variance σ²(J₁₁² + J₁₂²), and similarly for y, the uncertainty propagation of the previous lesson applied row by row. Predict before running: with 0.05° encoders, how big is the tip error, and does the linear prediction match a simulation?

```python type
sigma = math.radians(0.05)
pred_sd = sigma * np.sqrt((J ** 2).sum(axis=1))
rng = np.random.default_rng(34)
errs = rng.normal(0, sigma, size=(100_000, 2))
tips = forward(t1 + errs[:, 0], t2 + errs[:, 1]).T - tip
print(f"predicted tip sd: x {pred_sd[0] * 1000:.3f} mm, y {pred_sd[1] * 1000:.3f} mm")
print(f"simulated tip sd: x {tips[:, 0].std() * 1000:.3f} mm, y {tips[:, 1].std() * 1000:.3f} mm")
small = np.radians([0.1, -0.2])
print("J Δθ:", (J @ small * 1000).round(4), "mm   true change:", ((forward(t1 + small[0], t2 + small[1]) - tip) * 1000).round(4), "mm")
```

```output
predicted tip sd: x 0.509 mm, y 0.302 mm
simulated tip sd: x 0.509 mm, y 0.302 mm
J Δθ: [0.1745 0.6046] mm   true change: [0.174  0.6038] mm
```

`(J ** 2).sum(axis=1)` adds the squared entries of each row: the sum over the inputs that contribute to that output.

The linear prediction (about 0.51 mm in x and 0.30 mm in y) matches the simulation to the third decimal, and J Δθ predicts a small joint move almost exactly. For joint errors this small the linear model is excellent; the tip error depends on the pose, through J, which is why robot accuracy is quoted at specific positions.

## Singular poses

::: math
\[ \det J = l_1 l_2 \sin\theta_2, \qquad J\,\dot{\boldsymbol{\theta}} = \dot{\mathbf{p}} \;\Longrightarrow\; \dot{\boldsymbol{\theta}} = J^{-1}\dot{\mathbf{p}} \]
- $\det J = 0$ at $\theta_2 = 0$ or $180°$: the arm is singular
- near a singular pose the joint speeds $\dot{\boldsymbol{\theta}}$ needed for a modest tip speed grow huge
In code: `np.linalg.solve(Jp, outward)` for elbow angles approaching 0
:::


The determinant of J measures how a small square of joint changes maps to an area of tip movement, the area-scale factor of the transformations lesson. Here det J = l₁l₂ sin θ₂. When the elbow is straight (θ₂ = 0) or folded back (θ₂ = 180°), det J = 0 and J is **singular**: its columns are parallel, so both joints move the tip in the same direction, and no combination of joint speeds can move it along the arm. At the edge of the workspace, the arm cannot move outwards, which makes sense: it is already fully stretched. Near such poses, moving the tip slowly in the weak direction would need huge joint speeds. Predict before running: as the elbow straightens, what happens to the joint speeds needed to move the tip outward at 10 mm/s?

```python type
for deg in [90, 30, 10, 2, 0.5]:
    th2 = math.radians(deg)
    Jp = jacobian(t1, th2)
    tip_p = forward(t1, th2)
    outward = tip_p / np.linalg.norm(tip_p) * 0.010
    speeds = np.linalg.solve(Jp, outward)
    print(f"elbow {deg:>4}°: det J = {np.linalg.det(Jp):.5f}, joint speeds {np.degrees(np.abs(speeds)).round(2)} °/s")
```

```output
elbow   90°: det J = 0.12000, joint speeds [0.86 2.39] °/s
elbow   30°: det J = 0.06000, joint speeds [2.74 6.46] °/s
elbow   10°: det J = 0.02084, joint speeds [ 8.21 19.18] °/s
elbow    2°: det J = 0.00419, joint speeds [41.04 95.75] °/s
elbow  0.5°: det J = 0.00105, joint speeds [164.14 383.  ] °/s
```

`np.linalg.solve(Jp, outward)` finds the joint speeds whose tip velocity, J times them, equals the wanted outward velocity.

As the elbow straightens, det J shrinks with sin θ₂ and the joint speeds needed for a modest 10 mm/s outward motion explode, from a couple of degrees per second at 90° to hundreds of degrees per second at 0.5°. Robot controllers watch for this and avoid singular poses, or slow down near them.

## Running it backwards: inverse kinematics

::: math
\[ J(\boldsymbol{\theta}_k)\,\Delta\boldsymbol{\theta} = \mathbf{p}_\text{target} - \mathbf{f}(\boldsymbol{\theta}_k), \qquad \boldsymbol{\theta}_{k+1} = \boldsymbol{\theta}_k + \Delta\boldsymbol{\theta} \]
- Newton's method: linearise, solve the linear system, repeat
- near a solution the number of correct digits roughly doubles each step
In code: `error = target - forward(*theta)`, then `theta = theta + np.linalg.solve(jacobian(*theta), error)`
:::


The useful question is usually the reverse: which joint angles put the gripper at a target? That is solving two non-linear equations, f(θ) = target. **Newton's method** solves it with the Jacobian: at the current guess, the linearisation says f(θ + Δθ) ≈ f(θ) + JΔθ, so choose Δθ to make this equal the target, J Δθ = target − f(θ), solve, update θ, and repeat. Near a solution each step roughly doubles the number of correct digits. Predict before running: from a rough guess, how many Newton steps reach the target to within a micrometre?

```python type
target = np.array([0.25, 0.45])
theta = np.radians([60.0, 30.0])
for step in range(1, 9):
    error = target - forward(*theta)
    print(f"step {step - 1}: tip error {np.linalg.norm(error) * 1000:.6f} mm")
    if np.linalg.norm(error) < 1e-9:
        break
    theta = theta + np.linalg.solve(jacobian(*theta), error)
print(f"joint angles {np.degrees(theta).round(4)}°")
```

```output
step 0: tip error 202.674497 mm
step 1: tip error 271.922450 mm
step 2: tip error 49.594671 mm
step 3: tip error 2.970125 mm
step 4: tip error 0.014742 mm
step 5: tip error 0.000000 mm
joint angles [25.38   86.4167]°
```

Each step solves the 2 × 2 linear system J Δθ = error for the correction Δθ.

The first step overshoots: the guess is far from the answer, where the linear model is poor, and the error grows from 203 mm to 272 mm. Then it falls to 50 mm, 3 mm, 0.015 mm and below a nanometre: once close, the number of correct digits roughly doubles each step (**quadratic convergence**). Two-link arms have an exact formula, but Newton's method with the Jacobian works for arms with any number of joints, which is how most robot software does it. It needs a reasonable starting guess and fails near singular poses, where J cannot be inverted.

::: challenge Forward kinematics and a numerical Jacobian [easy]
Write `arm_tip(theta1_deg, theta2_deg, l1, l2)` returning the gripper position as a NumPy array `[x, y]` for angles in **degrees**. Then write `numerical_jacobian(f, inputs, h=1e-6)` for any function f that takes the inputs as separate arguments and returns a NumPy array of outputs: return the m × n Jacobian with one central-difference column per input. Raise `ValueError` if h is not positive.

```python starter
def arm_tip(theta1_deg, theta2_deg, l1, l2):
    return np.array([l1 + l2, 0.0])

def numerical_jacobian(f, inputs, h=1e-6):
    return np.zeros((1, len(inputs)))

print(arm_tip(30, 60, 0.4, 0.3))
```

```python solution
def arm_tip(theta1_deg, theta2_deg, l1, l2):
    t1, t2 = math.radians(theta1_deg), math.radians(theta2_deg)
    return np.array([l1 * math.cos(t1) + l2 * math.cos(t1 + t2), l1 * math.sin(t1) + l2 * math.sin(t1 + t2)])

def numerical_jacobian(f, inputs, h=1e-6):
    if h <= 0:
        raise ValueError("h must be positive")
    x = np.asarray(inputs, dtype=float)
    cols = []
    for j in range(len(x)):
        e = np.zeros_like(x)
        e[j] = h
        cols.append((np.asarray(f(*(x + e)), dtype=float) - np.asarray(f(*(x - e)), dtype=float)) / (2 * h))
    return np.column_stack(cols)

print(arm_tip(30, 60, 0.4, 0.3))
```

```python test
for _n in ["arm_tip", "numerical_jacobian"]:
    assert _n in dir(), f"Define {_n}."
assert np.allclose(arm_tip(30, 60, 0.4, 0.3), [0.4 * math.cos(math.pi / 6), 0.5]), f"Got {arm_tip(30, 60, 0.4, 0.3)}."
assert np.allclose(arm_tip(0, 0, 0.4, 0.3), [0.7, 0]) and np.allclose(arm_tip(90, 180, 0.4, 0.3), [0, 0.1]), "Straight out, and folded back."
_J = numerical_jacobian(lambda a, b: np.array([a * b, a + b ** 2, math.sin(a)]), [2.0, 3.0])
assert _J.shape == (3, 2) and np.allclose(_J, [[3, 2], [1, 6], [math.cos(2), 0]], atol=1e-6), f"Rows are outputs, columns inputs; got {_J}."
_Ja = numerical_jacobian(lambda t1, t2: arm_tip(t1, t2, 0.4, 0.3), [30.0, 60.0])
_t1, _t12 = math.radians(30), math.radians(90)
_exact = np.array([[-0.4 * math.sin(_t1) - 0.3 * math.sin(_t12), -0.3 * math.sin(_t12)], [0.4 * math.cos(_t1) + 0.3 * math.cos(_t12), 0.3 * math.cos(_t12)]]) * math.pi / 180
assert np.allclose(_Ja, _exact, atol=1e-8), "Per degree, the arm's Jacobian is the radian one times π/180."
try:
    numerical_jacobian(lambda a: np.array([a]), [1.0], h=0)
    assert False, "h = 0 should raise ValueError."
except ValueError:
    pass
"SUCCESS: One central-difference column per input builds the Jacobian of any vector function."
```

Hint: Convert degrees to radians inside `arm_tip`. For the Jacobian, nudge input j by ±h, difference the two output vectors, divide by 2h, and stack the columns with `np.column_stack`.
:::

::: challenge Tip accuracy and singularities [medium]
Write `arm_jacobian(theta1_deg, theta2_deg, l1, l2)`, the analytic Jacobian (per **radian**) as a 2 × 2 array. Write `tip_sd(theta1_deg, theta2_deg, l1, l2, sigma_deg)`: the standard deviations of the tip's x and y, in metres, when each joint has an independent error of `sigma_deg` degrees, by the linear rule, as a tuple of two plain floats. Then write `singularity_margin(theta1_deg, theta2_deg, l1, l2)`: |det J| divided by its largest possible value l₁l₂, rounded to 4 decimal places (1 means as far from singular as possible, 0 means singular), and `safe_pose(theta1_deg, theta2_deg, l1, l2, minimum=0.1)`, True (a plain bool) when the margin is at least `minimum`.

```python starter
def arm_jacobian(theta1_deg, theta2_deg, l1, l2):
    return np.eye(2)

def tip_sd(theta1_deg, theta2_deg, l1, l2, sigma_deg):
    return (0.0, 0.0)

def singularity_margin(theta1_deg, theta2_deg, l1, l2):
    return 1.0

def safe_pose(theta1_deg, theta2_deg, l1, l2, minimum=0.1):
    return True

print(tip_sd(30, 60, 0.4, 0.3, 0.05))
```

```python solution
def arm_jacobian(theta1_deg, theta2_deg, l1, l2):
    t1, t12 = math.radians(theta1_deg), math.radians(theta1_deg + theta2_deg)
    return np.array([[-l1 * math.sin(t1) - l2 * math.sin(t12), -l2 * math.sin(t12)],
                     [l1 * math.cos(t1) + l2 * math.cos(t12), l2 * math.cos(t12)]])

def tip_sd(theta1_deg, theta2_deg, l1, l2, sigma_deg):
    J = arm_jacobian(theta1_deg, theta2_deg, l1, l2)
    s = math.radians(sigma_deg)
    sd = s * np.sqrt((J ** 2).sum(axis=1))
    return (float(sd[0]), float(sd[1]))

def singularity_margin(theta1_deg, theta2_deg, l1, l2):
    return round(abs(float(np.linalg.det(arm_jacobian(theta1_deg, theta2_deg, l1, l2)))) / (l1 * l2), 4)

def safe_pose(theta1_deg, theta2_deg, l1, l2, minimum=0.1):
    return bool(singularity_margin(theta1_deg, theta2_deg, l1, l2) >= minimum)

print(tip_sd(30, 60, 0.4, 0.3, 0.05))
```

```python test
for _n in ["arm_jacobian", "tip_sd", "singularity_margin", "safe_pose"]:
    assert _n in dir(), f"Define {_n}."
_J = arm_jacobian(30, 60, 0.4, 0.3)
assert np.allclose(_J, [[-0.5, -0.3], [0.4 * math.cos(math.pi / 6), 0.0]], atol=1e-12), f"Got {_J}."
_sx, _sy = tip_sd(30, 60, 0.4, 0.3, 0.05)
_s = math.radians(0.05)
assert abs(_sx - _s * math.hypot(0.5, 0.3)) < 1e-12 and abs(_sy - _s * 0.4 * math.cos(math.pi / 6)) < 1e-12 and type(_sx) is float, f"Got {(_sx, _sy)}."
assert singularity_margin(30, 90, 0.4, 0.3) == 1.0 and singularity_margin(30, 0, 0.4, 0.3) == 0.0 and singularity_margin(10, 180, 0.4, 0.3) == 0.0, "sin θ2: best at 90°, singular at 0° and 180°."
assert singularity_margin(0, 30, 1, 2) == 0.5 and singularity_margin(77, -30, 1, 2) == 0.5, "Independent of θ1 and of the sign of θ2."
assert safe_pose(30, 60, 0.4, 0.3) is True and safe_pose(30, 3, 0.4, 0.3) is False and safe_pose(30, 6, 0.4, 0.3) is True, "The margin is sin θ2."
"SUCCESS: The Jacobian's rows give the tip's sensitivity to joint errors, and its determinant warns of poses where the arm loses a direction."
```

Hint: The tip's x variance is σ²(J₁₁² + J₁₂²), so the standard deviations are σ times the root of each row's sum of squares (σ in radians). det J = l₁l₂ sin θ₂, so the margin is |sin θ₂|.
:::

::: challenge Inverse kinematics [hard]
Write `inverse_kinematics(target, l1, l2, guess_deg=(45, 45), tol=1e-10, max_iter=50)` that finds joint angles (degrees) placing the tip at `target` using Newton's method with the analytic Jacobian. Stop when the tip error is below `tol` (metres) and return the angles as a tuple of two floats, each normalised to (−180, 180]. Raise `ValueError` if the target is unreachable (distance from the origin greater than l₁ + l₂ or less than |l₁ − l₂|), and `RuntimeError` if a Newton step is impossible (|det J| < 1e-12 before a step, as at a singular pose; solve each step with `np.linalg.solve`) or if `max_iter` steps do not converge. Then write `both_solutions(target, l1, l2)`: the elbow-up and elbow-down solutions, found by starting Newton from guesses with θ₂ = +90° and θ₂ = −90° (θ₁ pointing at the target), returned as a list of two angle tuples sorted by θ₂ (most negative first).

```python starter
def inverse_kinematics(target, l1, l2, guess_deg=(45, 45), tol=1e-10, max_iter=50):
    return (45.0, 45.0)

def both_solutions(target, l1, l2):
    return [(0.0, 0.0), (0.0, 0.0)]

print(inverse_kinematics([0.25, 0.45], 0.4, 0.3))
```

```python solution
def _tip(t, l1, l2):
    return np.array([l1 * math.cos(t[0]) + l2 * math.cos(t[0] + t[1]), l1 * math.sin(t[0]) + l2 * math.sin(t[0] + t[1])])

def _jac(t, l1, l2):
    s1, c1, s12, c12 = math.sin(t[0]), math.cos(t[0]), math.sin(t[0] + t[1]), math.cos(t[0] + t[1])
    return np.array([[-l1 * s1 - l2 * s12, -l2 * s12], [l1 * c1 + l2 * c12, l2 * c12]])

def _wrap(deg):
    d = deg % 360
    return d - 360 if d > 180 else d

def inverse_kinematics(target, l1, l2, guess_deg=(45, 45), tol=1e-10, max_iter=50):
    target = np.asarray(target, dtype=float)
    r = float(np.linalg.norm(target))
    if r > l1 + l2 or r < abs(l1 - l2):
        raise ValueError("the target is outside the workspace")
    t = np.radians(np.asarray(guess_deg, dtype=float))
    for _ in range(max_iter):
        err = target - _tip(t, l1, l2)
        if np.linalg.norm(err) < tol:
            return (float(_wrap(math.degrees(t[0]))), float(_wrap(math.degrees(t[1]))))
        J = _jac(t, l1, l2)
        if abs(np.linalg.det(J)) < 1e-12:
            raise RuntimeError("singular pose: cannot take a Newton step")
        t = t + np.linalg.solve(J, err)
    raise RuntimeError("Newton's method did not converge")

def both_solutions(target, l1, l2):
    aim = math.degrees(math.atan2(target[1], target[0]))
    sols = [inverse_kinematics(target, l1, l2, guess_deg=(aim, e)) for e in (90, -90)]
    return sorted(sols, key=lambda s: s[1])

print(inverse_kinematics([0.25, 0.45], 0.4, 0.3))
```

```python test
for _n in ["inverse_kinematics", "both_solutions"]:
    assert _n in dir(), f"Define {_n}."
_fk = lambda a, b: np.array([0.4 * math.cos(math.radians(a)) + 0.3 * math.cos(math.radians(a + b)), 0.4 * math.sin(math.radians(a)) + 0.3 * math.sin(math.radians(a + b))])
_a, _b = inverse_kinematics([0.25, 0.45], 0.4, 0.3)
assert np.linalg.norm(_fk(_a, _b) - [0.25, 0.45]) < 1e-9 and type(_a) is float, f"The angles must reach the target; got {(_a, _b)}."
assert -180 < _a <= 180 and -180 < _b <= 180, "Normalised angles."
_s = both_solutions([0.25, 0.45], 0.4, 0.3)
assert len(_s) == 2 and _s[0][1] < 0 < _s[1][1], f"Elbow-down and elbow-up; got {_s}."
assert all(np.linalg.norm(_fk(*_p) - [0.25, 0.45]) < 1e-9 for _p in _s), "Both reach the target."
assert abs(_s[0][1] + _s[1][1]) < 1e-6, "The two elbow angles are mirror images."
for _bad in [[0.8, 0.0], [0.05, 0.0]]:
    try:
        inverse_kinematics(_bad, 0.4, 0.3)
        assert False, f"{_bad} is outside the workspace: raise ValueError."
    except ValueError:
        pass
try:
    inverse_kinematics([0.3, 0.3], 0.4, 0.3, guess_deg=(10, 0), max_iter=50)
    assert False, "A guess at a singular pose (θ2 = 0) cannot take a Newton step: raise RuntimeError."
except RuntimeError:
    pass
"SUCCESS: Newton's method with the Jacobian runs the arm backwards: target in, joint angles out, in a handful of steps."
```

Hint: Work in radians inside. Each step: error = target − tip(θ); if small, stop; otherwise solve J Δθ = error and add Δθ. Check the workspace before starting, and raise `RuntimeError` when |det J| is essentially zero or the loop runs out.
:::

## What you learned

- A vector-valued function maps several inputs to several outputs, like a robot arm's joint angles to its tip position.
- The Jacobian J holds every partial derivative: row i is output i's gradient, column j the effect of input j.
- Near a point, Δoutput ≈ J Δinput; this propagates joint errors into tip errors, pose by pose.
- det J measures how areas scale; where it is zero the map is singular and some output directions cannot be reached, so the required input speeds blow up nearby.
- Newton's method solves f(θ) = target by repeatedly solving J Δθ = target − f(θ), converging quadratically from a good guess.

The next lesson finds the special directions of a matrix through vibrating masses: eigenvectors.
