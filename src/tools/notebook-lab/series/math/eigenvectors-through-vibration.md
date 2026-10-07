# Eigenvectors through vibration

A machine sits on rubber mounts on a floor that itself flexes. Strike it and it shakes in a complicated, irregular way. Yet hidden inside that mess are a few simple motions, each a pure oscillation at a single frequency with a fixed shape, and every possible vibration of the system is just a mixture of them. These are the **normal modes**, and finding them is one of the most important calculations in mechanical engineering: a machine that runs at one of its natural frequencies resonates and can shake itself apart. Mathematically, the modes are the **eigenvectors** of a matrix and the frequencies come from its **eigenvalues**. This lesson discovers them by experiment with two masses on springs, then defines them, computes them, and uses them to predict the motion exactly.

This lesson covers:

- a two-mass, two-spring system as a matrix equation M x″ = −K x;
- simulating it, and finding starting shapes that move as one;
- eigenvalues and eigenvectors: A v = λ v;
- natural frequencies and mode shapes from `np.linalg.eig`, and in OpenMAT;
- decomposing any motion into modes, and checking against simulation.

## Two masses on springs

::: math
\[ M\mathbf{x}'' = -K\mathbf{x}, \qquad M = \begin{pmatrix} m_1 & 0 \\ 0 & m_2 \end{pmatrix}, \quad K = \begin{pmatrix} k_1 + k_2 & -k_2 \\ -k_2 & k_2 \end{pmatrix}, \quad A = M^{-1}K \]
- $x_1, x_2$: displacements of the two masses from rest
- $\mathbf{x}'' = -A\mathbf{x}$ couples them: each acceleration depends on both positions
In code: `A = np.linalg.solve(M, K)`, then `simulate(x0)` steps it with semi-implicit Euler
:::


A machine of mass m₁ = 2 kg sits on a mount of stiffness k₁ = 400 N/m; on top of it, a sub-assembly of mass m₂ = 1 kg sits on a spring of stiffness k₂ = 200 N/m. Let x₁ and x₂ be their displacements from rest. The lower spring stretches by x₁ and the upper one by x₂ − x₁, so Newton's second law for each mass gives

\[ m_1 x_1'' = -k_1 x_1 + k_2 (x_2 - x_1), \qquad m_2 x_2'' = -k_2 (x_2 - x_1) \]

In matrix form, **M x″ = −K x**, with the mass matrix M = diag(m₁, m₂) and the stiffness matrix K = [[k₁ + k₂, −k₂], [−k₂, k₂]]. The motion can be simulated with the semi-implicit Euler method from the Newton's-law lesson, now with vectors. Predict before running: if the lower mass is displaced 10 mm and released, does the motion look like a simple oscillation?

```python type
import math
import numpy as np
import matplotlib.pyplot as plt

M = np.diag([2.0, 1.0])
K = np.array([[600.0, -200.0], [-200.0, 200.0]])
A = np.linalg.solve(M, K)

def simulate(x0, T=3.0, dt=1e-4):
    x = np.array(x0, dtype=float)
    v = np.zeros_like(x)
    steps = round(T / dt)
    out = np.empty((steps + 1, len(x)))
    out[0] = x
    for k in range(1, steps + 1):
        v = v - A @ x * dt
        x = x + v * dt
        out[k] = x
    return np.arange(steps + 1) * dt, out

t, xs = simulate([0.010, 0.0])
fig, ax = plt.subplots(figsize=(7, 3))
ax.plot(t, xs[:, 0] * 1000, label="lower mass x1")
ax.plot(t, xs[:, 1] * 1000, label="upper mass x2")
ax.set_xlabel("time (s)")
ax.set_ylabel("displacement (mm)")
ax.legend()
plt.show()
print("A = M⁻¹K =\n", A)
```

```output
A = M⁻¹K =
 [[ 300. -100.]
 [-200.  200.]]
```

`A = np.linalg.solve(M, K)` computes M⁻¹K, so the equations become x″ = −A x, and each step updates the velocity vector by −A x Δt.

The motion is not a single sine wave: each mass traces a lumpy, uneven shape with big and small swings mixed together (here the shape happens to repeat every 0.63 s, for a reason the modes will explain). The matrix A = M⁻¹K, [[300, −100], [−200, 200]], couples the two masses: each one's acceleration depends on both positions.

