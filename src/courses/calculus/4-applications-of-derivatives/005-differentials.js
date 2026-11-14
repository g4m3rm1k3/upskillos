import secantToTangentUrl from '../diagrams/calc-secant-to-tangent.svg?url';
import differentialDyUrl from '../diagrams/calc-differential-dy.svg?url';
import differentialErrorUrl from '../diagrams/calc-differential-error.svg?url';
// FILE: src/content/chapter-3/07-differentials.js
export default {
  id: 'ch3-070',
  slug: 'differentials',
  chapter: 3,
  order: 3,
  title: 'Differentials',
  subtitle: 'The notation dy = f\'(x)dx is not just shorthand — it is a precise tool for estimating errors and bridging derivatives to integrals',
  tags: ['differentials', 'dx', 'dy', 'error estimation', 'propagation', 'relative error', 'linear approximation', 'uncertainty'],

  hook: {
    question: 'A spherical tank has a measured radius of 10 meters with a possible error of $\\pm 0.05$ m. The volume $V = \\frac{4}{3}\\pi r^3$ is used to determine how much liquid the tank holds. How much error in the volume does the measurement error in the radius produce?',
    realWorldContext: "Every physical measurement has uncertainty. A machinist cuts a part to 5.00 cm but the tolerance is $\\pm 0.01$ cm. A surveyor measures an angle to within $\\pm 0.1°$. A chemist weighs a sample to $\\pm 0.001$ g. When these measured values are plugged into formulas — areas, volumes, concentrations, forces — the uncertainties propagate through the calculation. Differentials give a clean, systematic way to estimate how errors in inputs produce errors in outputs. The differential $dy = f'(x)\\,dx$ is the linear approximation reframed: instead of approximating the function, we approximate the change in the function. This perspective is fundamental in physics, engineering, and experimental science, and it provides the conceptual bridge from derivatives to integrals.",
    previewVisualizationId: 'LinearApproximation',
  },

  intuition: {
    blocks: [
      {
        type: 'prose',
        paragraphs: [
      "Linear approximation says Δy ≈ f'(a)Δx for small changes. Differentials are that same idea given formal mathematical names: we write dx for the independent change (an infinitesimal nudge in x) and dy = f'(x)dx for the dependent change (how y responds along the tangent line). The notation is not just cosmetic — it is the same Leibniz notation you have used for derivatives since Chapter 2. In fact, dy/dx being a 'fraction of differentials' that you can cancel is why the chain rule and substitution rule work the way they do. This lesson makes that informal intuition precise.",
      "You already know linear approximation: $f(x + \\Delta x) \\approx f(x) + f'(x) \\cdot \\Delta x$ when $\\Delta x$ is small. Differentials repackage this idea with a subtle but important shift in emphasis. Instead of approximating the value of $f$ at a nearby point, we approximate the change in $f$. The actual change is $\\Delta y = f(x + \\Delta x) - f(x)$. The approximate change is $dy = f'(x)\\,dx$, where $dx = \\Delta x$ is the change in $x$. The approximation says $\\Delta y \\approx dy$ when $dx$ is small.",
        ],
      },
      { type: 'image', src: secantToTangentUrl, alt: 'Tangent line showing dy vs. Δy for a small change dx', caption: 'Differentials dy = f′(x) dx approximate the actual change Δy — useful for error estimation.' },
      {
        type: 'prose',
        paragraphs: [
      "What are $dx$ and $dy$ as standalone objects? Think of $dx$ as an independent variable — it represents an arbitrary (small) increment in $x$. Given $dx$, the differential $dy = f'(x)\\,dx$ is defined to be the change along the tangent line, not the change along the curve. The actual change $\\Delta y$ follows the curve; the differential $dy$ follows the tangent. For small $dx$, the tangent and the curve are nearly identical, so $\\Delta y \\approx dy$.",
      "This notation has enormous power in physics and engineering. When a physicist writes $dW = F\\,dx$ (work equals force times displacement) or $dQ = mc\\,dT$ (heat equals mass times specific heat times temperature change), they are using differentials. The equation $dy = f'(x)\\,dx$ looks like you can divide both sides by $dx$ to get $dy/dx = f'(x)$, and indeed this is consistent — differentials are designed so that the ratio $dy/dx$ recovers the derivative. This is why Leibniz notation works so well: the derivative literally is the ratio of differentials.",
      "Error estimation is the most practical application of differentials. Suppose you measure $x$ with an error of $\\pm\\Delta x$. The resulting error in $y = f(x)$ is approximately $\\Delta y \\approx dy = f'(x)\\,\\Delta x$. This converts an error in the input to an error in the output through the derivative. The derivative acts as an amplification factor: if $|f'(x)|$ is large, small input errors produce large output errors; if $|f'(x)|$ is small, the output is insensitive to input errors.",
        ],
      },
      { type: 'image', src: differentialDyUrl, alt: 'dy along tangent vs Δy along curve for small dx', caption: 'dy follows the tangent line; Δy follows the curve. When dx is small, dy ≈ Δy.' },
      {
        type: 'prose',
        paragraphs: [
      "Relative error is often more meaningful than absolute error. If you measure a length as 100 m $\\pm$ 1 m, the relative error is $1/100 = 1\\%$. If you measure it as 10 m $\\pm$ 1 m, the relative error is $1/10 = 10\\%$ — much worse, even though the absolute error is the same. The relative error in $y$ is $\\frac{dy}{y} = \\frac{f'(x)}{f(x)}\\,dx$. For $y = x^n$, this gives $\\frac{dy}{y} = n\\frac{dx}{x}$: the relative error in $x^n$ is $n$ times the relative error in $x$. A 1\\% error in the radius of a sphere produces a 3\\% error in its volume ($V \\propto r^3$).",
      "Differentials also connect derivatives to integrals conceptually. The equation $dy = f'(x)\\,dx$ says that the total change in $y$ is the accumulation of tiny changes $f'(x)\\,dx$. Summing these infinitesimal changes from $a$ to $b$ gives $\\int_a^b f'(x)\\,dx = f(b) - f(a)$ — the Fundamental Theorem of Calculus. The integral literally sums up the differentials. This is why the notation $\\int f(x)\\,dx$ includes the $dx$: you are summing products $f(x) \\cdot dx$ over the interval.",
      "In multiple dimensions, the story generalizes beautifully. If $f$ depends on several variables, $df = \\frac{\\partial f}{\\partial x}dx + \\frac{\\partial f}{\\partial y}dy + \\cdots$. This is the total differential, and it captures how errors in multiple measurements combine. Each partial derivative is an error amplification factor for its respective variable. This is the foundation of uncertainty propagation in experimental science.",
        ],
      },
      { type: 'image', src: differentialErrorUrl, alt: 'Worked example approximating √25.1 with differentials and error analysis', caption: 'Using dy = f′(25)·(0.1) = 0.01: √25.1 ≈ 5.01. Actual error is less than 0.001%.' },
    ],
    callouts: [
      {
        type: 'prior-knowledge',
        title: 'Linear Approximation Reframed',
        body: 'Linear approximation says $f(a + \\Delta x) \\approx f(a) + f\'(a)\\Delta x$. Differentials rewrite this as $\\Delta y \\approx dy = f\'(a)\\,dx$. Same idea, different emphasis: instead of approximating the function value, we approximate the change.',
      },
      {
        type: 'real-world',
        title: 'Engineering Tolerances',
        body: "A mechanical part must fit within a $\\pm 0.01$ mm tolerance. If the part's dimension depends on a machined radius $r$ through a formula $d = f(r)$, the tolerance on $r$ is determined by $|f'(r)|\\,\\Delta r \\leq 0.01$, giving $\\Delta r \\leq 0.01/|f'(r)|$. Differentials directly translate output tolerances to input tolerances.",
      },
      {
        type: 'tip',
        title: 'Relative Error Rule for Powers',
        body: "If $y = x^n$, the relative error satisfies $\\frac{|dy|}{|y|} = |n| \\cdot \\frac{|dx|}{|x|}$. A 1\\% error in $x$ produces an $|n|\\%$ error in $x^n$. Squaring doubles the relative error; cubing triples it; taking a square root halves it.",
      },
      {
        type: 'warning',
        title: 'Differentials Are Approximations',
        body: 'The differential $dy = f\'(x)\\,dx$ is the tangent-line approximation to $\\Delta y$. For large $dx$, $dy$ and $\\Delta y$ can differ significantly. The quality of the approximation depends on the curvature $f\'\'(x)$ and the size of $dx$: the error is approximately $\\frac{1}{2}f\'\'(x)(dx)^2$.',
      },
      {
        type: 'geometric',
        title: 'Tangent Line vs. Curve',
        body: 'Graphically, $dy$ is the vertical change along the tangent line, while $\\Delta y$ is the vertical change along the curve. The tangent line is the best linear approximation, so $dy$ is the best linear estimate of $\\Delta y$. The gap $\\Delta y - dy$ is the error in the linear approximation.',
      },
    ],
    visualizations: [
      { vizId: 'LinearApproximation', caption: "The differential dy = 12·dx approximates the actual curve change Δy for f(x) = x³ at a = 2. Error is O(dx²).", mathBridge: "Set f(x) = x³ and base point a = 2. Compute f(2) = 8 and f'(2) = 12. So dy = 12·dx. Move dx to 0.1: dy = 1.2, Δy = f(2.1) − f(2) = 9.261 − 8 = 1.261. Error = 0.061. Move dx to 0.01: dy = 0.12, Δy ≈ 0.1206. The error shrinks as (dx)². This is why dy is a good approximation for small dx." },
      {
        id: 'Ch3Review',
        title: 'Chapter 3 Review Board',
        caption: 'A complete map of Applications of Derivatives, highlighting optimization, related rates, and curve sketching.',
      },
      {
        id: 'Ch3Applied',
        title: 'Chapter 3 Applied Problems',
        caption: 'Real-world applications: minimizing costs, predicting trajectories, and maximizing efficiency.',
      },
    ],
  },

  math: {
    prose: [
      "**Definition.** If $y = f(x)$ is differentiable, the differential of $y$ is $dy = f'(x)\\,dx$, where $dx$ is an independent variable representing an increment in $x$. The differential $dx$ is simply defined to be $\\Delta x$ (the actual change in $x$). The differential $dy$ is the corresponding change along the tangent line — not the curve.",
      "**Relationship to $\\Delta y$.** The actual change is $\\Delta y = f(x + dx) - f(x)$. By the definition of the derivative, $\\Delta y = f'(x)\\,dx + \\epsilon \\cdot dx$ where $\\epsilon \\to 0$ as $dx \\to 0$. Therefore $\\Delta y - dy = \\epsilon \\cdot dx$, which is $o(dx)$ — the error in the differential approximation vanishes faster than $dx$ itself. More precisely, Taylor's theorem gives $\\Delta y - dy = \\frac{1}{2}f''(\\xi)(dx)^2$ for some $\\xi$ between $x$ and $x + dx$.",
      "**Error estimation formulas.** If $x$ is measured with absolute error $|\\Delta x|$, then: Absolute error in $y$: $|\\Delta y| \\approx |dy| = |f'(x)| \\cdot |\\Delta x|$. Relative error in $y$: $\\frac{|\\Delta y|}{|y|} \\approx \\frac{|f'(x)|}{|f(x)|} \\cdot |\\Delta x|$. Percentage error in $y$: multiply relative error by 100.",
      "**Differentials of common functions.** $d(x^n) = nx^{n-1}\\,dx$. $d(\\sin x) = \\cos x\\,dx$. $d(\\cos x) = -\\sin x\\,dx$. $d(e^x) = e^x\\,dx$. $d(\\ln x) = \\frac{1}{x}\\,dx$. $d(\\tan x) = \\sec^2 x\\,dx$. Every differentiation rule translates directly: $d(fg) = f\\,dg + g\\,df$ (product rule), $d(f/g) = (g\\,df - f\\,dg)/g^2$ (quotient rule), $d(f(g)) = f'(g)\\,dg$ (chain rule).",
      "**Propagation of errors with multiple variables.** If $z = f(x, y)$ where $x$ and $y$ are measured independently with errors $\\Delta x$ and $\\Delta y$, then $dz = f_x\\,dx + f_y\\,dy$, giving $|\\Delta z| \\leq |f_x|\\,|\\Delta x| + |f_y|\\,|\\Delta y|$. For statistically independent errors, the root-sum-square estimate $\\Delta z \\approx \\sqrt{(f_x\\,\\Delta x)^2 + (f_y\\,\\Delta y)^2}$ is used instead.",
      "**Connection to integration.** The equation $dy = f'(x)\\,dx$ can be read as: the infinitesimal change in $y$ equals $f'(x)$ times the infinitesimal change in $x$. Summing (integrating) both sides from $a$ to $b$: $\\int_a^b dy = \\int_a^b f'(x)\\,dx$, which gives $y(b) - y(a) = \\int_a^b f'(x)\\,dx$. This is the Fundamental Theorem of Calculus, derived naturally from the differential notation.",
    ],
    callouts: [
      {
        type: 'definition',
        title: 'The Differential',
        body: 'If $y = f(x)$ is differentiable, then $dy = f\'(x)\\,dx$ where $dx = \\Delta x$ is an independent variable. The differential $dy$ is the change in $y$ along the tangent line corresponding to a change $dx$ in $x$.',
      },
      {
        type: 'theorem',
        title: 'Error Propagation',
        body: 'If $y = f(x)$ and $x$ is measured with error $\\Delta x$, then $|\\Delta y| \\approx |f\'(x)|\\,|\\Delta x|$ (absolute error) and $\\frac{|\\Delta y|}{|y|} \\approx \\left|\\frac{f\'(x)}{f(x)}\\right|\\,|\\Delta x|$ (relative error).',
      },
      {
        type: 'tip',
        title: 'Logarithmic Differentiation for Relative Error',
        body: 'Taking $d(\\ln y) = \\frac{dy}{y}$ gives the relative error directly. For $y = x^n$: $d(\\ln y) = d(n \\ln x) = n\\frac{dx}{x}$, so $\\frac{dy}{y} = n\\frac{dx}{x}$. This is the fastest way to find relative errors of power functions.',
      },
    ],
    visualizations: [
      { vizId: 'LinearApproximation', caption: "Second-order error analysis: the quadratic gap between tangent and curve is bounded by the second derivative.", mathBridge: "The gap between the red curve and blue tangent line represents the approximation error |Δy − dy|. Taylor's theorem proves this gap is bounded by M/2·(dx)² where M = max|f''| on the interval. For f(x) = x³, f''(x) = 6x, so M ≈ 6·2 = 12 near x = 2. Error bound: 12/2·(0.1)² = 0.06, matching the observed error." },
    ],
  },

  rigor: {
    prose: [
      "**Formal definition of differentials.** Let $f: I \\to \\mathbb{R}$ be differentiable at $x \\in I$. Define the differential $df_x: \\mathbb{R} \\to \\mathbb{R}$ as the linear map $df_x(h) = f'(x) \\cdot h$. Here $h$ plays the role of $dx$. The differential is a linear function of $h$, not a number — it is the best linear approximation to the change $f(x + h) - f(x)$.",
      "**Rigorous error bound.** By Taylor's theorem with the Lagrange remainder, if $f \\in C^2$, then $f(x + h) - f(x) = f'(x)h + \\frac{1}{2}f''(\\xi)h^2$ for some $\\xi$ between $x$ and $x + h$. Therefore $|\\Delta y - dy| = \\frac{1}{2}|f''(\\xi)||h|^2 \\leq \\frac{M_2}{2}h^2$ where $M_2 = \\max|f''|$ on the relevant interval. The approximation error is $O(h^2)$, confirming that the differential is accurate to first order.",
      "**Differentials as linear maps.** In modern differential geometry, the differential $df$ at a point $x$ is a linear functional (a covector) acting on tangent vectors. For functions of one variable, this reduces to $df_x(v) = f'(x) \\cdot v$. The chain rule $d(g \\circ f) = (dg) \\circ (df)$ (composition of linear maps) gives $(g \\circ f)'(x) = g'(f(x)) \\cdot f'(x)$, recovering the familiar chain rule. This abstract perspective explains why the Leibniz notation $\\frac{dy}{dx}$ behaves algebraically like a fraction: it is the ratio of two linear maps applied to the same tangent vector.",
      "**Why $dy/dx$ acts like a fraction.** If $y = f(x)$ and $x = g(t)$, then $dy = f'(x)\\,dx$ and $dx = g'(t)\\,dt$. Substituting: $dy = f'(x) \\cdot g'(t)\\,dt = f'(g(t)) \\cdot g'(t)\\,dt$. Formally, $\\frac{dy}{dt} = \\frac{dy}{dx} \\cdot \\frac{dx}{dt}$, which is the chain rule. The cancellation of $dx$ is rigorous when differentials are understood as linear maps composed together.",
      "**Propagation of uncertainty (rigorous formulation).** If $f: \\mathbb{R}^n \\to \\mathbb{R}$ is $C^1$ and $\\mathbf{x} = (x_1, \\ldots, x_n)$ is measured with errors $\\delta x_i$, the worst-case error bound is $|\\Delta f| \\leq \\sum_{i=1}^n \\left|\\frac{\\partial f}{\\partial x_i}\\right| |\\delta x_i|$. If the errors are independent random variables with standard deviations $\\sigma_i$, the standard deviation of $f$ is $\\sigma_f = \\sqrt{\\sum_{i=1}^n \\left(\\frac{\\partial f}{\\partial x_i}\\right)^2 \\sigma_i^2}$ (the root-sum-square formula, derived from the variance of a linear combination).",
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'Differential Approximation Error',
        body: 'If $f \\in C^2$, then $|\\Delta y - dy| \\leq \\frac{M_2}{2}(dx)^2$ where $M_2 = \\max_{[x, x+dx]} |f\'\'|$. The differential is a first-order approximation with second-order error.',
      },
      {
        type: 'definition',
        title: 'Differential as a Linear Map',
        body: 'The differential $df_x: \\mathbb{R} \\to \\mathbb{R}$ is the linear map $h \\mapsto f\'(x) \\cdot h$. It is the best linear approximation to $\\Delta f$ in the sense that $\\Delta f - df_x(h) = o(h)$ as $h \\to 0$.',
      },
    ],
    visualizations: [],
  },

  examples: [
    {
      id: 'ch3-070-ex1',
      title: 'Error in the Volume of a Sphere',
      problem: "\\text{A sphere's radius is measured as } r = 10 \\text{ m with error } \\pm 0.05 \\text{ m. Estimate the error in the volume.}",
      steps: [
        { expression: '', annotation: '\\text{REGISTRY (The Players):} \\\\ \\bullet \\ r \\text{ (Radius): the size we intended to measure} \\\\ \\bullet \\ dr \\text{ (Radius Error): how much our measurement might be wrong (} \\pm 0.05 \\text{ m)} \\\\ \\bullet \\ dV \\text{ (Volume Error): how much that mistake grows in the calculated volume}' },
        { expression: '\\Delta V \\approx \\frac{dV}{dr} \\, dr', annotation: '\\text{MASTER UNIFYING EQUATION: The change in any quantity is approximately its sensitivity times the small error in the input. This is the tangent-line (first-order linear) approximation we use in every example.}' },
        { expression: 'V = \\frac{4}{3}\\pi r^3', annotation: '\\text{MODEL SOURCE: This volume formula comes from geometry. We treat it as exact and only study how error in radius propagates through it.}' },
        { expression: '', annotation: '\\text{EXACT vs MEASURED: } r \\text{ is measured (has error dr); the constants 4/3 and } \\pi \\text{ are exact (no uncertainty).}' },
        { expression: 'f\'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}', annotation: '\\text{DERIVATIVE DEFINITION: The instantaneous rate of change, defined as this limit (slope of the tangent line at a point).}' },
        { expression: 'f\'(x) = n x^{n-1}', annotation: '\\text{POWER RULE: For any power term } x^n \\text{, multiply the exponent by the coefficient and subtract 1 from the exponent.}' },
        { expression: '\\frac{dV}{dr} = 4\\pi r^2', annotation: '\\text{SENSITIVITY (Exchange Rate): The derivative tells us how sensitive the volume is to radius. For every 1 meter of error in radius, how many extra cubic meters of volume error appear? Here the sensitivity is } 4\\pi r^2 \\text{ (units: m}^2\\text{).}' },
        { expression: 'dV = 4\\pi r^2 \\, dr', annotation: '\\text{PHYSICAL METAPHOR: Imagine the sphere is like an onion. A tiny error dr in radius is like adding a paper-thin layer of skin on the outside. The surface area of the sphere is } 4\\pi r^2\\text{. Multiplying surface area by the thickness of the skin (dr) gives the volume of the error layer: } dV = 4\\pi r^2 \\, dr \\text{.}' },
        { expression: '', annotation: '\\text{UNIT DEBUGGER: Surface area (m}^2\\text{) × thickness (m) = volume (m}^3\\text{). The units are consistent — this is a good logic check.}' },
        { expression: 'r = 10, \\quad dr = \\pm 0.05', annotation: '\\text{Measured radius and its maximum possible error.}' },
        { expression: '10^2 = 100', annotation: '\\text{First compute } r^2 = 10 \\times 10 = 100\\text{.}' },
        { expression: '4 \\times 100 = 400', annotation: '4 \\times 100 = 400.' },
        { expression: '400 \\times 0.05 = 20', annotation: '400 \\times 0.05 = 20, \\text{ so } dV = \\pm 20\\pi \\approx \\pm 62.83 \\text{ m}^3 \\text{.}' },
        { expression: 'V = \\frac{4}{3}\\pi (10)^3 = \\frac{4000\\pi}{3} \\approx 4188.79 \\text{ m}^3', annotation: '\\text{Nominal (expected) volume using the measured radius with no error.}' },
        { expression: '\\frac{dy}{y} = n \\frac{dx}{x}', annotation: '\\text{GENERAL RELATIVE ERROR LAW: For any power relationship } y \\propto x^n\\text{, the relative error in } y \\text{ is } n \\text{ times the relative error in } x \\text{.}' },
        { expression: '\\frac{|dV|}{V} = 0.015 = 1.5\\%', annotation: '\\text{AMPLIFIER: The relative error is 1.5\\%, which is exactly 3 times the 0.5\\% error in radius. Because volume depends on } r^3\\text{, the exponent 3 literally triples the mistake. The exponent acts as an error amplifier.}' },
        { expression: '', annotation: '\\text{SENSITIVITY SUMMARY: Volume is highly sensitive to radius changes because of the cubic term.}' },
        { expression: '', annotation: '\\text{VALIDITY: dr/r = 0.5\\% is small, so the linear approximation is reliable (higher-order terms like } (dr)^2 \\text{ are negligible).}' }
      ],
      conclusion: "\\text{Using the master law, the volume has an absolute error of approximately } \\pm 62.83 \\text{ m}^3 \\text{ and a relative error of 1.5\\%. The cubic relationship strongly amplifies measurement error.}",
    },
    {
      id: 'ch3-070-ex2',
      title: 'Estimating a Square Root Using Differentials',
      problem: "\\text{Use differentials to estimate } \\sqrt{4.02}.",
      steps: [
        { expression: '', annotation: '\\text{REGISTRY: } f(x) = \\sqrt{x} \\text{ (function), } a = 4 \\text{ (nearby exact point where } \\sqrt{4}=2\\text{), } dx = 0.02 \\text{ (small change), } dy \\text{ (estimated change in square root).}' },
        { expression: '\\Delta f \\approx f\'(x) \\, \\Delta x', annotation: '\\text{MASTER UNIFYING EQUATION.}' },
        { expression: 'f(x) = x^{1/2}', annotation: '\\text{MODEL SOURCE: Square root is the inverse of squaring (standard algebraic model).}' },
        { expression: '', annotation: '\\text{EXACT vs MEASURED: We use nearby exact point a=4; the input 4.02 has small error dx.}' },
        { expression: 'f\'(x) = n x^{n-1}', annotation: '\\text{POWER RULE.}' },
        { expression: "f'(x) = \\frac{1}{2} x^{-1/2}", annotation: '\\text{SENSITIVITY: How much the square root changes per unit change in the number inside.}' },
        { expression: 'f(x + dx) \\approx f(x) + f\'(x) \\, dx', annotation: '\\text{LINEARIZATION: Tangent-line approximation (first-order truncation).}' },
        { expression: 'dx = 0.02', annotation: '\\text{Small change: 4.02 - 4 = 0.02.}' },
        { expression: 'dy = \\frac{1}{4} \\times 0.02 = 0.005', annotation: '\\text{Apply master law.}' },
        { expression: '\\sqrt{4.02} \\approx 2 + 0.005 = 2.005', annotation: '\\text{Final estimate.}' },
        { expression: '\\frac{dy}{y} = \\frac{1}{2} \\frac{dx}{x}', annotation: '\\text{AMPLIFIER: Exponent 1/2 damps (reduces) the relative error by half.}' },
        { expression: '', annotation: '\\text{VALIDITY: dx is only 0.5\\% of a=4, so the approximation is excellent.}' }
      ],
      conclusion: "\\text{The master law gives } \\sqrt{4.02} \\approx 2.005 \\text{ with very high accuracy.}",
    },
    {
      id: 'ch3-070-ex3',
      title: 'Propagation of Error in a Pendulum Period',
      problem: "\\text{The period of a pendulum is } T = 2\\pi\\sqrt{L/g}. \\text{ If } L = 1.00 \\pm 0.01 \\text{ m and } g = 9.80 \\text{ m/s}^2 \\text{, find the error in } T.",
      steps: [
        { expression: '', annotation: '\\text{REGISTRY: } T \\text{ (period in seconds), } L \\text{ (length — measured), } dL \\text{ (length error), } dT \\text{ (error in period). g is exact.}' },
        { expression: '\\Delta T \\approx \\frac{dT}{dL} \\, dL', annotation: '\\text{MASTER UNIFYING EQUATION.}' },
        { expression: 'T = \\frac{2\\pi}{\\sqrt{g}} L^{1/2}', annotation: '\\text{MODEL SOURCE: Derived from physics of a simple pendulum (torque and small-angle approximation).}' },
        { expression: '', annotation: '\\text{EXACT vs MEASURED: L is measured; g is treated as exact constant.}' },
        { expression: 'f\'(L) = \\frac{1}{2} L^{-1/2} \\times \\text{constant}', annotation: '\\text{SENSITIVITY of period to length.}' },
        { expression: 'dT = \\frac{\\pi}{\\sqrt{g L}} \\, dL', annotation: '\\text{Differential formed.}' },
        { expression: '\\frac{dT}{T} = \\frac{1}{2} \\frac{dL}{L}', annotation: '\\text{AMPLIFIER: The square-root relationship (exponent 1/2) damps the relative error by half.}' },
        { expression: '', annotation: '\\text{UNIT DEBUGGER: Period error ends in seconds, consistent with input.}' },
        { expression: '', annotation: '\\text{VALIDITY: 1\\% error in length is small, so approximation holds well.}' }
      ],
      conclusion: "\\text{Using the master law: } T \\approx 2.007 \\pm 0.010 \\text{ s. The square-root damps measurement error, making pendulum clocks forgiving.}",
    },
    {
      id: 'ch3-070-ex4',
      title: 'Error in Area from Angle Measurement',
      problem: "\\text{A triangle has sides } a = 10, b = 8, \\text{ and included angle } \\theta = 30° \\pm 1°. \\text{ Estimate the error in the area } A = \\frac{1}{2}ab\\sin\\theta.",
      steps: [
        { expression: '', annotation: '\\text{REGISTRY: } A \\text{ (area), } \\theta \\text{ (angle — measured with } \\pm 1^\\circ\\text{), } d\\theta \\text{ (angle error), } dA \\text{ (area error). a and b are exact.}' },
        { expression: '\\Delta A \\approx \\frac{dA}{d\\theta} \\, d\\theta', annotation: '\\text{MASTER UNIFYING EQUATION.}' },
        { expression: 'A = 40 \\sin \\theta', annotation: '\\text{MODEL SOURCE: Standard trigonometry formula for triangle area given two sides and included angle.}' },
        { expression: '', annotation: '\\text{EXACT vs MEASURED: a and b exact; only } \\theta \\text{ is measured.}' },
        { expression: '\\frac{d}{d\\theta}(\\sin \\theta) = \\cos \\theta', annotation: '\\text{SENSITIVITY of area to small changes in angle (valid only when angle is in radians).}' },
        { expression: 'dA = 40 \\cos \\theta \\, d\\theta', annotation: '\\text{Differential formed.}' },
        { expression: '\\theta = \\frac{\\pi}{6}, \\quad d\\theta = \\pm \\frac{\\pi}{180}', annotation: '\\text{Radian conversion required for calculus (} 180^\\circ = \\pi \\text{ rad).}' },
        { expression: '', annotation: '\\text{UNIT DEBUGGER: Angle in radians is dimensionless, so area error keeps square-unit consistency.}' },
        { expression: '', annotation: '\\text{AMPLIFIER: Sensitivity depends on } \\cot\\theta \\text{ — error is larger at small angles.}' }
      ],
      conclusion: "\\text{Using the master law: area = } 20 \\pm 0.6\\text{. Angle measurement error is amplified or damped depending on the angle size.}",
    },
    {
      id: 'ch3-070-ex5',
      title: 'Differential of a Logarithm',
      problem: "\\text{Use differentials to estimate } \\ln(1.05).",
      steps: [
        { expression: '', annotation: '\\text{REGISTRY: } f(x) = \\ln(x) \\text{ (natural log), } a=1 \\text{ (exact point where } \\ln(1)=0\\text{), } dx=0.05 \\text{ (small change), } dy \\text{ (change in ln value).}' },
        { expression: '\\Delta f \\approx f\'(x) \\, \\Delta x', annotation: '\\text{MASTER UNIFYING EQUATION.}' },
        { expression: 'f(x) = \\ln(x)', annotation: '\\text{MODEL SOURCE: Natural logarithm function (inverse of exponential).}' },
        { expression: '', annotation: '\\text{EXACT vs MEASURED: Base point a=1 is exact; we have small dx = 0.05.}' },
        { expression: '\\frac{d}{dx} \\ln(x) = \\frac{1}{x}', annotation: '\\text{SENSITIVITY of the natural log function.}' },
        { expression: 'f(x + dx) \\approx f(x) + f\'(x) \\, dx', annotation: '\\text{LINEARIZATION (first-order approximation).}' },
        { expression: 'dy = 1 \\times 0.05 = 0.05', annotation: '\\text{Apply master law at x=1.}' },
        { expression: '\\ln(1.05) \\approx 0 + 0.05 = 0.05', annotation: '\\text{Final estimate.}' },
        { expression: '\\ln(1 + x) \\approx x', annotation: '\\text{AMPLIFIER / GENERALIZATION: For small x, this linear approximation becomes the classic rule } \\ln(1+x) \\approx x \\text{.}' },
        { expression: '', annotation: '\\text{VALIDITY: dx = 0.05 is small, so higher-order terms are negligible.}' }
      ],
      conclusion: "\\text{Using the master law we recover the useful small-x approximation } \\ln(1+x) \\approx x \\text{ with good accuracy.}",
    }
  ],

  story: {
    title: 'The Measurement Error',
    subtitle: 'A spherical tank has a radius measured to ±0.05 m. How wrong is the calculated volume? Differentials turn this engineering question into a calculus problem — and the answer reveals a pattern that appears in every science.',
    acts: [
      {
        label: 'The Scene',
        title: 'A Tank, a Ruler, and an Uncertainty',
        content: `An engineer measures the radius of a spherical storage tank and gets $r = 10$ meters, with a measurement precision of $\\pm 0.05$ meters. (Every physical measurement has uncertainty — no ruler is perfect.)

The volume of a sphere is $V = \\frac{4}{3}\\pi r^3$. The engineer plugs in $r = 10$ and reports $V = \\frac{4}{3}\\pi(1000) \\approx 4188.8$ cubic meters.

But if the actual radius could be anywhere from $9.95$ to $10.05$ meters, how much error is there in the reported volume? Is it 10 cubic meters? 100? 1000?

The engineer cannot recalculate the volume for every possible radius. Instead, they use **differentials** — a tool that turns "how does a small change in input change the output?" into a single multiplication.

The answer will reveal something deeper: for a function $f(x) = x^n$, a small relative error in $x$ produces $n$ times that relative error in $f$. The exponent is an error amplifier. Understanding this protects engineers, chemists, and physicists from misreporting their results.`,
      },
      {
        label: 'Act I',
        title: 'The Function V(r) — Input, Output, and What the Derivative Means',
        content: `Let us be precise about what we are working with.

**The function:**
\\[V(r) = \\frac{4}{3}\\pi r^3\\]

$r$ is the input (the radius, in meters). $V$ is the output (the volume, in cubic meters). This function is a rule: give it any radius, it returns the corresponding sphere volume.

**The domain:** $r > 0$ — radii must be positive.

**What does the derivative $\\frac{dV}{dr}$ mean?**

The derivative is the *instantaneous rate of change* of $V$ with respect to $r$. Specifically: if the radius changes by a tiny amount, $\\frac{dV}{dr}$ tells you how many cubic meters of volume change occur per meter of radius change.

**Compute $\\frac{dV}{dr}$ using the Power Rule.**

The Power Rule: $\\dfrac{d}{dr}[r^n] = n r^{n-1}$.

The constant $\\frac{4}{3}\\pi$ is a coefficient — it passes through differentiation unchanged.

Apply:
- $n = 3$
- Bring exponent down: $\\frac{4}{3}\\pi \\cdot 3 \\cdot r^3$
- Reduce exponent: $3 - 1 = 2$

\\[\\frac{dV}{dr} = \\frac{4}{3}\\pi \\cdot 3 r^2 = 4\\pi r^2\\]

Notice: $4\\pi r^2$ is the **surface area** of a sphere. This makes geometric sense — adding a thin shell of thickness $dr$ to a sphere adds volume $\\approx \\text{surface area} \\times dr$.

At $r = 10$: $\\dfrac{dV}{dr}\\bigg|_{r=10} = 4\\pi(100) = 400\\pi \\approx 1256.6 \\text{ m}^2$.`,
      },
      {
        label: 'Act II',
        title: 'Linear Approximation for Changes — From ΔV to dV',
        content: `We know $V(r) = \\frac{4}{3}\\pi r^3$ and $V'(r) = 4\\pi r^2$. Now we use linear approximation to estimate how much $V$ changes when $r$ changes by a small amount.

**Linear approximation:**

For any differentiable function $f$, a small change $\\Delta x$ in the input produces a change $\\Delta y$ in the output of approximately:
\\[\\Delta y \\approx f'(x) \\cdot \\Delta x\\]

This is the tangent line approximation: the actual change follows the curve, but for small $\\Delta x$, the curve and the tangent line are nearly identical.

**Apply to our problem:**

- Function: $V(r) = \\frac{4}{3}\\pi r^3$
- Derivative: $V'(r) = 4\\pi r^2$
- Input change: $\\Delta r = \\pm 0.05$ meters
- Approximate output change: $\\Delta V \\approx V'(r) \\cdot \\Delta r$

At $r = 10$:
\\[\\Delta V \\approx 4\\pi(10)^2 \\cdot (0.05) = 400\\pi \\cdot 0.05 = 20\\pi \\approx 62.8 \\text{ m}^3\\]

A $\\pm 0.05$ meter error in radius produces approximately $\\pm 62.8$ cubic meters of error in volume.

**Verification:** Exact values: $V(10.05) = \\frac{4}{3}\\pi(10.05)^3 \\approx 4252.0$ m³, $V(10) \\approx 4188.8$ m³. Actual $\\Delta V \\approx 63.2$ m³. Our approximation $62.8$ m³ is accurate to within 1%.`,
      },
      {
        label: 'Act III',
        title: 'The Differential — Formal Names for the Pieces',
        content: `The linear approximation $\\Delta y \\approx f'(x) \\cdot \\Delta x$ is so useful that mathematicians give its pieces formal names.

**Definition of $dx$:** an **independent variable** representing an arbitrary (small) change in $x$. Unlike $\\Delta x$ (which is a specific measured change), $dx$ is a variable you can set to any value.

**Definition of $dy$:** the **differential** of $y$, defined as:
\\[dy = f'(x) \\, dx\\]

$dy$ is the change in $y$ along the **tangent line** — not along the actual curve. When $dx$ is small, the tangent line and the curve stay close, so $dy \\approx \\Delta y$.

**For our sphere:** with $y = V$ and $x = r$:
\\[dV = V'(r) \\, dr = 4\\pi r^2 \\, dr\\]

Plug in $r = 10$ and $dr = 0.05$:
\\[dV = 4\\pi(100)(0.05) = 20\\pi \\approx 62.8 \\text{ m}^3\\]

**Why Leibniz notation is so powerful:**

Notice that $\\frac{dV}{dr} = 4\\pi r^2$. Multiply both sides by $dr$:
\\[dV = 4\\pi r^2 \\, dr\\]

This algebraic manipulation — treating $\\frac{dV}{dr}$ like a fraction and "multiplying by $dr$" — is precisely valid in differential notation. Differentials are designed so that this manipulation works. This is the same reason the Chain Rule looks like a fraction cancellation: $\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}$.`,
      },
      {
        label: 'Act IV',
        title: 'Relative Error — Why the Exponent Is an Amplifier',
        content: `**Absolute error** is the size of the uncertainty: $|dV| \\approx 62.8$ m³.

**Relative error** (also called fractional or percentage error) compares the error to the quantity itself:
\\[\\text{relative error in } V = \\frac{|dV|}{V}\\]

At $r = 10$:
\\[V = \\frac{4}{3}\\pi(1000) = \\frac{4000\\pi}{3}\\]

\\[\\frac{|dV|}{V} = \\frac{4\\pi r^2 \\, |dr|}{\\frac{4}{3}\\pi r^3} = \\frac{4\\pi r^2}{\\frac{4}{3}\\pi r^3} \\cdot |dr| = \\frac{3}{r} \\cdot |dr|\\]

Simplify: $\\dfrac{|dV|}{V} = 3 \\cdot \\dfrac{|dr|}{r}$.

This says: the relative error in $V$ is **3 times** the relative error in $r$.

In our case: $\\dfrac{|dr|}{r} = \\dfrac{0.05}{10} = 0.5\\%$.

So $\\dfrac{|dV|}{V} = 3 \\times 0.5\\% = 1.5\\%$.

**Why the factor 3?** It is the exponent in $V \\propto r^3$.

**The general rule:** for $y = x^n$:
\\[\\frac{dy}{y} = \\frac{nx^{n-1} \\, dx}{x^n} = n \\cdot \\frac{dx}{x}\\]

The relative error in $x^n$ equals $n$ times the relative error in $x$. The exponent amplifies errors.

- Square root ($n = \\frac{1}{2}$): a 2% error in $x$ gives a 1% error in $\\sqrt{x}$. Halved.
- Square ($n = 2$): a 1% error in $x$ gives a 2% error in $x^2$. Doubled.
- Cube ($n = 3$): a 1% error in $x$ gives a 3% error in $x^3$. Tripled.

**The 5-second shortcut: logarithmic differentiation.**

Instead of differentiating $V = \\frac{4}{3}\\pi r^3$ and then dividing by $V$, take the natural log of both sides first:
\\[\\ln V = \\ln\\!\\left(\\frac{4}{3}\\pi\\right) + 3\\ln r\\]

Now differentiate both sides. The derivative of $\\ln V$ with respect to $r$ is $\\frac{1}{V}\\frac{dV}{dr}$, which in differential form is $\\frac{dV}{V}$. The constant $\\ln(\\frac{4}{3}\\pi)$ vanishes. The term $3\\ln r$ differentiates to $\\frac{3\\,dr}{r}$:
\\[\\frac{dV}{V} = 3 \\cdot \\frac{dr}{r}\\]

Done — in one line, no substitution required. The exponent 3 falls straight out of the logarithm.

This trick works for any product, quotient, or power. When your formula looks like $y = \\frac{x^a \\cdot z^b}{w^c}$, taking the log converts it to $\\ln y = a\\ln x + b\\ln z - c\\ln w$, and differentiating gives $\\frac{dy}{y} = a\\frac{dx}{x} + b\\frac{dz}{z} - c\\frac{dw}{w}$. Relative errors read off instantly from the exponents — no algebra required.`,
      },
      {
        label: 'Act V',
        title: 'Adding Multiple Errors — The Total Differential',
        content: `What if a computed quantity depends on multiple measurements, each with its own error?

**Example:** The area of a rectangle is $A = xy$ where both $x$ and $y$ are measured with errors $dx$ and $dy$.

When a function depends on multiple variables, the **total differential** is:
\\[dA = \\frac{\\partial A}{\\partial x} \\, dx + \\frac{\\partial A}{\\partial y} \\, dy\\]

where $\\frac{\\partial A}{\\partial x}$ means "the partial derivative of $A$ with respect to $x$" — differentiate $A$ treating $y$ as a constant.

For $A = xy$:
- $\\frac{\\partial A}{\\partial x} = y$ (treat $y$ as constant, differentiate $xy$ with respect to $x$)
- $\\frac{\\partial A}{\\partial y} = x$ (treat $x$ as constant, differentiate $xy$ with respect to $y$)

Total differential:
\\[dA = y \\, dx + x \\, dy\\]

**Worst-case error** (errors add, not cancel):
\\[|dA| \\leq |y| \\cdot |dx| + |x| \\cdot |dy|\\]

**Relative error:**
\\[\\frac{|dA|}{A} = \\frac{|y| \\cdot |dx| + |x| \\cdot |dy|}{xy} = \\frac{|dx|}{x} + \\frac{|dy|}{y}\\]

The relative error in a product is the **sum** of the individual relative errors. Multiply two quantities, and their percentage errors add. This is why scientists work hard to reduce errors in every measurement — they accumulate.

**Connection to integration:** so far we have used $dV = 4\\pi r^2 \\, dr$ as an error estimate — a single small slice. But notice what it is geometrically: a thin spherical shell of surface area $4\\pi r^2$ and thickness $dr$. If you start at $r = 0$ and keep adding shells outward, each of thickness $dr$, you eventually build the entire sphere. **Integration is exactly that process — adding up infinitely many $dV$'s.** Each $dV = 4\\pi r^2 \\, dr$ is one shell; summing all shells from $r = 0$ to $r = R$ gives the total volume:
\\[\\int_0^R 4\\pi r^2 \\, dr = \\frac{4}{3}\\pi R^3\\]

The $dr$ inside the integral is the same $dr$ from the differential — it is the thickness of each infinitesimal slice, not decoration. The differential $dV$ is the building block; integration assembles the whole.`,
      },
    ],
    resolution: `**The differential formula and procedure:**

For $y = f(x)$: define $dy = f'(x) \\, dx$.

**To estimate error propagation:**
1. **Identify the function** $y = f(x)$ connecting input measurement to output quantity.
2. **Differentiate** using Power Rule, Chain Rule, etc. to get $f'(x)$.
3. **Write the differential:** $dy = f'(x) \\, dx$.
4. **Substitute** the known value of $x$ and the measurement uncertainty $dx = \\pm \\delta x$.
5. **Compute $|dy|$** — this is the approximate absolute error in $y$.
6. **Compute $|dy|/|y|$** — this is the approximate relative (percentage) error in $y$.

**The exponent amplification rule:** for $y = cx^n$, the relative error in $y$ is $|n|$ times the relative error in $x$:
\\[\\frac{|dy|}{|y|} = |n| \\cdot \\frac{|dx|}{|x|}\\]

**The bridge to integration:** the equation $dy = f'(x)\\,dx$ says that the total change in $y$ from $a$ to $b$ is the accumulated sum of all the tiny changes $f'(x)\\,dx$. Summing infinitely many of these gives the integral $\\int_a^b f'(x)\\,dx = f(b) - f(a)$ — the Fundamental Theorem of Calculus. The $dx$ in the integral symbol is the same $dx$ as in the differential. It is not decoration — it is the width of an infinitesimal slice.`,
  },

  challenges: [
    {
      id: 'ch3-070-ch1',
      difficulty: 'hard',
      problem: "The resistance of a wire is $R = \\rho L / A$ where $\\rho$ is resistivity (exact), $L = 2.00 \\pm 0.02$ m (length), and $A = 0.50 \\pm 0.01$ mm$^2$ (cross-section area). Find the maximum relative error in $R$.",
      hint: 'The "Logarithmic Differentiation" trick is the fastest way here. It turns a product/quotient problem into a sum/difference problem, which is exactly how relative errors combine. Just remember to use absolute values for the worst-case scenario.',
      walkthrough: [
        { expression: '\\ln R = \\ln \\rho + \\ln L - \\ln A', annotation: 'Take the log of $R = \\rho L / A$.' },
        { expression: '\\frac{dR}{R} = \\frac{dL}{L} - \\frac{dA}{A}', annotation: 'Differentiate. Since $\\rho$ is exact, $d(\\ln \\rho) = 0$.' },
        { expression: '\\left|\\frac{dR}{R}\\right| \\leq \\left|\\frac{dL}{L}\\right| + \\left|\\frac{dA}{A}\\right| = \\frac{0.02}{2.00} + \\frac{0.01}{0.50} = 0.01 + 0.02 = 0.03', annotation: 'Worst case: errors add. Relative error in $L$ is 1\\%, in $A$ is 2\\%.' },
        { expression: '\\text{Maximum relative error in } R \\text{ is } 3\\%', annotation: 'The area measurement contributes twice as much relative error as the length measurement.' },
      ],
      answer: '\\text{Maximum relative error in } R \\text{ is } 3\\% \\text{ (1\\% from } L \\text{, 2\\% from } A\\text{).}',
    },
    {
      id: 'ch3-070-ch2',
      difficulty: 'medium',
      problem: 'Use differentials to estimate $\\cos(61°)$.',
      hint: 'Use $a = 60° = \\pi/3$ (where $\\cos(60°) = 1/2$) and $dx = 1° = \\pi/180$ rad.',
      walkthrough: [
        { expression: 'f(x) = \\cos(x), \\quad a = \\pi/3, \\quad dx = \\pi/180', annotation: 'Set up with the nearest angle where cosine is known exactly.' },
        { expression: 'dy = -\\sin(a)\\,dx = -\\sin(\\pi/3) \\cdot \\frac{\\pi}{180} = -\\frac{\\sqrt{3}}{2} \\cdot \\frac{\\pi}{180}', annotation: 'Compute the differential.' },
        { expression: 'dy \\approx -0.8660 \\cdot 0.01745 \\approx -0.01511', annotation: 'Numerical value of the differential.' },
        { expression: '\\cos(61°) \\approx \\cos(60°) + dy = 0.5 - 0.01511 = 0.48489', annotation: 'Add to the known value.' },
        { expression: '\\text{Actual: } \\cos(61°) = 0.48481..., \\quad \\text{Error} \\approx 0.00008', annotation: 'Excellent agreement.' },
      ],
      answer: '\\cos(61°) \\approx 0.4849',
    },
    {
      id: 'ch3-070-ch3',
      difficulty: 'medium',
      problem: "A cube's edge is measured as $s = 5.00 \\pm 0.03$ cm. Find the absolute and relative errors in the surface area $A = 6s^2$ and volume $V = s^3$.",
      hint: 'The power rule is your "magnifying glass." If the quantity depends on s^n, any small error in s is magnified by the factor n. For a cube, the area (s²) magnifies error by 2, and the volume (s³) magnifies it by 3.',
      walkthrough: [
        { expression: 'dA = 12s\\,ds = 12(5)(\\pm 0.03) = \\pm 1.8 \\text{ cm}^2', annotation: 'Absolute error in surface area. $A = 6(25) = 150$ cm$^2$.' },
        { expression: '\\frac{|dA|}{A} = 2 \\cdot \\frac{|ds|}{s} = 2 \\cdot \\frac{0.03}{5} = 1.2\\%', annotation: 'Relative error in area: 2 times the relative error in $s$ (since $A \\propto s^2$).' },
        { expression: 'dV = 3s^2\\,ds = 3(25)(\\pm 0.03) = \\pm 2.25 \\text{ cm}^3', annotation: 'Absolute error in volume. $V = 125$ cm$^3$.' },
        { expression: '\\frac{|dV|}{V} = 3 \\cdot \\frac{|ds|}{s} = 3 \\cdot \\frac{0.03}{5} = 1.8\\%', annotation: 'Relative error in volume: 3 times the relative error in $s$ (since $V \\propto s^3$).' },
      ],
      answer: 'A = 150 \\pm 1.8 \\text{ cm}^2 \\;(1.2\\%), \\quad V = 125 \\pm 2.25 \\text{ cm}^3 \\;(1.8\\%).',
    },
  ],

  crossRefs: [
    { lessonSlug: 'linear-approximation', label: 'Linear Approximation', context: 'Differentials are linear approximation reframed: $f(a + dx) \\approx f(a) + dy$ where $dy = f\'(a)\\,dx$.' },
    { lessonSlug: 'newtons-method', label: "Newton's Method", context: "Newton's Method uses the differential $dy = f'(x_n)\\,dx$ to estimate how far the root is from the current guess." },
    { lessonSlug: 'area-accumulation', label: 'Area and Accumulation', context: 'The differential $dy = f\'(x)\\,dx$ motivates integration: summing infinitesimal changes recovers the total change via the Fundamental Theorem.' },
    { lessonSlug: 'related-rates', label: 'Related Rates', context: 'Related rates uses $dy = f\'(x)\\,dx$ with $dx$ replaced by $dx/dt \\cdot dt$, connecting differentials to rates of change in time.' },
  ],

  checkpoints: [
    'read-intuition',
    'read-math',
    'read-rigor',
    'completed-example-1',
    'completed-example-2',
    'completed-example-3',
    'completed-example-4',
    'completed-example-5',
    'attempted-challenge-hard',
    'attempted-challenge-medium-1',
    'attempted-challenge-medium-2',
  ],

  quiz: [
    {
      id: 'diff-q1',
      type: 'choice',
      text: 'The differential $dy = f\'(x)\\,dx$ represents:',
      options: [
        'The actual change in $f$ when $x$ increases by $dx$',
        'The change in $f$ along the tangent line when $x$ increases by $dx$',
        'The derivative $f\'(x)$ evaluated at $dx$',
        'The second derivative of $f$',
      ],
      answer: 'The change in $f$ along the tangent line when $x$ increases by $dx$',
      hints: [
        '$\\Delta y$ is the actual change along the curve; $dy$ is the change along the tangent line. They are equal only in the limit as $dx \\to 0$.',
      ],
      reviewSection: 'Intuition — What $dy$ and $\\Delta y$ mean',
    },
    {
      id: 'diff-q2',
      type: 'input',
      text: 'For $y = x^4$, compute the differential $dy$. Then evaluate $dy$ at $x = 2$ with $dx = 0.1$. Enter the value.',
      answer: '3.2',
      hints: [
        '$dy = 4x^3\\,dx$. At $x=2$, $dx=0.1$: $dy = 4(8)(0.1) = 3.2$.',
      ],
      reviewSection: 'Math — Computing differentials',
    },
    {
      id: 'diff-q3',
      type: 'input',
      text: 'For $y = \\sin x$, find $dy$. Evaluate at $x = 0$, $dx = 0.1$. Enter the value.',
      answer: '0.1',
      hints: [
        '$dy = \\cos x\\,dx$. At $x=0$: $dy = \\cos(0)(0.1) = 1 \\cdot 0.1 = 0.1$.',
      ],
      reviewSection: 'Math — Differentials of standard functions',
    },
    {
      id: 'diff-q4',
      type: 'input',
      text: 'A sphere has radius $r = 10$ m measured with error $\\pm 0.05$ m. Using $dV = 4\\pi r^2\\,dr$ with $dr = 0.05$, estimate the absolute error in volume. Enter the value (as a multiple of $\\pi$).',
      answer: '20*pi',
      hints: [
        '$dV = 4\\pi(100)(0.05) = 20\\pi$ m³.',
      ],
      reviewSection: 'Hook — Volume error for a sphere',
    },
    {
      id: 'diff-q5',
      type: 'input',
      text: 'For $y = \\ln x$, compute $dy$ at $x = 1$, $dx = 0.2$. Enter the value.',
      answer: '0.2',
      hints: [
        '$dy = \\frac{1}{x}\\,dx$. At $x = 1$: $dy = (1)(0.2) = 0.2$.',
      ],
      reviewSection: 'Math — Differential of $\\ln x$',
    },
    {
      id: 'diff-q6',
      type: 'input',
      text: 'For $y = x^n$, the relative error $\\frac{|dy|}{|y|}$ equals $n \\cdot \\frac{|dx|}{|x|}$. If $x = 5$ m is measured with a 2% relative error, what is the relative error (as a percentage) in $y = x^3$?',
      answer: '6',
      hints: [
        'Relative error in $x^3$ is $3 \\times 2\\% = 6\\%$.',
      ],
      reviewSection: 'Intuition — Relative error rule for powers',
    },
    {
      id: 'diff-q7',
      type: 'choice',
      text: 'The error in the differential approximation $\\Delta y \\approx dy$ is approximately:',
      options: [
        '$f\'(x) \\cdot dx$',
        '$\\frac{1}{2}f\'\'(x)(dx)^2$',
        '$f\'\'(x) \\cdot dx$',
        'Exactly zero for all $dx$',
      ],
      answer: '$\\frac{1}{2}f\'\'(x)(dx)^2$',
      hints: [
        'By Taylor\'s theorem: $\\Delta y - dy = \\frac{1}{2}f\'\'(\\xi)(dx)^2$. The error is second-order in $dx$.',
      ],
      reviewSection: 'Warning — Differentials are approximations',
    },
    {
      id: 'diff-q8',
      type: 'input',
      text: 'Use the differential to estimate $\\sqrt{16.4}$ (instead of $\\sqrt{16}$). Let $f(x) = \\sqrt{x}$, $a = 16$, $dx = 0.4$. Compute $dy = f\'(16) \\cdot 0.4$. Enter the approximate value of $\\sqrt{16.4}$.',
      answer: '4.05',
      hints: [
        "$f'(x) = \\frac{1}{2\\sqrt{x}}$, so $f'(16) = \\frac{1}{8}$. $dy = \\frac{1}{8}(0.4) = 0.05$.",
        '$\\sqrt{16.4} \\approx 4 + 0.05 = 4.05$.',
      ],
      reviewSection: 'Intuition — Differential as linear approximation',
    },
    {
      id: 'diff-q9',
      type: 'input',
      text: 'For $y = e^x$ at $x = 0$, $dx = 0.1$: compute the differential $dy$ and the actual change $\\Delta y = e^{0.1} - 1 \\approx 0.10517$. What is $dy$?',
      answer: '0.1',
      hints: [
        '$dy = e^x\\,dx$. At $x=0$: $dy = e^0 \\cdot 0.1 = 0.1$.',
        'Compare: $\\Delta y \\approx 0.105$, $dy = 0.1$. The difference $\\approx 0.005$ is of order $(dx)^2$.',
      ],
      reviewSection: 'Warning — $dy \\ne \\Delta y$',
    },
    {
      id: 'diff-q10',
      type: 'input',
      text: 'The side of a cube is measured as $s = 4$ cm with error $\\pm 0.02$ cm. Volume $V = s^3$. Compute $dV = 3s^2\\,ds$ with $s=4$, $ds=0.02$. Enter the estimated error in volume (cm³).',
      answer: '0.96',
      hints: [
        '$dV = 3(16)(0.02) = 0.96$ cm³.',
      ],
      reviewSection: 'Math — Error propagation for a cube',
    },
  ],

  spiral: {
    recoveryPoints: [
      { label: 'Linear Approximation (Lesson 2)', note: 'Differentials are linear approximation in disguise: dy = f\'(x)dx is just Δy ≈ f\'(a)Δx with new notation' },
      { label: 'Leibniz Notation (Ch. 2)', note: "The dy/dx notation you've been using IS a ratio of differentials — dx is an infinitesimal change in x, dy = f'(x)dx is the resulting change in y along the tangent" },
      { label: 'Chain Rule (Ch. 2)', note: 'The chain rule dy/du · du/dx = dy/dx literally cancels differentials — this is why Leibniz notation was designed the way it was' },
    ],
    futureLinks: [
      { label: 'Substitution Rule (Ch. 4)', note: 'In integration, the substitution u = g(x) uses du = g\'(x)dx — this is exactly the differential formalism you are learning now' },
      { label: 'Error Propagation', note: 'In physics and engineering, differential notation encodes how measurement uncertainty propagates: if you measure r with error dr, then volume error dV = 4πr²dr' },
      { label: 'Line Integrals (Multivariable)', note: 'The total differential df = (∂f/∂x)dx + (∂f/∂y)dy generalizes to multiple variables — the same structure, more dimensions' },
    ],
  },
}
