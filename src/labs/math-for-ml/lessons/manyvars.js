// Calculus with many inputs and outputs, placed after matrix-gradients in the linear-algebra part:
// the multivariable chain rule, the Jacobian, and the Hessian with second-order Taylor.
import { totalDerivative, jacobian, softmaxJacobian, softmax, hessian, eigen2 } from '../engine/maths.js'
import { f } from './util.js'

export const MANYVARS = [
  {
    id: 'multivariable-chain', title: 'The chain rule with many inputs: add up every path',
    goal: 'Derive $\\frac{df}{dt} = \\frac{\\partial f}{\\partial x}\\frac{dx}{dt} + \\frac{\\partial f}{\\partial y}\\frac{dy}{dt}$, write it as $\\nabla f \\cdot \\mathbf x\'(t)$, and use "sum over paths" on a computation graph where a value is used twice.',
    builds: ['matrix-gradients', 'gradient', 'chain-rule'],
    blocks: [
      { md: `Lesson [[#chain-rule]] handled a single chain: $x \\to u \\to y$. In a network, one quantity often feeds **several** others, and each of those affects the output. How do the rates combine?

Let $f(x, y)$ depend on two inputs that both depend on time: $x(t)$ and $y(t)$. Nudge $t$ by $\\Delta t$. Then $x$ moves by $\\Delta x$ and $y$ by $\\Delta y$, and lesson [[#gradient]]'s step 1 (the tilted-plane picture) says $f$ moves by about

$$\\Delta f \\approx \\frac{\\partial f}{\\partial x}\\Delta x + \\frac{\\partial f}{\\partial y}\\Delta y$$

Divide by $\\Delta t$ and let it shrink: $\\frac{\\Delta x}{\\Delta t} \\to \\frac{dx}{dt}$, $\\frac{\\Delta y}{\\Delta t} \\to \\frac{dy}{dt}$, and the "about" becomes exact in the limit (its error shrinks faster than $\\Delta t$). So

$$\\frac{df}{dt} = \\frac{\\partial f}{\\partial x}\\frac{dx}{dt} + \\frac{\\partial f}{\\partial y}\\frac{dy}{dt} = \\nabla f \\cdot \\mathbf x'(t)$$

where $\\mathbf x(t) = (x(t), y(t))$ is the path and $\\mathbf x'(t)$ its velocity. In words: **the rate along a path is the gradient dotted with the velocity**. Moving along a contour line, $\\nabla f \\cdot \\mathbf x' = 0$: no change, as lesson [[#dot-product]] said.

**Sum over paths.** Draw the computation as a graph: $t$ feeds $x$ and $y$, which both feed $f$. The rule says: for each **path** from $t$ to $f$, multiply the rates along it; then **add** over all paths. That is how backpropagation handles a value used in two places (a weight shared across time steps in a recurrent network, the skip connection of a ResNet, a variable appearing twice in a formula): the gradients arriving from each use are **added**.

Example: $f = u\\,v$ with $u = t^2$ and $v = e^t$. Path through $u$: $\\frac{\\partial f}{\\partial u}\\frac{du}{dt} = v \\cdot 2t$. Path through $v$: $u \\cdot e^t$. Total: $2t e^t + t^2 e^t$, which is the product rule (lesson [[#product-quotient]]), now seen as two paths.` },
      { figure: 'PathFig', caption: 'A path crossing the contour map of $f$. At the marked point: the gradient (orange) and the velocity (teal). The rate of change of $f$ along the path is their dot product; it is zero where the path runs along a contour.' },
      {
        code: {
          file: 'linalg.py', fn: 'total_derivative', notes: [
            ['def total_derivative(grad, path, velocity, t):', ['The gradient of $f$ (a function of a point), the path $\\mathbf x(t)$ and its velocity $\\mathbf x\'(t)$.']],
            ['return dot(grad(path(t)), velocity(t))', ['$\\nabla f(\\mathbf x(t)) \\cdot \\mathbf x\'(t)$: each input\'s partial derivative times how fast that input is moving, added.'], { tex: '\\frac{df}{dt} = \\nabla f \\cdot \\mathbf x\'(t)' }],
          ],
        },
      },
      {
        predict: {
          prompt: '$f(x, y) = x^2 + y^2$ along the path $x = t^2$, $y = 3t$. What is $\\frac{df}{dt}$ at $t = 1.5$?',
          answer: totalDerivative(p => [2 * p[0], 2 * p[1]], t => [t * t, 3 * t], t => [2 * t, 3], 1.5), tolerance: 1e-9,
          compute: () => totalDerivative(p => [2 * p[0], 2 * p[1]], t => [t * t, 3 * t], t => [2 * t, 3], 1.5),
          explain: 'At $t = 1.5$: the point is $(2.25, 4.5)$, $\\nabla f = (4.5, 9)$, velocity $(3, 3)$. Dot product: $13.5 + 27 = 40.5$. (Check: $f = t^4 + 9t^2$, $f\' = 4t^3 + 18t = 13.5 + 27$.)',
        },
      },
      {
        choice: {
          prompt: 'A weight $w$ is used twice: $L = (w x_1 - y_1)^2 + (w x_2 - y_2)^2$. How does backpropagation get $\\frac{\\partial L}{\\partial w}$?',
          options: [
            { text: 'It computes the gradient through each use and adds them', why: 'Yes: two paths from $w$ to $L$, so two terms, $2(wx_1 - y_1)x_1 + 2(wx_2 - y_2)x_2$, added.' },
            { text: 'It averages the two gradients', why: 'Paths add. (A loss defined as an average has its own $\\frac1n$, but that is part of the formula, not the rule.)' },
            { text: 'It keeps only the larger one', why: 'Every path contributes.' },
          ],
          answer: 0,
        },
      },
      { note: 'Many inputs: $\\frac{df}{dt} = \\sum_i \\frac{\\partial f}{\\partial x_i}\\frac{dx_i}{dt} = \\nabla f\\cdot\\mathbf x\'(t)$. On a computation graph, multiply along each path and add over paths: a value used twice gets the sum of both gradients.' },
    ],
  },

  {
    id: 'jacobian', title: 'The Jacobian: the derivative of a vector function',
    goal: 'Build the Jacobian $J_{ij} = \\frac{\\partial f_i}{\\partial x_j}$, use it as the best linear approximation, show the chain rule becomes matrix multiplication, and derive the Jacobians of a layer, an activation and softmax.',
    builds: ['multivariable-chain', 'matrix-multiplication'],
    blocks: [
      { md: `A layer of a network takes a vector in and gives a vector out: $\\mathbf f: \\mathbb R^n \\to \\mathbb R^m$. Each of its $m$ outputs has a partial derivative with respect to each of its $n$ inputs. Arrange them in a table, one row per output:

$$J = \\begin{pmatrix} \\frac{\\partial f_1}{\\partial x_1} & \\cdots & \\frac{\\partial f_1}{\\partial x_n} \\\\ \\vdots & & \\vdots \\\\ \\frac{\\partial f_m}{\\partial x_1} & \\cdots & \\frac{\\partial f_m}{\\partial x_n}\\end{pmatrix}, \\qquad J_{ij} = \\frac{\\partial f_i}{\\partial x_j}$$

the **Jacobian**, an $m \\times n$ matrix. Row $i$ is output $i$'s gradient. Applying lesson [[#gradient]]'s tilted-plane step to each output separately gives

$$\\mathbf f(\\mathbf x + \\boldsymbol\\Delta) \\approx \\mathbf f(\\mathbf x) + J\\,\\boldsymbol\\Delta$$

Near a point, every smooth vector function **acts like a matrix** (plus a shift). That matrix is its Jacobian.

**The chain rule becomes matrix multiplication.** For $\\mathbf h(\\mathbf x) = \\mathbf f(\\mathbf g(\\mathbf x))$, the last lesson's sum over paths says $\\frac{\\partial h_i}{\\partial x_j} = \\sum_k \\frac{\\partial f_i}{\\partial g_k}\\frac{\\partial g_k}{\\partial x_j}$: row $i$ of $J_f$ times column $j$ of $J_g$. That is exactly the multiplication rule of lesson [[#matrix-multiplication]]:

$$J_{\\mathbf f \\circ \\mathbf g} = J_{\\mathbf f}\\big(\\mathbf g(\\mathbf x)\\big)\\; J_{\\mathbf g}(\\mathbf x)$$

A deep network is a long composition, so its Jacobian is a long product of matrices.

**Three Jacobians every network uses.**
- **A linear layer** $W\\mathbf x + \\mathbf b$: output $i$ is $\\sum_j W_{ij}x_j + b_i$, whose partial with respect to $x_j$ is $W_{ij}$. So $J = W$. A matrix's Jacobian is itself.
- **An elementwise activation** $\\sigma(\\mathbf z)$: output $i$ depends only on $z_i$, so $J$ is **diagonal**, with $\\sigma'(z_i)$ down the diagonal.
- **Softmax** (which Part [[#part:part5]] uses to turn scores into probabilities): $p_i = e^{z_i}/S$ with $S = \\sum_k e^{z_k}$. Quotient rule for $\\frac{\\partial p_i}{\\partial z_j}$: the top's derivative is $e^{z_i}$ if $j = i$ and 0 otherwise, written $\\mathbb 1[i = j]\\,e^{z_i}$; the bottom's is $e^{z_j}$. So $\\frac{\\partial p_i}{\\partial z_j} = \\frac{\\mathbb 1[i=j]\\,e^{z_i}S - e^{z_i}e^{z_j}}{S^2} = p_i(\\mathbb 1[i = j] - p_j)$. As a matrix, $J = \\mathrm{diag}(\\mathbf p) - \\mathbf p\\mathbf p^\\top$.

**Backpropagation is "row vector times Jacobian", from the end.** The loss is one number, so its gradient with respect to a layer's output is a vector $\\mathbf g$. Its gradient with respect to the layer's **input** is $J^\\top\\mathbf g$ (each input collects every output's gradient, weighted by how much it moved that output). For a linear layer that is $W^\\top\\mathbf g$; for the activation, multiplying by a diagonal matrix is elementwise, $\\odot\\,\\sigma'(\\mathbf z)$. Together: lesson [[#backpropagation]]'s $\\boldsymbol\\delta = (W^\\top\\boldsymbol\\delta') \\odot \\sigma'(\\mathbf z)$, now derived. For softmax followed by cross-entropy, with $\\mathbf g = -y_c/p_c$ in slot $c$ (zero elsewhere), $J^\\top\\mathbf g$ works out to $\\mathbf p - \\mathbf y$, lesson [[#softmax]]'s result.

**Its determinant** says how the function scales areas locally (lesson [[#inverse]]: $|\\det|$ is area scaling). That fact is the heart of "change of variables" for densities and of normalising flows.` },
      { figure: 'JacobianFig', caption: 'A curved map of the plane. A tiny square around the point (teal) lands on a slightly curved patch (orange); the Jacobian sends it to the parallelogram (violet). Shrink the square and the two match.' },
      {
        code: {
          file: 'linalg.py', fn: 'jacobian', notes: [
            ['def jacobian(f, x, h=1e-6):', ['$f$ takes a list and returns a list.']],
            ['columns = []', ['We build $J$ one column at a time: column $j$ is "what happens to every output when input $j$ moves".']],
            ['for j in range(len(x)):', ['Each input.']],
            ['up = list(x)', ['A copy of the point…']],
            ['down = list(x)', ['…and another.']],
            ['up[j] += h', ['Nudge input $j$ up…']],
            ['down[j] -= h', ['…and down.']],
            ['columns.append([(a - b) / (2 * h) for a, b in zip(f(up), f(down))])', ['Every output\'s centred slope with respect to input $j$: $\\frac{\\partial f_i}{\\partial x_j}$ for all $i$.']],
            ['return transpose(columns)', ['Columns were collected as lists, so transpose to get rows = outputs.'], { tex: 'J_{ij} = \\frac{\\partial f_i}{\\partial x_j}' }],
          ],
        },
      },
      {
        code: {
          file: 'linalg.py', fn: 'softmax_jacobian', notes: [
            ['def softmax_jacobian(p):', ['Softmax\'s output $\\mathbf p$ is enough to build its Jacobian.']],
            ['return [[p[i] * ((1.0 if i == j else 0.0) - p[j]) for j in range(len(p))] for i in range(len(p))]', ['Entry $(i, j)$ is $p_i(\\mathbb 1[i = j] - p_j)$.'], { tex: 'J = \\mathrm{diag}(\\mathbf p) - \\mathbf p\\mathbf p^\\top' }],
          ],
        },
      },
      {
        predict: {
          prompt: '$\\mathbf f(x, y) = (xy,\\; x + y^2)$. What is the bottom-right entry of its Jacobian at $(1, 2)$, $\\frac{\\partial f_2}{\\partial y}$?',
          answer: 4, tolerance: 1e-6, compute: () => jacobian(v => [v[0] * v[1], v[0] + v[1] ** 2], [1, 2])[1][1],
          explain: '$\\frac{\\partial}{\\partial y}(x + y^2) = 2y = 4$. The whole Jacobian is $\\begin{pmatrix} y & x \\\\ 1 & 2y\\end{pmatrix} = \\begin{pmatrix}2 & 1\\\\1 & 4\\end{pmatrix}$.',
        },
      },
      {
        predict: {
          prompt: 'Softmax gives $\\mathbf p = (0.5, 0.3, 0.2)$. What is the diagonal entry $\\frac{\\partial p_1}{\\partial z_1}$?',
          answer: 0.25, tolerance: 1e-9, compute: () => softmaxJacobian([0.5, 0.3, 0.2])[0][0],
          explain: '$p_1(1 - p_1) = 0.5 \\times 0.5 = 0.25$: the sigmoid\'s slope formula again. Off the diagonal, $\\frac{\\partial p_1}{\\partial z_2} = -p_1p_2 = -0.15$: raising another score lowers this probability.',
        },
      },
      {
        predict: {
          prompt: 'Check the numerical Jacobian of softmax at $\\mathbf z = (1, 0.5, 0)$: what is its entry $(2, 3)$, $\\frac{\\partial p_2}{\\partial z_3}$? (4 decimals)',
          answer: softmaxJacobian(softmax([1, 0.5, 0]))[1][2], tolerance: 0.00006, compute: () => jacobian(softmax, [1, 0.5, 0])[1][2],
          explain: `$-p_2 p_3 = ${f(softmaxJacobian(softmax([1, 0.5, 0]))[1][2])}$, and nudging the scores numerically gives the same.`,
        },
      },
      { note: '$J_{ij} = \\partial f_i/\\partial x_j$: rows are outputs, columns inputs; $\\mathbf f(\\mathbf x + \\boldsymbol\\Delta) \\approx \\mathbf f(\\mathbf x) + J\\boldsymbol\\Delta$. Chain rule: $J_{f\\circ g} = J_f J_g$. Linear layer: $J = W$; elementwise activation: diagonal; softmax: $\\mathrm{diag}(\\mathbf p) - \\mathbf p\\mathbf p^\\top$. Backprop multiplies by $J^\\top$ from the end.' },
    ],
  },

  {
    id: 'hessian', title: 'The Hessian: curvature in many directions',
    goal: 'Build the Hessian $H_{ij} = \\frac{\\partial^2 f}{\\partial x_i\\partial x_j}$, derive the second-order approximation $f + \\nabla f^\\top\\boldsymbol\\Delta + \\frac12\\boldsymbol\\Delta^\\top H\\boldsymbol\\Delta$, and tell minima, maxima and saddles apart by its eigenvalues.',
    builds: ['jacobian', 'taylor', 'eigenvectors', 'second-derivative'],
    blocks: [
      { md: `In one dimension, $f''$ measures the bend. With many inputs the bend depends on **direction**: a loss can curve up steeply along one parameter and gently along another, or up along one and **down** along another. The **Hessian** collects all the second partial derivatives:

$$H_{ij} = \\frac{\\partial^2 f}{\\partial x_i\\,\\partial x_j} = \\frac{\\partial}{\\partial x_i}\\left(\\frac{\\partial f}{\\partial x_j}\\right)$$

It is the Jacobian of the gradient. For example, $f(x, y) = x^2y + y^3$ has gradient $(2xy,\\; x^2 + 3y^2)$ and Hessian $\\begin{pmatrix} 2y & 2x \\\\ 2x & 6y \\end{pmatrix}$.

**It is symmetric**: $\\frac{\\partial^2 f}{\\partial x\\partial y} = \\frac{\\partial^2 f}{\\partial y\\partial x}$ (above, both are $2x$). For functions whose second partials are continuous this always holds (*Clairaut's theorem*). **Taken on trust** here: the proof needs more care with limits than this lab has built; the numerical Hessian below shows the agreement every time.

**The second-order approximation.** Look along one direction: $g(t) = f(\\mathbf x + t\\boldsymbol\\Delta)$, a function of one number. By the multivariable chain rule, $g'(t) = \\nabla f(\\mathbf x + t\\boldsymbol\\Delta)\\cdot\\boldsymbol\\Delta = \\sum_j \\frac{\\partial f}{\\partial x_j}\\Delta_j$. Apply the chain rule again to each $\\frac{\\partial f}{\\partial x_j}$: $g''(t) = \\sum_i\\sum_j \\frac{\\partial^2 f}{\\partial x_i\\partial x_j}\\Delta_i\\Delta_j = \\boldsymbol\\Delta^\\top H\\boldsymbol\\Delta$. Now lesson [[#taylor]]'s one-dimensional second-order polynomial for $g$ at $t = 0$, evaluated at $t = 1$:

$$f(\\mathbf x + \\boldsymbol\\Delta) \\approx f(\\mathbf x) + \\nabla f^\\top\\boldsymbol\\Delta + \\tfrac12\\,\\boldsymbol\\Delta^\\top H\\,\\boldsymbol\\Delta$$

**Reading a flat point.** Where $\\nabla f = \\mathbf 0$, what's left is $\\frac12\\boldsymbol\\Delta^\\top H\\boldsymbol\\Delta$. Since $H$ is symmetric, its eigenvectors are at right angles (the spectral theorem, taken on trust as in lesson [[#eigenvectors]]), and along eigenvector $\\mathbf e_i$ the curvature is its eigenvalue: $\\mathbf e_i^\\top H\\mathbf e_i = \\lambda_i$.
- All $\\lambda_i > 0$: up in every direction, a **minimum**. ($H$ is called **positive definite**.)
- All $\\lambda_i < 0$: a **maximum**.
- Some positive, some negative: a **saddle**, up one way and down another, like a mountain pass. In high-dimensional losses, flat points are overwhelmingly saddles, not bad minima: with millions of directions, it is very unlikely that all of them curve up.

**Least squares is a bowl.** For $\\|X\\boldsymbol\\theta - \\mathbf y\\|^2$, the gradient is $2X^\\top(X\\boldsymbol\\theta - \\mathbf y)$ (lesson [[#matrix-gradients]]), a linear function of $\\boldsymbol\\theta$ with matrix $2X^\\top X$, so $H = 2X^\\top X$ everywhere. And $\\boldsymbol\\Delta^\\top X^\\top X\\boldsymbol\\Delta = \\|X\\boldsymbol\\Delta\\|^2 \\ge 0$: never curving down. That is why linear regression has no saddles and no bad minima, and its largest eigenvalue sets the learning-rate limit of lesson [[#eigenvectors]].` },
      { figure: 'HessianFig', caption: 'The surface $\\frac12(a x^2 + 2b\\,xy + c y^2)$ as a contour map, with Hessian $\\begin{pmatrix}a&b\\\\b&c\\end{pmatrix}$. Change $a$, $b$, $c$: when both eigenvalues are positive the contours are closed loops (a bowl); when they have opposite signs, a saddle.' },
      {
        code: {
          file: 'linalg.py', fn: 'hessian', notes: [
            ['def hessian(f, x, h=1e-4):', ['A function of a list, and a point.']],
            ['def grad(point):', ['A numerical gradient, as a function of the point…']],
            ['g = []', ['…one partial derivative per input.']],
            ['for i in range(len(point)):', ['Each input.']],
            ['up = list(point)', ['Copies of the point,']],
            ['down = list(point)', ['two of them.']],
            ['up[i] += h', ['Nudge input $i$ up…']],
            ['down[i] -= h', ['…and down.']],
            ['g.append((f(up) - f(down)) / (2 * h))', ['The centred slope: $\\frac{\\partial f}{\\partial x_i}$.']],
            ['return g', ['$\\nabla f$ at that point.']],
            ['return jacobian(grad, x, h)', ['The Jacobian of the gradient: the Hessian.'], { tex: 'H = J_{\\nabla f}' }],
          ],
        },
      },
      {
        predict: {
          prompt: '$f(x, y) = x^2y + y^3$. What is the off-diagonal entry $H_{12} = \\frac{\\partial^2 f}{\\partial x\\partial y}$ at $(1, 2)$?',
          answer: 2, tolerance: 1e-4, compute: () => hessian(v => v[0] ** 2 * v[1] + v[1] ** 3, [1, 2])[0][1],
          explain: '$\\frac{\\partial}{\\partial x}(x^2 + 3y^2) = 2x = 2$, and the other order, $\\frac{\\partial}{\\partial y}(2xy) = 2x$, agrees.',
        },
      },
      {
        predict: {
          prompt: 'The surface $\\frac12(x^2 + 4xy + y^2)$ has Hessian $\\begin{pmatrix}1 & 2\\\\2 & 1\\end{pmatrix}$. What is its **smaller** eigenvalue? (So: bowl or saddle?)',
          answer: -1, tolerance: 1e-9, compute: () => eigen2([[1, 2], [2, 1]])[1],
          explain: 'Eigenvalues $3$ and $-1$: one positive, one negative. A saddle. Along $(1, 1)$ it curves up; along $(1, -1)$, down.',
        },
      },
      { note: '$H_{ij} = \\partial^2 f/\\partial x_i\\partial x_j$, symmetric. $f(\\mathbf x + \\boldsymbol\\Delta) \\approx f + \\nabla f^\\top\\boldsymbol\\Delta + \\frac12\\boldsymbol\\Delta^\\top H\\boldsymbol\\Delta$. At a flat point: all eigenvalues positive, minimum; all negative, maximum; mixed, saddle. Least squares has $H = 2X^\\top X$, never curving down.' },
    ],
  },
]