## Special starting shapes

::: math
\[ \mathbf{x}(t) = \mathbf{v}\cos(\omega t) \;\Longrightarrow\; -\omega^2\mathbf{v} = -A\mathbf{v} \;\Longrightarrow\; A\mathbf{v} = \omega^2\mathbf{v} \]
- for special shapes $\mathbf{v}$ the masses keep a fixed ratio and move as one pure cosine
- $A(1, 2) = 100\,(1, 2)$ and $A(1, -1) = 400\,(1, -1)$
In code: `A @ v` for each starting shape, and the ratio `xs[:, 1] / xs[:, 0]` over time
:::


Try different starting shapes. Most give the same kind of mess, but two special ones do something remarkable: the masses move **together**, keeping the same ratio of displacements at every instant, each tracing a pure cosine. For such a shape v, the motion is x(t) = v cos(ωt), and substituting into x″ = −Ax gives −ω²v cos(ωt) = −Av cos(ωt), so

\[ A\mathbf{v} = \omega^2 \mathbf{v} \]

The matrix A, applied to v, gives back v itself, only scaled. Predict before running: do the starting shapes (1, 2) and (1, −1) behave differently from (1, 0)?

```python type
for shape in [(1, 0), (1, 2), (1, -1)]:
    v = np.array(shape, dtype=float)
    t, xs = simulate(0.005 * v / np.abs(v).max())
    ratio = xs[:, 1] / np.where(np.abs(xs[:, 0]) > 1e-4, xs[:, 0], np.nan)
    print(f"start {shape}: A v = {A @ v}, ratio x2/x1 over time ranges from {np.nanmin(ratio):.3f} to {np.nanmax(ratio):.3f}")
```

```output
start (1, 0): A v = [ 300. -200.], ratio x2/x1 over time ranges from -43.514 to 40.479
start (1, 2): A v = [100. 200.], ratio x2/x1 over time ranges from 2.000 to 2.000
start (1, -1): A v = [ 400. -400.], ratio x2/x1 over time ranges from -1.000 to -1.000
```

The ratio x₂/x₁ is computed only where x₁ is not near zero, to avoid dividing by tiny numbers.

Starting from (1, 0) the ratio swings wildly, because the shape keeps changing. Starting from (1, 2), the ratio stays at 2 throughout: the masses move in step, the upper one twice as far. Starting from (1, −1) it stays at −1: they move in opposite directions. And indeed A(1, 2) = (100, 200) = 100 × (1, 2), and A(1, −1) = (400, −400) = 400 × (1, −1). These two shapes are the system's **normal modes**.

## Eigenvalues and eigenvectors

::: math
\[ A\mathbf{v} = \lambda\mathbf{v}, \qquad \det(A - \lambda I) = 0, \qquad \omega = \sqrt{\lambda}, \quad f = \frac{\omega}{2\pi} \]
- $\mathbf{v} \ne \mathbf{0}$: eigenvector (a mode shape); $\lambda$: eigenvalue
- here $\lambda^2 - 500\lambda + 40000 = 0$, so $\lambda = 100$ and $\lambda = 400$
In code: `eigvals, eigvecs = np.linalg.eig(A)`; the columns of `eigvecs` are the eigenvectors
:::


A non-zero vector v with A v = λ v is an **eigenvector** of A, and the number λ is its **eigenvalue**. Most vectors change direction when multiplied by a matrix; eigenvectors only stretch (or shrink or flip). Any multiple of an eigenvector is also one, so they are directions rather than single vectors. An n × n matrix has at most n eigenvalues; they are the roots of det(A − λI) = 0, because (A − λI)v = 0 has a non-zero solution only when A − λI is singular.

For the vibration problem λ = ω², so each eigenvalue gives a **natural frequency** ω = √λ and each eigenvector a **mode shape**. `np.linalg.eig` returns the eigenvalues and a matrix whose columns are unit eigenvectors. Predict before running: what are the two natural frequencies in hertz?

