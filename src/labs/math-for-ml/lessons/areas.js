// Volumes under surfaces, placed before the normal distribution in the probability part: double
// integrals, joint densities, polar coordinates, and the Gaussian integral ∫e^(−x²/2) dx = √(2π).
import { doubleIntegral, ringSum } from '../engine/maths.js'
import { f } from './util.js'

export const AREAS = [
  {
    id: 'double-integrals', title: 'Double integrals: volume under a surface',
    goal: 'Read $\\iint_R f(x, y)\\,dA$ as a sum of thin columns, compute it as an integral of an integral, use it for joint probabilities, and add up a round region in rings with $dA = r\\,dr\\,d\\theta$.',
    builds: ['densities', 'fundamental-theorem', 'dot-product'],
    blocks: [
      { md: `A single integral adds up thin strips under a curve. A **double integral** adds up thin **columns** under a surface $z = f(x, y)$. Chop the region $R$ of the floor into small rectangles of size $\\Delta x \\times \\Delta y$; over each, stand a column as tall as $f$ at its centre. The volume is about $\\sum f(x_i, y_j)\\,\\Delta x\\,\\Delta y$, and in the limit

$$\\iint_R f(x, y)\\,dA \\;=\\; \\lim \\sum_{i}\\sum_{j} f(x_i, y_j)\\,\\Delta x\\,\\Delta y$$

$dA$ is "a tiny piece of floor area".

**Computing one: an integral of an integral.** On a rectangle $a \\le x \\le b$, $c \\le y \\le d$, group the columns by their $x$: for each fixed $x$, add up the column heights along $y$, then add those totals along $x$:

$$\\iint_R f\\,dA = \\int_a^b\\left(\\int_c^d f(x, y)\\,dy\\right)dx$$

For the finite sums this regrouping is exact: a finite sum can be added in any order. That the limits agree too, and that you may integrate in either order, is *Fubini's theorem*, which holds for continuous $f$ on a rectangle (taken on trust; the grid code below is the evidence). Example: $\\iint (xy + 1)\\,dA$ over $[0, 1] \\times [0, 2]$: inner $\\int_0^2 (xy + 1)\\,dy = 2x + 2$, outer $\\int_0^1 (2x + 2)\\,dx = 3$.

**Joint densities.** Two random quantities $X, Y$ together have a **joint density** $p(x, y)$, and probabilities are volumes: $P((X, Y) \\in R) = \\iint_R p\\,dA$, with total volume 1. If they are **independent**, $p(x, y) = p_X(x)\\,p_Y(y)$, and then the double integral factors. For the column sums, $\\sum_i\\sum_j a_i b_j\\,\\Delta x\\,\\Delta y = \\big(\\sum_i a_i\\Delta x\\big)\\big(\\sum_j b_j\\Delta y\\big)$, just as $(a_1 + a_2)(b_1 + b_2)$ multiplies out to every $a_ib_j$; in the limit: $\\iint p_X(x)p_Y(y)\\,dA = \\left(\\int p_X\\right)\\left(\\int p_Y\\right)$.

**Round regions: polar coordinates.** A point can be described by its distance $r$ from the origin and its angle $\\theta$ instead of $(x, y)$: $x = r\\cos\\theta$, $y = r\\sin\\theta$ (lesson [[#dot-product]]'s walk of length $r$ at angle $\\theta$). Measure angles in **radians**: the length of arc the angle cuts from a circle of radius 1. A full turn is the whole circumference, $2\\pi$; on a circle of radius $r$ every length scales by $r$, so an angle $\\Delta\\theta$ cuts an arc of length $r\\,\\Delta\\theta$.

Now chop the floor into pieces between two circles ($r$ and $r + \\Delta r$) and two rays ($\\theta$ and $\\theta + \\Delta\\theta$). Each piece is nearly a rectangle, $\\Delta r$ deep and $r\\,\\Delta\\theta$ long (its arc), so its area is about $r\\,\\Delta r\\,\\Delta\\theta$:

$$dA = r\\,dr\\,d\\theta$$

The extra $r$ matters: pieces far from the centre are bigger. A whole thin **ring** at distance $r$ has area about $2\\pi r\\,\\Delta r$ (circumference times width). So for a function of distance alone, $g(r)$, the volume is $\\int_0^\\infty g(r)\\,2\\pi r\\,dr$. Check: the disc of radius 1 ($g = 1$) has area $\\int_0^1 2\\pi r\\,dr = \\pi$. ✓` },
      { figure: 'DoubleIntegralFig', caption: 'Columns under a surface, seen from above (darker = taller). Refine the grid and the total closes in on the volume. Switch to rings: the same surface added up circle by circle.' },
      {
        code: {
          file: 'stats.py', fn: 'double_integral', notes: [
            ['def double_integral(f, ax, bx, ay, by, n=100):', ['A function of two numbers and a rectangle $[a_x, b_x] \\times [a_y, b_y]$.']],
            ['wx = (bx - ax) / n', ['$\\Delta x$.']],
            ['wy = (by - ay) / n', ['$\\Delta y$.']],
            ['total = 0.0', ['Running total of column volumes.']],
            ['for i in range(n):', ['Each column of the grid along $x$…']],
            ['for j in range(n):', ['…and along $y$: $n^2$ columns.']],
            ['total += f(ax + (i + 0.5) * wx, ay + (j + 0.5) * wy) * wx * wy', ['Height at the centre times base area: one column.'], { tex: '\\sum_i\\sum_j f(x_i, y_j)\\,\\Delta x\\,\\Delta y' }],
            ['return total', ['$\\approx \\iint_R f\\,dA$.']],
          ],
        },
      },
      {
        code: {
          file: 'stats.py', fn: 'ring_sum', notes: [
            ['def ring_sum(g, r_max, n=2000):', ['A function of the distance $r$ alone, added over the disc of radius `r_max`.']],
            ['dr = r_max / n', ['Each ring\'s width.']],
            ['total = 0.0', ['Running total.']],
            ['for i in range(n):', ['Ring by ring, outward.']],
            ['r = (i + 0.5) * dr', ['The ring\'s middle radius.']],
            ['total += g(r) * 2 * math.pi * r * dr', ['Height times ring area $2\\pi r\\,\\Delta r$.'], { tex: '\\iint g\\,dA = \\int_0^{R} g(r)\\,2\\pi r\\,dr' }],
            ['return total', ['The volume.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'What is $\\iint (xy + 1)\\,dA$ over $0 \\le x \\le 1$, $0 \\le y \\le 2$?',
          answer: 3, tolerance: 1e-6, compute: () => doubleIntegral((x, y) => x * y + 1, 0, 1, 0, 2, 50),
          explain: 'Inner: $\\int_0^2(xy + 1)dy = 2x + 2$. Outer: $\\int_0^1(2x + 2)dx = 1 + 2 = 3$. The 50 × 50 grid gives 3 too.',
        },
      },
      {
        predict: {
          prompt: 'Add up the disc of radius 2 in rings ($g = 1$). What is its area? (4 decimals)',
          answer: 4 * Math.PI, tolerance: 0.0006, compute: () => ringSum(() => 1, 2),
          explain: `$\\int_0^2 2\\pi r\\,dr = \\pi r^2\\big|_0^2 = 4\\pi = ${f(4 * Math.PI)}$.`,
        },
      },
      { note: '$\\iint_R f\\,dA$: columns under a surface; computed as an integral of an integral (either order, Fubini). Joint densities give probabilities as volumes; independent ones factor. Polar: $x = r\\cos\\theta$, $y = r\\sin\\theta$, $dA = r\\,dr\\,d\\theta$; a ring has area $2\\pi r\\,dr$.' },
    ],
  },

  {
    id: 'gaussian-integral', title: 'The Gaussian integral: where √(2π) comes from',
    goal: 'Prove $\\int_{-\\infty}^{\\infty} e^{-x^2/2}\\,dx = \\sqrt{2\\pi}$ by squaring it, switching to polar coordinates and substituting.',
    builds: ['double-integrals', 'integration-techniques'],
    blocks: [
      { md: `The bell curve $e^{-x^2/2}$ has no antiderivative made of the usual functions, so the fundamental theorem can't be used directly. Yet its total area is exactly $\\sqrt{2\\pi}$, by a famous trick: compute the **square** of the area, which turns out to be easy.

Call the area $I = \\int_{-\\infty}^{\\infty} e^{-x^2/2}\\,dx$.

**Step 1: square it as a double integral.** Use $y$ as the name in the second copy: $I^2 = \\left(\\int e^{-x^2/2}dx\\right)\\left(\\int e^{-y^2/2}dy\\right)$. Last lesson: a product of two separate integrals is the double integral of the product (the factoring runs both ways). And $e^{-x^2/2}e^{-y^2/2} = e^{-(x^2 + y^2)/2}$ (power rule 1). So

$$I^2 = \\iint_{\\mathbb R^2} e^{-(x^2 + y^2)/2}\\,dA$$

the volume under a round, two-dimensional bell.

**Step 2: polar coordinates.** $x^2 + y^2 = r^2$ (Pythagoras), so the height depends on the distance $r$ alone. Add it up in rings, $dA = 2\\pi r\\,dr$ (last lesson):

$$I^2 = \\int_0^\\infty e^{-r^2/2}\\,2\\pi r\\,dr = 2\\pi\\int_0^\\infty r\\,e^{-r^2/2}\\,dr$$

The extra $r$, which the ring's area supplies, is exactly what was missing in one dimension.

**Step 3: substitution.** Lesson [[#integration-techniques]] found $\\int r\\,e^{-r^2/2}\\,dr = -e^{-r^2/2}$. So $\\int_0^T r\\,e^{-r^2/2}\\,dr = 1 - e^{-T^2/2}$, which tends to 1 as $T$ grows.

So $I^2 = 2\\pi$, and since $I$ is positive, $I = \\sqrt{2\\pi}$. $\\blacksquare$

**What this settles.** The next lesson builds the normal distribution, and this is the constant it needs. With lesson [[#integration-techniques]]'s rescaling, $\\int e^{-(x-\\mu)^2/(2\\sigma^2)}dx = \\sigma\\sqrt{2\\pi}$, so dividing by $\\sigma\\sqrt{2\\pi}$ really makes the area 1; and its integration by parts then shows the variance is exactly $\\sigma^2$. Every piece of the normal distribution's formula is now derived. (The same squaring trick with $e^{-x^2}$ gives $\\sqrt\\pi$, the form some books state.)` },
      { figure: 'GaussianFig', caption: 'Left: the ring contributions $2\\pi r\\,e^{-r^2/2}\\,dr$ as $r$ grows; their total is $2\\pi$. Right: the one-dimensional area $I$ measured with strips, and $I^2$ beside $2\\pi$.' },
      {
        predict: {
          prompt: 'Add up the round bell $e^{-r^2/2}$ in rings out to $r = 10$. What is its volume? (4 decimals)',
          answer: 2 * Math.PI, tolerance: 0.0006, compute: () => ringSum(r => Math.exp(-r * r / 2), 10),
          explain: `$2\\pi = ${f(2 * Math.PI)}$, so $I = \\sqrt{2\\pi} = ${f(Math.sqrt(2 * Math.PI))}$.`,
        },
      },
      {
        predict: {
          prompt: 'The same squaring trick for $\\int e^{-x^2}dx$: the rings give $\\int_0^\\infty e^{-r^2}2\\pi r\\,dr$. What is that? (4 decimals)',
          answer: Math.PI, tolerance: 0.0006, compute: () => ringSum(r => Math.exp(-r * r), 8),
          explain: '$\\pi$ (substitution: $\\int_0^\\infty 2r e^{-r^2}dr = 1$), so $\\int e^{-x^2}dx = \\sqrt\\pi$.',
        },
      },
      {
        choice: {
          prompt: 'Why does squaring help, when $\\int e^{-x^2/2}dx$ itself has no formula for its antiderivative?',
          options: [
            { text: 'In polar coordinates the area element brings a factor $r$, and $r\\,e^{-r^2/2}$ does have an antiderivative', why: 'Yes. That $r$ is exactly the derivative of the inside $-r^2/2$ (up to sign), which is what substitution needs.' },
            { text: 'Squaring makes the numbers smaller', why: 'The point is the shape of the integrand after the change of coordinates.' },
            { text: 'Because $e^{-x^2/2}$ squared is $e^{-x^2}$', why: 'True, but $e^{-x^2}$ has no elementary antiderivative either. The trick uses two **different** variables, $x$ and $y$.' },
          ],
          answer: 0,
        },
      },
      { note: '$I^2 = \\iint e^{-(x^2+y^2)/2}dA = \\int_0^\\infty e^{-r^2/2}\\,2\\pi r\\,dr = 2\\pi$, so $\\int e^{-x^2/2}dx = \\sqrt{2\\pi}$. With rescaling and parts, every constant in $\\mathcal N(\\mu, \\sigma^2)$ is now derived.' },
    ],
  },
]