```python type
eigvals, eigvecs = np.linalg.eig(A)
order = np.argsort(eigvals)
eigvals, eigvecs = eigvals[order], eigvecs[:, order]
for lam, vec in zip(eigvals, eigvecs.T):
    omega = math.sqrt(lam)
    print(f"λ = {lam:.1f}: ω = {omega:.2f} rad/s = {omega / (2 * math.pi):.3f} Hz, shape {np.round(vec / vec[0], 4)}, check |Av - λv| = {np.linalg.norm(A @ vec - lam * vec):.1e}")
print("roots of det(A - λI) = λ² - 500λ + 40000:", np.roots([1, -500, 40000]))
```

```output
λ = 100.0: ω = 10.00 rad/s = 1.592 Hz, shape [1. 2.], check |Av - λv| = 1.4e-14
λ = 400.0: ω = 20.00 rad/s = 3.183 Hz, shape [ 1. -1.], check |Av - λv| = 0.0e+00
roots of det(A - λI) = λ² - 500λ + 40000: [400. 100.]
```

`np.argsort` orders the modes from the lowest frequency up, the usual convention. Dividing each eigenvector by its first component gives the shape relative to the lower mass.

The eigenvalues are 100 and 400, so the natural frequencies are 10 and 20 rad/s, about 1.59 Hz and 3.18 Hz, with shapes (1, 2) and (1, −1), exactly what the experiment found. The characteristic polynomial det(A − λI) = λ² − 500λ + 40,000 has the same roots. The lower mode, both masses swinging together, is called the **fundamental**; in the higher mode they move against each other. A motor running at 95 or 190 rpm would excite them.

## The same calculation in OpenMAT

::: math
\[ AV = VD, \qquad D = \begin{pmatrix} \lambda_1 & 0 \\ 0 & \lambda_2 \end{pmatrix} \]
- the columns of $V$ are the eigenvectors; the diagonal of $D$ holds the eigenvalues
- eigenvectors are directions: divide by the first entry to compare
In code: `[V, D] = eig(M \ K)`, then `omega = sqrt(diag(D))`
:::


Eigenvalue problems are classic MATLAB territory. In OpenMAT, `[V, D] = eig(A)` returns the eigenvectors as the columns of V and the eigenvalues on the diagonal of D, and `M \ K` computes M⁻¹K. The cell shares nothing with the Python cells. Predict before running: do the frequencies and shapes agree with NumPy's?

```openmat
K = [600 -200; -200 200];
M = [2 0; 0 1];
[V, D] = eig(M \ K);
omega = sqrt(diag(D))
freq_hz = omega / (2 * pi)
mode1 = V(:, 1) / V(1, 1)
mode2 = V(:, 2) / V(1, 2)
```

`diag(D)` extracts the eigenvalues from the diagonal matrix, and `V(:, 1)` is the first column. OpenMAT's eigenvectors are not scaled to unit length, which is why each mode is divided by its first entry.

OpenMAT gives the same natural frequencies, 10 and 20 rad/s (1.592 and 3.183 Hz), and the same mode shapes (1, 2) and (1, −1). The scaling of eigenvectors is arbitrary (only the direction matters), which is why both tools' results are normalised before being compared.

## Every motion is a mixture of modes

::: math
\[ \mathbf{x}(t) = c_1\mathbf{v}_1\cos(\omega_1 t) + c_2\mathbf{v}_2\cos(\omega_2 t), \qquad V\mathbf{c} = \mathbf{x}_0 \]
- any motion from rest is a mixture of the modes (superposition)
- the amounts $c_1, c_2$ solve a linear system built from the mode shapes
In code: `c = np.linalg.solve(V, x0)`, then each mode times `np.cos(omega * t)`, summed
:::


The modes do more than describe special starts. Because the equation x″ = −Ax is linear, sums of solutions are solutions, so any motion is a **superposition** of the modes: with zero starting velocity,

\[ \mathbf{x}(t) = c_1 \mathbf{v}_1 \cos(\omega_1 t) + c_2 \mathbf{v}_2 \cos(\omega_2 t) \]

where the amounts c₁, c₂ come from writing the starting displacement as a combination of the mode shapes: V c = x₀, a linear system. This turns a coupled problem into independent single-frequency oscillations. Predict before running: does the modal formula reproduce the messy simulation from the first section?

```python type
x0 = np.array([0.010, 0.0])
V = eigvecs
c = np.linalg.solve(V, x0)
omegas = np.sqrt(eigvals)
t, sim = simulate(x0, T=3.0, dt=1e-4)
modal = (V[:, None, :] * (c * np.cos(np.outer(t, omegas)))[None, :, :]).sum(axis=2).T
print("mode amounts c:", c.round(6), " -> shapes:", [np.round(c[i] * V[:, i] * 1000, 3) for i in range(2)], "mm")
print(f"largest difference between modal formula and simulation: {np.abs(modal - sim).max() * 1000:.4f} mm")

fig, ax = plt.subplots(figsize=(7, 3))
ax.plot(t, sim[:, 0] * 1000, label="simulation x1")
ax.plot(t, modal[:, 0] * 1000, "--", label="modal formula x1")
ax.set_xlabel("time (s)")
ax.set_ylabel("mm")
ax.legend()
plt.show()
```

```output
mode amounts c: [0.007454 0.009428]  -> shapes: [array([3.333, 6.667]), array([ 6.667, -6.667])] mm
largest difference between modal formula and simulation: 0.0092 mm
```

The broadcasting expression evaluates c_i v_i cos(ω_i t) for every mode and time and sums over the modes; `np.outer(t, omegas)` makes a table of ω_i t.

Releasing the lower mass alone from 10 mm is a mixture: (3.33, 6.67) mm of the in-phase mode and (6.67, −6.67) mm of the opposed mode, which add up to (10, 0). The modal formula matches the simulation to within about 0.01 mm over three seconds (the simulation's own step error), and the two curves lie on top of each other. The lumpy motion is nothing more than two pure cosines at 1.59 Hz and 3.18 Hz adding together; because the higher frequency is exactly twice the lower one, their sum repeats every 1/1.59 s = 0.63 s. With frequencies in an irrational ratio it would never repeat exactly.

::: challenge Testing eigenvectors [easy]
Write `eigen_ratio(A, v, tol=1e-9)`: if A v is a multiple λ of the non-zero vector v (every component of A v − λ v within `tol` in size, using λ = (v · Av)/(v · v)), return λ as a plain float; otherwise return `None`. Raise `ValueError` for a zero vector or mismatched sizes. Then write `eigen_pairs(A)`: use `np.linalg.eig` and return a list of `(eigenvalue, unit_vector)` pairs sorted by eigenvalue, with each vector scaled to length 1 and its first non-zero component made positive; for this challenge the eigenvalues are real, so return them as plain floats (raise `ValueError` if any has an imaginary part larger than 1e-12).

```python starter
def eigen_ratio(A, v, tol=1e-9):
    return None

def eigen_pairs(A):
    return []

print(eigen_ratio(np.array([[300.0, -100], [-200, 200]]), [1, 2]))
```

```python solution
def eigen_ratio(A, v, tol=1e-9):
    A, v = np.asarray(A, dtype=float), np.asarray(v, dtype=float)
    if A.shape != (len(v), len(v)):
        raise ValueError("A must be square and match v")
    if not np.any(v):
        raise ValueError("the zero vector is never an eigenvector")
    Av = A @ v
    lam = float(v @ Av / (v @ v))
    return lam if np.all(np.abs(Av - lam * v) <= tol) else None

def eigen_pairs(A):
    vals, vecs = np.linalg.eig(np.asarray(A, dtype=float))
    if np.any(np.abs(np.imag(vals)) > 1e-12):
        raise ValueError("complex eigenvalues")
    pairs = []
    for lam, vec in zip(np.real(vals), np.real(vecs).T):
        vec = vec / np.linalg.norm(vec)
        first = vec[np.flatnonzero(np.abs(vec) > 1e-12)[0]]
        if first < 0:
            vec = -vec
        pairs.append((float(lam), vec))
    return sorted(pairs, key=lambda p: p[0])

print(eigen_ratio(np.array([[300.0, -100], [-200, 200]]), [1, 2]))
```

```python test
for _n in ["eigen_ratio", "eigen_pairs"]:
    assert _n in dir(), f"Define {_n}."
_A = np.array([[300.0, -100], [-200, 200]])
assert eigen_ratio(_A, [1, 2]) == 100.0 and eigen_ratio(_A, [-3, 3]) == 400.0, "Mode shapes and their multiples."
assert eigen_ratio(_A, [1, 0]) is None and eigen_ratio(_A, [1, 1]) is None, "Most vectors change direction."
assert type(eigen_ratio(_A, [1, 2])) is float, "Return a plain float."
for _bad in [([0, 0],), ([1, 2, 3],)]:
    try:
        eigen_ratio(_A, *_bad)
        assert False, f"{_bad} should raise ValueError."
    except ValueError:
        pass
_p = eigen_pairs(_A)
assert [round(_l, 9) for _l, _ in _p] == [100.0, 400.0] and all(type(_l) is float for _l, _ in _p), "Sorted plain-float eigenvalues."
assert np.allclose(_p[0][1], np.array([1, 2]) / math.sqrt(5)) and np.allclose(_p[1][1], np.array([1, -1]) / math.sqrt(2)), f"Unit vectors, first component positive; got {_p}."
_S = np.array([[2.0, 1, 0], [1, 3, 1], [0, 1, 4]])
for _l, _v in eigen_pairs(_S):
    assert abs(np.linalg.norm(_v) - 1) < 1e-12 and np.allclose(_S @ _v, _l * _v), "Every pair satisfies A v = λ v."
try:
    eigen_pairs(np.array([[0.0, -1], [1, 0]]))
    assert False, "A rotation has complex eigenvalues: raise ValueError."
except ValueError:
    pass
"SUCCESS: An eigenvector keeps its direction under A; its eigenvalue is the stretch."
```

Hint: Compute A v and the best-fitting λ = (v · Av)/(v · v), then check A v − λ v is tiny. For `eigen_pairs`, take the columns of the eigenvector matrix (iterate over its transpose), normalise, flip the sign if the first non-zero entry is negative, and sort.
:::

::: challenge Natural frequencies [medium]
Write `natural_frequencies(masses, K)` for a chain of masses with a mass matrix `diag(masses)` and a stiffness matrix K: return `(freqs_hz, shapes)`, where `freqs_hz` is a NumPy array of natural frequencies in hertz in increasing order and `shapes` is an array whose **columns** are the matching mode shapes, each scaled so that its largest-magnitude component is +1 (if two components tie in size, use the first of them). Raise `ValueError` if any mass is not positive, K is not square of matching size, or K is not symmetric. Then write `chain_stiffness(springs)`: for masses connected in a line, with `springs[0]` joining the first mass to the ground and `springs[i]` joining mass i − 1 to mass i, return the stiffness matrix K (the lesson's K for springs `[400, 200]`).

```python starter
def natural_frequencies(masses, K):
    n = len(masses)
    return np.zeros(n), np.eye(n)

def chain_stiffness(springs):
    return np.diag(np.asarray(springs, dtype=float))

print(natural_frequencies([2.0, 1.0], chain_stiffness([400, 200])))
```

```python solution
def chain_stiffness(springs):
    k = np.asarray(springs, dtype=float)
    n = len(k)
    K = np.zeros((n, n))
    for i in range(n):
        K[i, i] += k[i]
        if i > 0:
            K[i - 1, i - 1] += k[i]
            K[i - 1, i] -= k[i]
            K[i, i - 1] -= k[i]
    return K

def natural_frequencies(masses, K):
    m = np.asarray(masses, dtype=float)
    K = np.asarray(K, dtype=float)
    if np.any(m <= 0) or K.shape != (len(m), len(m)) or not np.allclose(K, K.T):
        raise ValueError("need positive masses and a symmetric square stiffness matrix")
    vals, vecs = np.linalg.eig(K / m[:, None])
    vals, vecs = np.real(vals), np.real(vecs)
    order = np.argsort(vals)
    vals, vecs = vals[order], vecs[:, order]
    shapes = np.empty_like(vecs)
    for j in range(vecs.shape[1]):
        col = vecs[:, j]
        shapes[:, j] = col / col[np.argmax(np.abs(col))]
    return np.sqrt(vals) / (2 * math.pi), shapes

print(natural_frequencies([2.0, 1.0], chain_stiffness([400, 200])))
```

```python test
for _n in ["natural_frequencies", "chain_stiffness"]:
    assert _n in dir(), f"Define {_n}."
assert np.array_equal(chain_stiffness([400, 200]), [[600, -200], [-200, 200]]), "The lesson's stiffness matrix."
assert np.array_equal(chain_stiffness([10, 20, 30]), [[30, -20, 0], [-20, 50, -30], [0, -30, 30]]), "Three masses in a line."
_f, _S = natural_frequencies([2.0, 1.0], chain_stiffness([400, 200]))
assert np.allclose(_f, [10 / (2 * math.pi), 20 / (2 * math.pi)]), f"1.59 and 3.18 Hz; got {_f}."
assert np.allclose(_S[:, 0], [0.5, 1]) and np.allclose(_S[:, 1], [1, -1]), f"Shapes as columns, largest component +1; got {_S}."
_m = [1.0, 1.0, 1.0]
_f3, _S3 = natural_frequencies(_m, chain_stiffness([100, 100, 100]))
assert np.all(np.diff(_f3) > 0) and np.allclose(np.abs(_S3).max(axis=0), 1), "Increasing frequencies; shapes scaled to a largest component of 1."
_Kc = chain_stiffness([100, 100, 100])
for _j in range(3):
    assert np.allclose(_Kc @ _S3[:, _j], (2 * math.pi * _f3[_j]) ** 2 * _S3[:, _j]), "K v = ω² M v for each mode."
for _bad in [([0.0, 1.0], chain_stiffness([1, 1])), ([1.0, 1.0], np.array([[2.0, -1], [0, 1]])), ([1.0], chain_stiffness([1, 1]))]:
    try:
        natural_frequencies(*_bad)
        assert False, "Bad masses or stiffness should raise ValueError."
    except ValueError:
        pass
"SUCCESS: Assemble K from the springs, solve the eigenproblem of M⁻¹K, and the square roots of the eigenvalues are the natural frequencies."
```

Hint: Each spring k between masses i − 1 and i adds k to both diagonal entries and −k to the two off-diagonal entries; the first spring only adds to K[0, 0]. With M = diag(m), M⁻¹K is K with row i divided by mᵢ. ω = √λ and f = ω/2π.
:::

::: challenge Predicting motion from modes [hard]
Write `modal_response(masses, K, x0, t)`: the exact free vibration from a starting displacement `x0` with zero starting velocity, x(t) = Σ cᵢ vᵢ cos(ωᵢ t), where vᵢ and ωᵢ² are the eigenvectors and eigenvalues of M⁻¹K and the cᵢ solve V c = x0. Return a NumPy array of shape `(len(t), len(x0))`. Use array operations: no Python loops at all inside `modal_response` (modes as well as times are handled with arrays). Then write `dominant_mode(masses, K, x0)`: the index (0 = lowest frequency) of the mode whose contribution |cᵢ| × |vᵢ| (vᵢ scaled to unit length) is largest. Finally write `pure_mode_start(masses, K, i, size)`: the starting displacement, as a NumPy array, that excites only mode i, scaled so its largest-magnitude component (the first one, if two tie in size) equals `size` (positive).

```python starter
def modal_response(masses, K, x0, t):
    return np.zeros((len(t), len(x0)))

def dominant_mode(masses, K, x0):
    return 0

def pure_mode_start(masses, K, i, size):
    return np.full(len(masses), size)

print(dominant_mode([2.0, 1.0], np.array([[600.0, -200], [-200, 200]]), [0.01, 0.0]))
```

```python solution
def _modes(masses, K):
    m = np.asarray(masses, dtype=float)
    vals, vecs = np.linalg.eig(np.asarray(K, dtype=float) / m[:, None])
    vals, vecs = np.real(vals), np.real(vecs)
    order = np.argsort(vals)
    vecs = vecs[:, order] / np.linalg.norm(vecs[:, order], axis=0)
    return np.sqrt(vals[order]), vecs

def modal_response(masses, K, x0, t):
    omegas, V = _modes(masses, K)
    c = np.linalg.solve(V, np.asarray(x0, dtype=float))
    t = np.asarray(t, dtype=float)
    return np.cos(np.outer(t, omegas)) * c @ V.T

def dominant_mode(masses, K, x0):
    omegas, V = _modes(masses, K)
    c = np.linalg.solve(V, np.asarray(x0, dtype=float))
    return int(np.argmax(np.abs(c)))

def pure_mode_start(masses, K, i, size):
    omegas, V = _modes(masses, K)
    v = V[:, i]
    return v / v[np.argmax(np.abs(v))] * size

print(dominant_mode([2.0, 1.0], np.array([[600.0, -200], [-200, 200]]), [0.01, 0.0]))
```

```python test
import ast as _ast
for _n in ["modal_response", "dominant_mode", "pure_mode_start"]:
    assert _n in dir(), f"Define {_n}."
for _node in _ast.walk(_ast.parse(_source)):
    if isinstance(_node, _ast.FunctionDef) and _node.name == "modal_response":
        assert not any(isinstance(_x, (_ast.For, _ast.While, _ast.ListComp)) for _x in _ast.walk(_node)), "modal_response: use array operations over the times."
_m, _K = [2.0, 1.0], np.array([[600.0, -200], [-200, 200]])
_t = np.linspace(0, 3, 3001)
_x = modal_response(_m, _K, [0.01, 0.0], _t)
assert _x.shape == (3001, 2) and np.allclose(_x[0], [0.01, 0.0]), "Starts at x0."
_xx, _vv = np.array([0.01, 0.0]), np.zeros(2)
_Am = _K / np.array(_m)[:, None]
for _k in range(30000):
    _vv = _vv - _Am @ _xx * 1e-4
    _xx = _xx + _vv * 1e-4
assert np.abs(_x[-1] - _xx).max() < 2e-5, f"Must match a fine simulation at t = 3 s; got {_x[-1]} vs {_xx}."
_pm = pure_mode_start(_m, _K, 1, 0.004)
assert np.allclose(_pm, [0.004, -0.004]), f"Mode 2 has shape (1, -1); got {_pm}."
_xp = modal_response(_m, _K, _pm, _t)
assert np.allclose(_xp[:, 0], 0.004 * np.cos(20 * _t)) and np.allclose(_xp[:, 1], -0.004 * np.cos(20 * _t)), "A pure-mode start is a single cosine at that mode's frequency."
assert np.allclose(pure_mode_start(_m, _K, 0, 0.01), [0.005, 0.01]), "Mode 1, largest component scaled to the size."
assert dominant_mode(_m, _K, [0.01, 0.0]) == 1 and dominant_mode(_m, _K, [0.01, -0.01]) == 1 and dominant_mode(_m, _K, [0.0, 0.01]) == 0 and dominant_mode(_m, _K, [0.01, 0.02]) == 0, "Which mode carries most of the start."
_m3, _K3 = [1.0, 1.0, 1.0], np.array([[200.0, -100, 0], [-100, 200, -100], [0, -100, 100]])
_x3 = modal_response(_m3, _K3, [0.0, 0.0, 0.01], [0.0, 0.5])
assert np.allclose(_x3[0], [0, 0, 0.01]), "Three masses too."
"SUCCESS: Split the start into mode shapes, let each swing at its own frequency, add them back: the whole motion, without a single time step."
```

Hint: Get the eigenvalues and eigenvectors of M⁻¹K (sorted, columns normalised), solve V c = x0, then with `np.cos(np.outer(t, omegas))` (one row per time, one column per mode) multiply by c and by Vᵀ to combine the shapes.
:::

## What you learned

- Coupled masses and springs obey M x″ = −K x; their free motion usually looks irregular.
- Special shapes v move as a unit at one frequency because A v = ω² v with A = M⁻¹K: they are eigenvectors, and the eigenvalues give the natural frequencies.
- Eigenvectors keep their direction under a matrix; eigenvalues are the roots of det(A − λI) = 0. `np.linalg.eig` and OpenMAT's `[V, D] = eig(A)` compute them.
- Any free vibration is a superposition of modes, with amounts found by solving V c = x₀, which predicts the motion exactly without time stepping.
- Machines must avoid running at their natural frequencies, where they resonate.

The next lesson writes laws of change as differential equations, starting with a draining tank and a cooling part.
