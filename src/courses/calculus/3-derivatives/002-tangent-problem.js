import secantToTangentUrl from '../diagrams/calc-secant-to-tangent.svg?url';
import tangentLineSlopeUrl from '../diagrams/calc-tangent-line-slope.svg?url';
import tangentDefinitionUrl from '../diagrams/calc-tangent-definition.svg?url';
// FILE: src/content/chapter-2/00-tangent-problem.js
export default {
  id: "ch2-000",
  slug: "tangent-problem",
  chapter: 2,
  order: 1,
  title: "The Derivative — From Average to Instantaneous Change",
  subtitle:
    "How a single limiting process unlocks the instantaneous rate of change of any function",
  tags: [
    "derivative",
    "limit definition",
    "difference quotient",
    "tangent line",
    "instantaneous rate of change",
    "differentiability",
    "notation",
  ],

  // ─── Semantic Layer ───────────────────────────────────────────────
  semantics: {
    core: [
      {
        symbol: "h",
        meaning:
          "the width of the interval, the probe distance (h \u2260 0 in the limit)",
      },
      {
        symbol: "f(x+h) - f(x)",
        meaning: 'the change in output when input shifts by h (the "rise")',
      },
      { symbol: "h", meaning: 'the change in input (the "run")' },
      {
        symbol: "[f(x+h)-f(x)]/h",
        meaning: "the difference quotient — slope of the secant line",
      },
      {
        symbol: "f'(x)",
        meaning:
          "the derivative — slope of the tangent line at x (the limit of the quotient)",
      },
      {
        symbol: "dy/dx",
        meaning:
          "Leibniz notation for the derivative (not a fraction, but behaves like one)",
      },
    ],
    rulesOfThumb: [
      "The difference quotient is average rate of change. The derivative is instantaneous rate of change.",
      "0/0 in the difference quotient is the SAME indeterminate form from Chapter 1. The algebra is the same: factor, cancel, then substitute.",
      "The derivative is a NEW function, not just a number. At each x, it tells you the slope of the original at that x.",
      "Differentiable always implies continuous. Continuous does NOT always imply differentiable (corners, cusps).",
    ],
  },

  grapher: {
    mode: "pro",
    label: "Explore the Derivative",
    functions: [
      { expr: "x^2", type: "explicit", color: "#6366f1", label: "f(x) = x²" },
      { expr: "2*x", type: "explicit", color: "#ec4899", label: "f'(x) = 2x" },
    ],
    sliders: [{ name: "a", min: -3, max: 3, value: 1 }],
    replace: true,
  },

  hook: {
    question:
      "Your GPS app tells you that your current speed is 62 mph. But speed is distance divided by time — if the measurement takes zero time, you travel zero distance. Zero divided by zero is undefined. So how can your speed be anything at all at a single instant?",
    realWorldContext:
      "Every speedometer, every radar gun, every GPS velocity readout faces this paradox. We want to know how fast something is changing right now, not averaged over an interval. Yet the very formula for rate of change — distance over time — seems to require an interval of nonzero length. The derivative is the mathematical resolution of this paradox. It is the tool that makes instantaneous change not only meaningful but computable, and it is arguably the central idea of all of calculus.",
    previewVisualizationId: "SecantToTangent",
  },

  intuition: {
    blocks: [
      {
        type: 'prose',
        paragraphs: [
      "**Let's place you exactly where you are in the course.** In Chapter 0, you learned that the slope of a line between two points is \u0394y/\u0394x. In Chapter 1, you learned that a limit is what a function approaches as its input gets close to a value. Both of those ideas were preparation for this exact moment. The derivative IS the limit of the slope formula. That’s it. The difference quotient [f(x+h) - f(x)] / h is \u0394y/\u0394x with \u0394x = h. The derivative is what that ratio approaches as h \u2192 0. You already know both halves — this lesson puts them together.",

      "Start with something we already understand: average rate of change. If you drive 120 miles in 2 hours, your average speed is 60 mph. If a population grows from 1,000 to 1,500 individuals over 5 years, the average growth rate is 100 individuals per year. In each case, we compute (change in output) divided by (change in input). This is the slope of the line connecting two points on the graph — called a secant line.",
      "Formally, the average rate of change of a function f over the interval from x = a to x = a + h is the slope of the secant line through the points (a, f(a)) and (a+h, f(a+h)). We write this as [f(a+h) - f(a)] / h. This expression has a name: the difference quotient. It is the single most important formula in differential calculus.",
      "Now ask: what happens as h gets smaller and smaller? The second point (a+h, f(a+h)) slides along the curve toward (a, f(a)). The secant line that once crossed the curve at two distinct points begins to rotate. In the limit, as h approaches 0, the secant line approaches a unique limiting position — the tangent line. The slope of that tangent line is the derivative.",
        ],
      },
      { type: 'image', src: secantToTangentUrl, alt: 'Secant lines converging to the tangent line as h → 0', caption: 'The tangent line slope is the limit of secant slopes — the birth of the derivative.' },
      {
        type: 'prose',
        paragraphs: [
      "Here is why we cannot simply plug in h = 0 directly. At h = 0, the difference quotient becomes [f(a) - f(a)] / 0 = 0/0, which is the indeterminate form from Chapter 1. This is not a number — it is a failure of division. But taking the LIMIT as h approaches 0 is something entirely different from evaluating AT h = 0. The limit asks: what value does the expression approach as h gets arbitrarily close to 0? That question has a perfectly well-defined, finite answer for most functions.",
      "Think about what the difference quotient measures geometrically. The numerator f(a+h) - f(a) is the vertical rise from one point to the other. The denominator h is the horizontal run. So the ratio is rise over run — the slope of the secant line. As h shrinks, the two points get closer and closer together, but the slope of the line between them settles into a limiting value. That limiting slope is the derivative.",
      "The derivative tells us two things simultaneously, and they are really the same thing: (1) it is the slope of the curve at the point x = a, meaning the slope of the tangent line to the graph there, and (2) it is the instantaneous rate of change of the function at x = a. If f(t) is position, the derivative is instantaneous velocity. If f(x) is a population, the derivative is the instantaneous growth rate. If f(x) is profit as a function of units sold, the derivative is marginal profit.",
        ],
      },
      { type: 'image', src: tangentLineSlopeUrl, alt: 'Secant shrinking to tangent with the derivative formula f′(a) = lim[f(a+h)−f(a)]/h', caption: 'As h → 0, the secant slope becomes the tangent slope — this limit is the derivative f′(a).' },
      {
        type: 'prose',
        paragraphs: [
      "Mathematicians have invented several notations for the derivative, each with its own strengths. If y = f(x), then the derivative can be written as f'(x) (read \"f prime of x\", due to Lagrange), or as dy/dx (Leibniz notation, emphasizing the ratio of infinitesimal changes), or as d/dx[f(x)] (operator notation), or as Df(x) (operator notation due to Euler), or even as y\u0307 (Newton's dot notation, used in physics for time derivatives). All of these mean exactly the same thing: the limit of the difference quotient. Leibniz notation dy/dx is especially useful when doing related rates and chain rule problems, because it behaves somewhat like a fraction (though it is not exactly one). Lagrange notation f'(x) is compact and convenient for most algebraic work.",

      "**Where this is heading:** You now have the definition of the derivative and you can compute it for simple functions using the limit process. But computing (x+h)^100 - x^100 from scratch every time would be unbearable. The next lesson gives you the shortcut rules — proved from limits once, then used freely. After that, every derivative you compute will take seconds instead of pages.",

      'Not every function has a derivative everywhere, and it is important to understand exactly when and why the derivative fails. There are three geometric failure modes for a continuous function. A corner is a point where the left-hand and right-hand difference quotients both converge but to different values — the classic example is f(x) = |x| at x = 0, where the left limit gives -1 and the right limit gives +1. A cusp is sharper than a corner: one or both one-sided difference quotients blow up to infinity, giving the graph a pointed tip — f(x) = x^(2/3) at x = 0 is the textbook example, where the tangent line would be vertical. A vertical tangent is a subtler case: the slope grows without bound in the same direction from both sides, so the "tangent line" would be a vertical line, which has undefined slope — f(x) = x^(1/3) at x = 0 exhibits this. In all three cases, the function is continuous but the limit of the difference quotient fails to be a finite real number, so f\'(a) does not exist.',

      "There is a profound and one-directional relationship between differentiability and continuity: differentiability always implies continuity, but continuity does NOT always imply differentiability. The proof that differentiability implies continuity is short: write f(x) - f(a) = [f(x) - f(a)] / (x - a) times (x - a). As x approaches a, the first factor approaches f'(a) (a finite number, since f is differentiable), and the second factor approaches 0. Their product approaches f'(a) times 0 = 0, so f(x) approaches f(a), which is exactly the definition of continuity. The converse fails because continuity only requires that the function has no jumps or holes — it says nothing about whether the graph has a well-defined direction (slope) at each point. The absolute value function |x| is the standard counterexample: perfectly continuous on all of R, but non-differentiable at x = 0 because of the corner.",

      "A practical checklist for differentiability: before computing a derivative, ask three questions. (1) Is the function continuous at the point? If not, it cannot be differentiable. (2) Is there a corner, cusp, or vertical tangent? If so, the derivative does not exist there. (3) Is the function defined by cases (piecewise)? At the boundary between pieces, you must check that the one-sided derivatives match. Only if all three checks pass can you proceed to compute the derivative using the limit definition or the shortcut rules.",
        ],
      },
      { type: 'image', src: tangentDefinitionUrl, alt: 'Comparison table: secant connects two points (finite h), tangent touches one point (h → 0)', caption: 'Secant: two points, average rate. Tangent: one point, instantaneous rate. Same formula, different limit.' },
    ],
    callouts: [
      {
        type: "sequencing",
        title: "Lesson 2 of 10 — Act 1: The Question",
        body: "**Previous:** Lesson 1 introduced the four perspectives on the derivative (geometric, physical, algebraic, computational) and the chapter roadmap.\n**This lesson:** We build the derivative rigorously from limits — the difference quotient made precise.\n**Next:** Lesson 3 gives you the shortcut rules (power, product, quotient) so you never have to grind through limits again.",
      },
      {
        type: "prior-knowledge",
        title: "You may have computed average speed before",
        body: "Average speed = Δposition / Δtime = (x(t+h) - x(t)) / h. This is exactly the difference quotient! The derivative is what you get when you take h → 0, turning average speed into instantaneous speed. Your speedometer computes a limit thousands of times per second.",
      },
      {
        type: "real-world",
        title: "Three interpretations of the same derivative",
        body: "If s(t) is position: s′(t) is velocity (instantaneous speed). If C(x) is cost of producing x units: C′(x) is marginal cost (cost of one more unit). If P(t) is population: P′(t) is the growth rate (people per year at that moment). Same math, three different worlds.",
      },
      {
        type: "definition",
        title: "The Difference Quotient",
        body: "\\dfrac{f(a+h) - f(a)}{h}",
      },
      {
        type: "intuition",
        title: "The Core Idea",
        body: "The derivative is NOT the difference quotient. The derivative is the LIMIT of the difference quotient as h → 0. The difference quotient is the slope of a secant line; the derivative is the slope of the tangent line.",
      },
      {
        type: "definition",
        title: "Five Equivalent Notations",
        body: "f'(x) = \\frac{dy}{dx} = \\frac{d}{dx}[f(x)] = Df(x) = \\dot{y}",
      },
      {
        type: "misconception",
        title: "dy/dx is NOT a Fraction",
        body: "Leibniz notation dy/dx LOOKS like a fraction and often BEHAVES like one (especially in the chain rule), but it is defined as a LIMIT, not a ratio. You cannot, in general, 'cancel' the dx. The notation is brilliantly suggestive, but it is notation — not algebra.",
      },
      {
        type: "history",
        title: "Newton vs. Leibniz: The Calculus Priority Dispute",
        body: "Newton developed calculus in the 1660s using 'fluxions' (rates of change). Leibniz independently developed it in the 1670s-80s using infinitesimals. The resulting priority dispute was one of the bitterest in the history of science. Today, we use Leibniz's notation (dy/dx) because it is more versatile, but Newton's dot notation (ẏ) survives in physics.",
      },
      {
        type: "tip",
        title: "Physics Application: Kinematics is Derivatives in Action",
        body: "Everything in this lesson has a direct physical counterpart. Position x(t) is the function; velocity v = dx/dt is its derivative; acceleration a = dv/dt = d²x/dt² is the second derivative. The x–t graph you see in Physics Ch2 is exactly the graph of f; its slope at each point is exactly f′(x). See Physics Ch2 (Position, Velocity, and Acceleration Graphs) to watch this abstract limit definition become a speedometer reading in real time.",
      },
    ],
    visualizations: [
      {
        id: "SecantToTangent",
        title: "Secant Line → Tangent Line",
        mathBridge:
          'Step 1: Set the point $a$ using the slider and notice the two points on the curve. Step 2: Drag $h$ from 1 down to 0.1, then 0.01. Watch the displayed slope value in the box — it is computing $[f(a+h)-f(a)]/h$ live. Step 3: Notice that the slope is settling toward a specific number before you even reach $h=0$. That settled value IS the derivative $f\'(a)$. Step 4: Now try to set $h$ exactly to 0. The display shows "undefined" — because $0/0$ is not a number. The key insight: the derivative exists at the limit, not at $h=0$ itself. The secant becomes the tangent in the limiting position, not by ever touching it.',
        caption:
          'Drag h from 1 down toward 0. Watch the secant slope number stabilize — that limiting value is f\'(a). Notice that "undefined" appears at h=0 exactly, confirming why we need a limit rather than direct substitution.',
      },
      {
        id: "PositionVelocityAcceleration",
        title: "Position, Velocity, and Acceleration — Live",
        mathBridge:
          "Do this in sequence. First, pause the animation and drag the time slider slowly. Watch the position graph: when it slopes upward, the car moves forward. Now look at the velocity graph directly below it — notice it is POSITIVE during those upward-sloping stretches. Step 2: Find the moment the position graph peaks (changes from rising to falling). What is the velocity at that exact instant? It is zero — because the slope of the tangent at a maximum is horizontal. Step 3: Now watch the acceleration graph. When velocity is increasing, acceleration is positive. When velocity decreases (even if positive), acceleration is negative. The acceleration graph is the derivative of velocity, which is the second derivative of position. Every relationship between these three graphs is a derivative relationship.",
        caption:
          "Pause and drag the time slider. At every moment, the velocity graph value equals the slope of the position curve above it. At every position peak, velocity is zero. At every velocity peak, acceleration is zero.",
      },
      {
        id: "LimitBridgeLab",
        title: "Instantaneous Change Bridge Lab",
        mathBridge:
          "This lab has three columns: the $h$ value you set, the computed difference quotient $[f(a+h)-f(a)]/h$, and the error compared to the true derivative. Here is what to do: (1) Start with $h = 1$ — the difference quotient is a rough average over a wide interval. (2) Halve $h$ repeatedly: 0.5, 0.25, 0.1, 0.01, 0.001. Watch the middle column converge to a fixed number. That number is $f'(a)$. (3) Notice the error column shrinks proportionally to $h$ — this is called first-order convergence and it confirms the limit exists. (4) Try a different function using the dropdown and repeat. Every function that is differentiable at $a$ will show the same convergence behavior. Functions with corners (like $|x|$ at 0) will NOT converge — they will show the left and right averages converging to different values.",
        caption:
          "Choose a function and shrink h from 1 to 0.001. The middle column converges to f'(a) — that convergence IS the definition of the derivative. Functions with corners will show the column failing to settle.",
      },
    ],
  },

  math: {
    prose: [
      "We are now ready to state the formal definition. There are two closely related versions: the derivative at a specific point a, and the derivative as a function of x.",
      "The derivative of f at the specific point x = a is the number f'(a) defined by the limit of the difference quotient as h approaches 0. If this limit exists (is a finite real number), we say f is differentiable at a. The notation f'(a) emphasizes that the derivative at a point is a single number — the slope at that point.",
      "The derivative function f'(x) is obtained by letting a vary. Instead of computing the slope at one specific point, we compute it at every point where the limit exists. The result is a new function whose output at any x is the slope of the original function at that x.",
      "There is an alternative but equivalent form of the derivative at a point a, using x directly as the variable that approaches a: the limit as x approaches a of [f(x) - f(a)] / (x - a). This form is sometimes cleaner algebraically — you can factor (x - a) out of the numerator.",
      "Once we know the derivative f'(a), we can write the equation of the tangent line to the graph of f at the point (a, f(a)). The tangent line passes through (a, f(a)) with slope f'(a), so its equation is y - f(a) = f'(a)(x - a). This is simply the point-slope form of a line.",
      "We also define one-sided derivatives, called the left-hand derivative and the right-hand derivative. The left-hand derivative at a is the limit of the difference quotient as h approaches 0 from the negative side (h → 0⁻). The right-hand derivative is the limit as h → 0⁺. The derivative f'(a) exists if and only if both one-sided derivatives exist and are equal. One-sided derivatives are essential for analyzing functions defined by cases or functions with corners.",
      "A function is called differentiable on an open interval (c, d) if it is differentiable at every point in that interval. It is differentiable on a closed interval [c, d] if it is differentiable on the open interior (c, d) and both one-sided derivatives exist at the endpoints.",
    ],
    callouts: [
      {
        type: "definition",
        title: "Derivative at a Point",
        body: "f'(a) = \\lim_{h \\to 0} \\frac{f(a+h) - f(a)}{h}",
      },
      {
        type: "definition",
        title: "Derivative as a Function",
        body: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}",
      },
      {
        type: "definition",
        title: "Alternative Form (Point Version)",
        body: "f'(a) = \\lim_{x \\to a} \\frac{f(x) - f(a)}{x - a}",
      },
      {
        type: "definition",
        title: "Tangent Line at (a, f(a))",
        body: "y - f(a) = f'(a)(x - a)",
      },
      {
        type: "definition",
        title: "One-Sided Derivatives",
        body: "f'_-(a) = \\lim_{h \\to 0^-} \\frac{f(a+h)-f(a)}{h}, \\quad f'_+(a) = \\lim_{h \\to 0^+} \\frac{f(a+h)-f(a)}{h}",
      },
    ],
    visualizations: [
      {
        id: "TangentLineConstructor",
        props: { showPointSlope: true, showDifferenceQuotientLabels: true },
        title: "Secant → Tangent: Limit of Difference Quotient",
        mathBridge:
          "The labels show the rise $f(a+h)-f(a)$ and run $h$ directly on the graph. Their ratio is the difference quotient $\\frac{\\Delta y}{\\Delta x}$. Watch the labeled slope value update in real time as $h \\to 0$ — that converging number is the derivative $f'(a)$ at that point.",
        caption:
          "Drag h toward 0. The secant line approaches the tangent line — and the slope approaches the derivative.",
      },
      {
        id: "DerivativeBuilder",
        title: "Build the Derivative Graph",
        mathBridge:
          "At each point $x$, the derivative $f'(x)$ is a number — the slope of $f$ there. Collecting those slopes across all $x$ values produces a new function $f'(x)$. Where $f$ rises steeply, $f'$ is large and positive. Where $f$ has a peak, $f'$ is zero. Where $f$ falls, $f'$ is negative. This is what it means for $f'$ to be a function.",
        caption:
          "Drag the slider across f(x). The green dots you leave behind trace out f'(x). Toggle \"Show f'(x)\" to check your work. This is what the derivative function really means.",
      },
    ],
  },

  rigor: {
    prose: [
      "There is a profound relationship between differentiability and continuity. Intuitively, if a function has a well-defined tangent slope at a point, it cannot have a jump or hole there — a broken function cannot have a smooth tangent. This is made precise by an important theorem.",
      "THEOREM (Differentiability Implies Continuity): If f is differentiable at a, then f is continuous at a.",
      "PROOF: We want to show that the limit of f(x) as x approaches a equals f(a), or equivalently that the limit of [f(x) - f(a)] as x approaches a is 0. We write f(x) - f(a) = [f(x) - f(a)] / (x - a) times (x - a). The first factor, [f(x)-f(a)]/(x-a), approaches f'(a) as x → a (by the alternative definition of the derivative). The second factor, (x - a), approaches 0. By the product law for limits, the product approaches f'(a) · 0 = 0. Therefore f(x) - f(a) → 0, which means f(x) → f(a). This proves continuity.",
      'The converse of this theorem is FALSE. A function can be continuous at a point without being differentiable there. The classic example is f(x) = |x| at x = 0. This function is continuous everywhere — there are no jumps or holes. But it has a "corner" at x = 0 where the graph changes direction sharply, and at that corner the derivative does not exist.',
      "PROOF that |x| is not differentiable at 0: We compute the left and right derivatives. From the right (h → 0⁺): [|0+h| - |0|] / h = |h|/h = h/h = 1, so the right-hand derivative is 1. From the left (h → 0⁻): [|0+h| - |0|] / h = |h|/h = (-h)/h = -1, so the left-hand derivative is -1. Since 1 ≠ -1, the two-sided limit does not exist, and f is not differentiable at 0.",
      "There are exactly three geometric ways a function can fail to be differentiable at a point, even while remaining continuous there. First: a corner, where the left and right derivatives both exist but are unequal (example: |x| at 0). Second: a cusp, where one or both one-sided derivatives are infinite but with opposite signs, causing the curve to come to a sharp pointed tip (example: x^(2/3) at 0 — the tangent line becomes vertical). Third: a vertical tangent, where the difference quotient grows without bound as h → 0, meaning the tangent line would be vertical (example: x^(1/3) at 0). In all three cases, the function is continuous but the limit of the difference quotient fails to be a finite real number.",
      "A function can also fail to be differentiable at a point of discontinuity, of course — but that failure is less subtle, since differentiability requires continuity.",
    ],
    callouts: [
      {
        type: "theorem",
        title: "Differentiability Implies Continuity",
        body: "\\text{If } f \\text{ is differentiable at } a, \\text{ then } f \\text{ is continuous at } a.",
      },
      {
        type: "warning",
        title: "The Converse is False",
        body: "f(x) = |x| \\text{ is continuous at } 0 \\text{ but } f'(0) \\text{ does not exist.}",
      },
      {
        type: "insight",
        title: "Three Ways to Fail Differentiability",
        body: "\\text{(1) Corner: } f'_-(a) \\neq f'_+(a) \\\\ \\text{(2) Cusp: one-sided derivatives are } \\pm\\infty \\\\ \\text{(3) Vertical tangent: } \\left|\\frac{f(a+h)-f(a)}{h}\\right| \\to \\infty",
      },
    ],
    visualizations: [
      {
        id: "AbsoluteValueDiffViz",
        title: "The Corner: Why |x| Fails at x = 0",
        mathBridge:
          "The rigor section proves this algebraically: $(|0+h| - 0)/h = |h|/h$, which equals $+1$ when $h > 0$ and $-1$ when $h < 0$. The visualization makes the algebra geometric — both secant lines are shown simultaneously. No matter how small $h$ gets, the green (right) secant locks at slope $+1$ and the red (left) at slope $-1$. That immovable mismatch is exactly what the limit calculation says. Compare this to the smooth $x^2$ example where both secants converge to the same slope as $h \\to 0$.",
        caption:
          "Slide h all the way to 0 — the slopes never converge. The corner means two incompatible tangent slopes fight for the same point.",
      },
    ],
  },

  examples: [
    {
      id: "ch2-000-ex1",
      title: "Derivative of x\u00b2 from the Definition",
      problem:
        "\\text{Let } f(x) = x^2. \\text{ Use the limit definition to find } f'(x). \\text{ Then find the slope at } x=3 \\text{ and write the equation of the tangent line at } (3, 9).",
      steps: [
        {
          expression: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}",
          annotation:
            "Always start by writing the limit definition. This is the algorithm — do not skip it. Every derivative we compute follows these exact steps.",
        },
        {
          expression: "= \\lim_{h \\to 0} \\frac{(x+h)^2 - x^2}{h}",
          annotation:
            "Substitute f(x) = x^2. To find f(x+h): wherever x appears in the formula x^2, replace it with the quantity (x+h). So f(x+h) = (x+h)^2. Gotcha: this is NOT x^2 + h^2. You cannot distribute a square across a sum — that is one of the most common algebra mistakes in calculus.",
        },
        {
          expression: "(x+h)^2 = (x+h)(x+h)",
          annotation:
            "Prerequisite algebra — what squaring means: raising a quantity to the power 2 means multiplying it by itself. We must expand this product before we can simplify anything.",
        },
        {
          expression: "= x \\cdot x + x \\cdot h + h \\cdot x + h \\cdot h",
          annotation:
            "Prerequisite algebra — FOIL method for multiplying two binomials: multiply EVERY term in the first factor by EVERY term in the second. Four products total. First: x times x. Outer: x times h. Inner: h times x. Last: h times h. Write all four products before combining anything. Do not skip steps here.",
        },
        {
          expression: "= x^2 + xh + xh + h^2 = x^2 + 2xh + h^2",
          annotation:
            "Combine like terms: the outer and inner products are both xh, so xh + xh = 2xh. Final rule to know: (a+b)^2 = a^2 + 2ab + b^2. The 2ab middle term is what everyone drops. It is not optional — if you omit it, your derivative will be wrong.",
        },
        {
          expression: "= \\lim_{h \\to 0} \\frac{x^2 + 2xh + h^2 - x^2}{h}",
          annotation:
            "Substitute the full expansion back into the difference quotient numerator.",
        },
        {
          expression: "= \\lim_{h \\to 0} \\frac{2xh + h^2}{h}",
          annotation:
            "Cancel x^2 and -x^2 in the numerator: x^2 - x^2 = 0. This cancellation always happens in a derivative — the original function terms subtract away, leaving only terms that contain h. If any term without h survives after this step, you made an expansion error. Go back and check.",
        },
        {
          expression: "2xh + h^2 = h \\cdot 2x + h \\cdot h = h(2x + h)",
          annotation:
            "Prerequisite algebra — factoring using the distributive property in reverse: the rule ab + ac = a(b + c) says that if EVERY term in an expression shares a common factor, you can pull that factor out front. Check: does 2xh contain h? Yes — it equals h times 2x. Does h^2 contain h? Yes — it equals h times h. Since both terms share h as a factor, we factor h out. Verify by expanding back: h(2x + h) = h times 2x plus h times h = 2xh + h^2. Correct.",
        },
        {
          expression: "= \\lim_{h \\to 0} \\frac{h(2x + h)}{h}",
          annotation:
            "Substitute the factored numerator. Now h appears explicitly in both numerator and denominator.",
        },
        {
          expression: "= \\lim_{h \\to 0} (2x + h)",
          annotation:
            "Prerequisite algebra — why canceling h/h is legal here: for any nonzero number k, k divided by k = 1. In the limit process, h is approaching zero but is NEVER actually zero. So at every stage, h is a nonzero quantity, and h/h = 1 is a perfectly valid cancellation. We are not dividing by zero. We are dividing by a nonzero number that happens to be getting very small. This distinction — approaching zero versus equaling zero — is the conceptual core of the entire limit idea.",
        },
        {
          expression: "= 2x + 0 = 2x",
          annotation:
            "Now, and only now, substitute h = 0. The denominator is completely gone, so there is no risk of division by zero. Replace every h with 0: 2x + h becomes 2x + 0 = 2x.",
        },
        {
          expression: "f'(x) = 2x",
          annotation:
            "The derivative of x^2 is 2x. This is a function, not a single number. At any x it gives the slope of the parabola at that point. At x = 0 the slope is 0 (the vertex is flat). At x = 1 the slope is 2. At x = -3 the slope is -6.",
        },
        {
          expression: "f'(3) = 2(3) = 6",
          annotation:
            "Evaluate the derivative function at x = 3. Plugging x = 3 into f'(x) = 2x gives 6. That is the slope of the tangent line at the point (3, 9).",
        },
        {
          expression: "\\text{Point-slope form: } y - y_1 = m(x - x_1)",
          annotation:
            "Prerequisite algebra — point-slope form: the equation of any line through a known point (x_1, y_1) with known slope m. We know slope m = f'(3) = 6. We need the point. The point lies on the ORIGINAL curve, so the y-coordinate is f(3) = 3^2 = 9. Point: (3, 9). Do not use f'(3) = 6 as the y-coordinate — that is the slope, not the height.",
        },
        {
          expression: "y - 9 = 6(x - 3)",
          annotation:
            "Substitute point (3, 9) and slope 6 into point-slope form.",
        },
        {
          expression: "y - 9 = 6x - 18",
          annotation:
            "Distribute 6 across (x - 3): 6 times x = 6x, 6 times -3 = -18.",
        },
        {
          expression: "y = 6x - 18 + 9 = 6x - 9",
          annotation:
            "Add 9 to both sides to isolate y. Verification: plug x = 3 back in: y = 6(3) - 9 = 18 - 9 = 9. The line passes through (3, 9) as required.",
        },
      ],
      conclusion:
        "f'(x) = 2x. At x = 3, slope = 6, tangent line y = 6x - 9. Algebra keys: (a+b)^2 = a^2 + 2ab + b^2 (NOT a^2 + b^2); factor h by the distributive law in reverse; cancel h/h because h is nonzero during the limit process.",
    },
    {
      id: "ch2-000-ex2",
      title: "Derivative of x\u00b3 from the Definition",
      problem:
        "\\text{Let } f(x) = x^3. \\text{ Use the limit definition to find } f'(x).",
      steps: [
        {
          expression: "f'(x) = \\lim_{h \\to 0} \\frac{(x+h)^3 - x^3}{h}",
          annotation:
            "Write the definition and substitute f(x) = x^3. This example forces you to expand a cube — a step that causes more errors than almost anything else in early calculus.",
        },
        {
          expression: "(x+h)^3 = (x+h)^2 \\cdot (x+h)",
          annotation:
            "Prerequisite algebra — strategy for a cube: x^3 means x times x times x, so (x+h)^3 = (x+h)(x+h)(x+h). A practical two-step approach: use the result we proved in ex1 — (x+h)^2 = x^2 + 2xh + h^2 — and then multiply that result by (x+h) once more. Splitting into two steps makes the expansion manageable and checkable.",
        },
        {
          expression: "= (x^2 + 2xh + h^2)(x+h)",
          annotation:
            "Substitute the known expansion of (x+h)^2. We now need to multiply a trinomial (three terms) by a binomial (two terms).",
        },
        {
          expression: "= x^2(x+h) + 2xh(x+h) + h^2(x+h)",
          annotation:
            "Prerequisite algebra — distributing a trinomial: multiply EACH of the three terms in the first factor by the COMPLETE second factor (x+h). The distributive law is the same rule used for binomials; it just has to be applied three times instead of twice.",
        },
        {
          expression: "= (x^3 + x^2 h) + (2x^2 h + 2xh^2) + (xh^2 + h^3)",
          annotation:
            "Expand each pair. x^2 times x = x^3, x^2 times h = x^2 h. Then 2xh times x = 2x^2 h, 2xh times h = 2xh^2. Then h^2 times x = xh^2, h^2 times h = h^3. Six terms total.",
        },
        {
          expression: "= x^3 + 3x^2 h + 3xh^2 + h^3",
          annotation:
            "Collect like terms: x^2 h + 2x^2 h = 3x^2 h. And 2xh^2 + xh^2 = 3xh^2. Final expansion: (x+h)^3 = x^3 + 3x^2 h + 3xh^2 + h^3. Gotcha: the most common mistake here is writing only x^3 + h^3 and omitting both middle terms. Both 3x^2 h and 3xh^2 are real — confirm by multiplying back.",
        },
        {
          expression:
            "= \\lim_{h \\to 0} \\frac{x^3 + 3x^2 h + 3xh^2 + h^3 - x^3}{h}",
          annotation:
            "Substitute the full expansion into the difference quotient numerator.",
        },
        {
          expression: "= \\lim_{h \\to 0} \\frac{3x^2 h + 3xh^2 + h^3}{h}",
          annotation:
            "Cancel x^3 - x^3 = 0. Three terms remain; every one of them contains h.",
        },
        {
          expression:
            "3x^2 h + 3xh^2 + h^3 = h \\cdot 3x^2 + h \\cdot 3xh + h \\cdot h^2 = h(3x^2 + 3xh + h^2)",
          annotation:
            "Prerequisite algebra — factoring h from three terms: check that each term contains h as a factor. 3x^2 h = h times 3x^2. 3xh^2 = h times 3xh. h^3 = h times h^2. All three have h, so apply the distributive law in reverse: ab + ac + ad = a(b + c + d). Factor h out of all three at once.",
        },
        {
          expression: "= \\lim_{h \\to 0} \\frac{h(3x^2 + 3xh + h^2)}{h}",
          annotation: "Rewrite the numerator with h factored out.",
        },
        {
          expression: "= \\lim_{h \\to 0} (3x^2 + 3xh + h^2)",
          annotation:
            "Cancel h/h = 1. Legal because h is nonzero in the limit process. Denominator is gone.",
        },
        {
          expression: "= 3x^2 + 3x(0) + (0)^2 = 3x^2",
          annotation:
            "Substitute h = 0 safely. Both 3xh and h^2 contain h and become zero. Only 3x^2 — the constant-in-h term — survives.",
        },
        {
          expression: "f'(x) = 3x^2",
          annotation:
            "Pattern check: for x^2 the derivative was 2x. For x^3 it is 3x^2. In each case the exponent dropped down as the coefficient and the power decreased by one. You are watching the power rule emerge from first principles.",
        },
      ],
      conclusion:
        "f'(x^3) = 3x^2. Critical step: expand (x+h)^3 into all four terms. Dropping the middle terms 3x^2 h and 3xh^2 is the most common error.",
    },
    {
      id: "ch2-000-ex3",
      title: "Derivative of \\sqrt{x} from the Definition",
      problem:
        "f(x) = \\sqrt{x}. \\text{ Use the limit definition to find } f'(x) \\text{ for } x > 0.",
      steps: [
        {
          expression:
            "f'(x) = \\lim_{h \\to 0} \\frac{\\sqrt{x+h} - \\sqrt{x}}{h}",
          annotation:
            "Write the definition. Substituting h = 0 immediately gives 0/0. But unlike polynomials, there is no h to factor out of a square root. A completely different algebraic technique is needed: the conjugate method.",
        },
        {
          expression:
            "\\text{Prerequisite: difference of squares — } (a-b)(a+b) = a^2 - b^2",
          annotation:
            "This identity is the key. Reading it left-to-right: multiplying a difference by its conjugate gives a difference of squares. Reading it right-to-left: a difference of squares factors into a product of a sum and difference. We want to use it right-to-left on the numerator: we will force the numerator into the form a^2 - b^2 to eliminate the square roots.",
        },
        {
          expression:
            "= \\lim_{h \\to 0} \\frac{\\sqrt{x+h} - \\sqrt{x}}{h} \\cdot \\frac{\\sqrt{x+h} + \\sqrt{x}}{\\sqrt{x+h} + \\sqrt{x}}",
          annotation:
            "Multiply the entire expression by the conjugate fraction. The conjugate of (a - b) is (a + b) — same two terms, but with the sign between them flipped. Multiplying by (conjugate)/(conjugate) equals 1, so the value is unchanged. This is called rationalizing the numerator.",
        },
        {
          expression:
            "\\text{Numerator: }(\\sqrt{x+h} - \\sqrt{x})(\\sqrt{x+h} + \\sqrt{x}) = (\\sqrt{x+h})^2 - (\\sqrt{x})^2",
          annotation:
            "Apply the difference of squares identity directly: (a - b)(a + b) = a^2 - b^2, where a = sqrt(x+h) and b = sqrt(x).",
        },
        {
          expression: "= (x+h) - x = h",
          annotation:
            "Prerequisite algebra — square root and squaring are inverse operations: by the definition of square root, (sqrt(A))^2 = A. So (sqrt(x+h))^2 = x+h and (sqrt(x))^2 = x. After subtracting: (x+h) - x = h. The radical signs are completely eliminated from the numerator.",
        },
        {
          expression:
            "= \\lim_{h \\to 0} \\frac{h}{h(\\sqrt{x+h} + \\sqrt{x})}",
          annotation:
            "The numerator is now simply h. The denominator is the original h multiplied by the conjugate factor.",
        },
        {
          expression: "= \\lim_{h \\to 0} \\frac{1}{\\sqrt{x+h} + \\sqrt{x}}",
          annotation:
            "Cancel h/h = 1 (h nonzero in the limit). After canceling, h appears only inside the square root in the denominator — it is safe to take the limit now.",
        },
        {
          expression:
            "= \\frac{1}{\\sqrt{x+0} + \\sqrt{x}} = \\frac{1}{\\sqrt{x} + \\sqrt{x}} = \\frac{1}{2\\sqrt{x}}",
          annotation:
            "Substitute h = 0. sqrt(x+0) = sqrt(x). The denominator becomes sqrt(x) + sqrt(x) = 2 sqrt(x). Domain requirement: x > 0 is needed to ensure sqrt(x) is a real number and the denominator is nonzero.",
        },
        {
          expression: "f'(x) = \\frac{1}{2\\sqrt{x}}",
          annotation:
            "Equivalently written as (1/2) x^{-1/2}. Power rule verification: x^{1/2} should give (1/2) x^{1/2 - 1} = (1/2) x^{-1/2} = 1/(2 sqrt(x)). Confirmed — the power rule works for fractional exponents too.",
        },
      ],
      conclusion:
        "f'(sqrt(x)) = 1/(2 sqrt(x)) for x > 0. Technique: multiply numerator and denominator by the conjugate to eliminate the radical difference. The difference of squares identity produces a plain h in the numerator that cancels the denominator h.",
    },
    {
      id: "ch2-000-ex4",
      title: "Derivative of 1/x from the Definition",
      problem:
        "f(x) = \\dfrac{1}{x}. \\text{ Use the limit definition to find } f'(x) \\text{ for } x \\neq 0.",
      steps: [
        {
          expression:
            "f'(x) = \\lim_{h \\to 0} \\frac{\\dfrac{1}{x+h} - \\dfrac{1}{x}}{h}",
          annotation:
            "Write the definition and substitute. The numerator is now a difference of two fractions — a compound fraction. Strategy: simplify the top fraction first, before dividing by h.",
        },
        {
          expression:
            "\\text{Focus on the numerator: } \\frac{1}{x+h} - \\frac{1}{x}",
          annotation:
            "Prerequisite algebra — subtracting fractions with unlike denominators: you cannot subtract fractions unless they share a common denominator. The denominators are (x+h) and x. These are different expressions (h makes them different), so we must convert both to a common denominator first.",
        },
        {
          expression: "\\text{Least common denominator (LCD)} = x(x+h)",
          annotation:
            "Prerequisite algebra — finding the LCD: when two denominators share no common factor, their LCD is simply their product. x and (x+h) share no common factor (h is nonzero), so LCD = x times (x+h) = x(x+h).",
        },
        {
          expression:
            "\\frac{1}{x+h} = \\frac{1 \\cdot x}{(x+h) \\cdot x} = \\frac{x}{x(x+h)}",
          annotation:
            "Convert the first fraction: multiply top and bottom by x. Multiplying by x/x = 1 does not change the value, only the form.",
        },
        {
          expression:
            "\\frac{1}{x} = \\frac{1 \\cdot (x+h)}{x \\cdot (x+h)} = \\frac{x+h}{x(x+h)}",
          annotation:
            "Convert the second fraction: multiply top and bottom by (x+h).",
        },
        {
          expression:
            "\\frac{1}{x+h} - \\frac{1}{x} = \\frac{x}{x(x+h)} - \\frac{x+h}{x(x+h)} = \\frac{x - (x+h)}{x(x+h)}",
          annotation:
            "Prerequisite algebra — subtracting fractions with the same denominator: a/c - b/c = (a - b)/c. Combine into one fraction. CRITICAL: keep the parentheses around (x+h) in the numerator. If you write x - x + h instead of x - (x+h), you get the wrong sign on h and your answer will have the wrong sign.",
        },
        {
          expression: "= \\frac{x - x - h}{x(x+h)}",
          annotation:
            "Prerequisite algebra — distributing a negative sign: -(x+h) = -x - h. The minus sign distributes to every term inside the parentheses. x becomes -x and h becomes -h.",
        },
        {
          expression: "= \\frac{-h}{x(x+h)}",
          annotation:
            "Simplify the numerator: x - x = 0, leaving -h. This negative sign is important — it is why the derivative of 1/x is negative.",
        },
        {
          expression:
            "f'(x) = \\lim_{h \\to 0} \\frac{1}{h} \\cdot \\frac{-h}{x(x+h)} = \\lim_{h \\to 0} \\frac{-h}{h \\cdot x(x+h)}",
          annotation:
            "The full difference quotient: the fraction difference is divided by h, meaning multiply by 1/h. Combine h terms together.",
        },
        {
          expression: "= \\lim_{h \\to 0} \\frac{-1}{x(x+h)}",
          annotation:
            "Cancel -h/h = -1 (h is nonzero in the limit). The negative sign carries through.",
        },
        {
          expression:
            "= \\frac{-1}{x(x+0)} = \\frac{-1}{x \\cdot x} = -\\frac{1}{x^2}",
          annotation: "Substitute h = 0. Denominator becomes x times x = x^2.",
        },
        {
          expression: "f'(x) = -\\dfrac{1}{x^2}",
          annotation:
            "Power rule verification: 1/x = x^{-1}. Power rule gives (-1) x^{-1 - 1} = -x^{-2} = -1/x^2. Confirmed.",
        },
      ],
      conclusion:
        "f'(1/x) = -1/x^2. Key algebra: convert the fraction subtraction to a common denominator x(x+h), distribute the minus sign carefully, then cancel -h/h. The sign on h is the most frequent error.",
    },
    {
      id: "ch2-000-ex5",
      title: "Derivative of a Linear Function",
      problem:
        "f(x) = 3x + 5. \\text{ Find } f'(x) \\text{ from the limit definition. Explain why the constant term disappears.}",
      steps: [
        {
          expression: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}",
          annotation:
            "Start from the definition. Even for a simple function, writing this out explicitly keeps you from making sign errors.",
        },
        {
          expression: "f(x+h) = 3(x+h) + 5",
          annotation:
            "Substitute (x+h) wherever x appears in 3x + 5. Replace the x in '3x' with (x+h). The constant 5 does not change because it does not depend on x at all.",
        },
        {
          expression: "= 3x + 3h + 5",
          annotation:
            "Prerequisite algebra — distribute 3 over (x+h): 3 times x = 3x, 3 times h = 3h. The constant 5 is unchanged.",
        },
        {
          expression: "f(x+h) - f(x) = (3x + 3h + 5) - (3x + 5)",
          annotation:
            "Write the subtraction with brackets around both expressions. This protects you from forgetting to distribute the minus sign.",
        },
        {
          expression: "= 3x + 3h + 5 - 3x - 5",
          annotation:
            "Prerequisite algebra — distributing a minus sign: -(3x + 5) = -3x - 5. Every term inside the parentheses gets its sign flipped. This is the step where sign errors most often happen.",
        },
        {
          expression: "= 3h",
          annotation:
            "Collect like terms: 3x and -3x cancel. 5 and -5 cancel. Only 3h survives. Why does 5 disappear? Because 5 is a constant — it appears identically in both f(x) and f(x+h). When you subtract them, the 5s cancel. The intercept tells you WHERE the line is vertically, but it does not affect the steepness. Steepness — slope — depends only on the coefficient of x.",
        },
        {
          expression: "\\frac{f(x+h)-f(x)}{h} = \\frac{3h}{h} = 3",
          annotation:
            "Prerequisite algebra — cancel h/h = 1 (h nonzero). The entire difference quotient equals the constant 3 for every nonzero value of h. There is nothing left to take a limit of.",
        },
        {
          expression: "f'(x) = \\lim_{h \\to 0} 3 = 3",
          annotation:
            "Prerequisite: the limit of a constant is that constant. No matter how h changes, the value 3 never moves. So the limit is 3.",
        },
        {
          expression: "f'(x) = 3",
          annotation:
            "Geometric meaning: y = 3x + 5 is a straight line with constant slope 3 everywhere. The tangent line at any point IS the line itself. The derivative is the same at every x because a line has the same steepness everywhere.",
        },
        {
          expression:
            "\\text{General rule: if } f(x) = mx + b \\text{ then } f'(x) = m",
          annotation:
            "Proof of the general rule: f(x+h) - f(x) = [m(x+h) + b] - [mx + b] = mx + mh + b - mx - b = mh. Dividing by h and taking the limit gives m. The intercept b always cancels.",
        },
      ],
      conclusion:
        "f'(3x+5) = 3. The constant 5 cancels because it appears identically in both f(x) and f(x+h). Only the slope coefficient 3 survives the subtraction.",
    },
    {
      id: "ch2-000-ex6",
      title: "Is |x| Differentiable at x = 0?",
      problem:
        "\\text{Determine whether } f(x) = |x| \\text{ is differentiable at } x = 0 \\text{ by computing left and right-hand derivatives.}",
      steps: [
        {
          expression:
            "f'(0) = \\lim_{h \\to 0} \\frac{|0 + h| - |0|}{h} = \\lim_{h \\to 0} \\frac{|h|}{h}",
          annotation:
            "Write the limit definition at x = 0. Since |0| = 0, the numerator simplifies to |h|. The problem: |h| behaves differently depending on whether h is positive or negative. We cannot evaluate this limit without splitting into cases.",
        },
        {
          expression:
            "|h| = \\begin{cases} h & \\text{if } h > 0 \\\\ -h & \\text{if } h < 0 \\end{cases}",
          annotation:
            "Prerequisite algebra — definition of absolute value: absolute value returns the non-negative version of a number. For a positive input, return it unchanged. For a negative input, negate it to make it positive. Example: |-5| = -(-5) = 5. This piecewise definition forces us to analyze from the left and from the right separately.",
        },
        {
          expression: "f'_+(0) = \\lim_{h \\to 0^+} \\frac{|h|}{h}",
          annotation:
            "Right-hand derivative: h approaches 0 from the positive side, so h > 0 the whole time. Apply the h > 0 branch of the absolute value: |h| = h.",
        },
        {
          expression:
            "= \\lim_{h \\to 0^+} \\frac{h}{h} = \\lim_{h \\to 0^+} 1 = 1",
          annotation:
            "For h > 0: |h| = h, so the ratio is h/h = 1. Limit of the constant 1 is 1. Right-hand derivative = +1.",
        },
        {
          expression: "f'_-(0) = \\lim_{h \\to 0^-} \\frac{|h|}{h}",
          annotation:
            "Left-hand derivative: h approaches 0 from the negative side, so h < 0 the whole time. Apply the h < 0 branch: |h| = -h.",
        },
        {
          expression:
            "= \\lim_{h \\to 0^-} \\frac{-h}{h} = \\lim_{h \\to 0^-} (-1) = -1",
          annotation:
            "For h < 0: |h| = -h. So the ratio is (-h)/h = -1. Gotcha: h itself is negative here, which means -h is a positive number. But the RATIO (-h)/h simplifies to -1 for all h, positive or negative. The left-hand derivative = -1.",
        },
        {
          expression: "f'_+(0) = 1 \\neq -1 = f'_-(0)",
          annotation: "The two one-sided derivatives are not equal.",
        },
        {
          expression:
            "\\text{Prerequisite: two-sided limit exists} \\iff \\lim_{h \\to 0^-} = \\lim_{h \\to 0^+}",
          annotation:
            "Rule from Chapter 1: a two-sided limit exists if and only if both one-sided limits exist AND have the same value. Here the left limit is -1 and the right limit is +1. They disagree, so the two-sided limit does not exist.",
        },
        {
          expression: "\\therefore f'(0) \\text{ does not exist}",
          annotation:
            "The derivative at x = 0 does not exist. Geometrically: the graph of |x| has a corner at the origin. The left branch has slope -1; the right branch has slope +1. There is no single tangent line at a corner — two different lines are competing for the same point.",
        },
        {
          expression:
            "\\lim_{x \\to 0} |x| = 0 = f(0), \\text{ so } f \\text{ is continuous at } 0",
          annotation:
            "By contrast: is |x| at least continuous at 0? Yes — the limit equals the function value (both are 0). This confirms the one-way relationship: differentiability implies continuity, but continuity does NOT imply differentiability. |x| is the standard counterexample.",
        },
      ],
      conclusion:
        "|x| is continuous everywhere but not differentiable at x = 0. One-sided derivatives exist but disagree: +1 from the right, -1 from the left. The corner kills the derivative.",
      visualizations: [
        {
          id: "AbsoluteValueDiffViz",
          title: "See the Calculation on the Graph",
          mathBridge:
            "Each step in the worked example corresponds to something visible here. Steps 3-4: the green secant from $(0,0)$ to $(+h, h)$ has slope $h/h = 1$ — this is the right-hand derivative. Steps 5-6: the red secant to $(-h, h)$ has slope $|{-h}|/(-h) = h/(-h) = -1$ — this is the left-hand derivative. Slide $h$ all the way down to confirm both secants stay frozen at their slopes regardless of how small $h$ gets.",
          caption:
            "The two secants never converge — they are locked at +1 and -1 forever. That is why the limit does not exist and f is not differentiable at 0.",
        },
      ],
    },
    {
      id: "ch2-000-ex7",
      title: "Instantaneous Velocity from First Principles",
      problem:
        "\\text{A particle's position is } s(t) = 4t^2 + 3t \\text{ meters, } t \\text{ in seconds. Find its instantaneous velocity at } t = 2 \\text{ s.}",
      steps: [
        {
          expression:
            "v(t) = s'(t) = \\lim_{h \\to 0} \\frac{s(t+h) - s(t)}{h}",
          annotation:
            "Physical setup: instantaneous velocity is the derivative of position with respect to time. The same limit-of-difference-quotient formula applies — we just interpret the result as meters per second.",
        },
        {
          expression: "s(t+h) = 4(t+h)^2 + 3(t+h)",
          annotation:
            "Substitute (t+h) everywhere t appears in s(t) = 4t^2 + 3t. Two substitution sites: in the squared term and in the linear term.",
        },
        {
          expression: "4(t+h)^2 = 4(t^2 + 2th + h^2)",
          annotation:
            "Expand (t+h)^2 using (a+b)^2 = a^2 + 2ab + b^2, with a = t and b = h.",
        },
        {
          expression: "= 4t^2 + 8th + 4h^2",
          annotation:
            "Distribute 4 to each term: 4 times t^2 = 4t^2, 4 times 2th = 8th, 4 times h^2 = 4h^2.",
        },
        {
          expression: "3(t+h) = 3t + 3h",
          annotation: "Distribute 3: 3 times t = 3t, 3 times h = 3h.",
        },
        {
          expression: "s(t+h) = 4t^2 + 8th + 4h^2 + 3t + 3h",
          annotation:
            "Combine the two expanded pieces into the full expression for s(t+h).",
        },
        {
          expression:
            "s(t+h) - s(t) = (4t^2 + 8th + 4h^2 + 3t + 3h) - (4t^2 + 3t)",
          annotation:
            "Subtract s(t) = 4t^2 + 3t. Use parentheses around s(t) to protect every sign inside.",
        },
        {
          expression: "= 4t^2 + 8th + 4h^2 + 3t + 3h - 4t^2 - 3t",
          annotation: "Distribute the minus sign: -(4t^2 + 3t) = -4t^2 - 3t.",
        },
        {
          expression: "= 8th + 4h^2 + 3h",
          annotation:
            "Collect like terms: 4t^2 - 4t^2 = 0, 3t - 3t = 0. Three h-terms remain. Every surviving term contains h, as expected.",
        },
        {
          expression: "8th + 4h^2 + 3h = h(8t + 4h + 3)",
          annotation:
            "Prerequisite: factor h from all three terms. 8th = h times 8t. 4h^2 = h times 4h. 3h = h times 3. All three terms have h as a factor. Apply distributive law in reverse: h(8t + 4h + 3).",
        },
        {
          expression:
            "\\frac{s(t+h)-s(t)}{h} = \\frac{h(8t + 4h + 3)}{h} = 8t + 4h + 3",
          annotation:
            "Cancel h/h (legal: h is nonzero in the limit process). The simplified difference quotient is 8t + 4h + 3.",
        },
        {
          expression:
            "v(t) = \\lim_{h \\to 0}(8t + 4h + 3) = 8t + 3 \\text{ m/s}",
          annotation:
            "Take h to 0. The 4h term vanishes. Velocity function: v(t) = 8t + 3 m/s.",
        },
        {
          expression: "v(2) = 8(2) + 3 = 16 + 3 = 19 \\text{ m/s}",
          annotation:
            "Evaluate at t = 2 s. Instantaneous velocity at exactly 2 seconds is 19 m/s.",
        },
        {
          expression:
            "\\text{Units check: } \\frac{d}{dt}[\\text{meters}] = \\frac{\\text{meters}}{\\text{seconds}} = \\text{m/s}",
          annotation:
            "Units: the derivative of position (meters) with respect to time (seconds) always has units m/s. If you get different units, recheck your setup.",
        },
      ],
      conclusion:
        "Instantaneous velocity at t = 2 s is 19 m/s. The algebra is identical to ex1 — expand (t+h)^2, cancel terms, factor h, cancel h/h, substitute h = 0. Only the interpretation changes.",
    },
    {
      id: "ch2-000-ex8",
      title:
        "Galileo's Falling Ball: Velocity and Acceleration from First Principles",
      problem:
        "Galileo showed that objects fall with position $y(t) = \\frac{1}{2}g t^2$ (measured downward from rest), where $g \\approx 9.8$ m/s$^2$. Use the limit definition to find velocity $v(t) = y'(t)$, then find acceleration $a(t) = v'(t)$. Evaluate velocity at $t = 3$ s.",
      visualizationId: "ProjectileMotion",
      steps: [
        {
          expression: "v(t) = \\lim_{h \\to 0} \\frac{y(t+h) - y(t)}{h}",
          annotation:
            "Write the definition. Treat g as a constant (about 9.8) throughout — it is a fixed number, not a variable.",
        },
        {
          expression: "y(t+h) = \\frac{1}{2}g(t+h)^2",
          annotation:
            "Substitute (t+h) for t. The factor (1/2)g is a constant multiplier that passes through the expansion unchanged.",
        },
        {
          expression: "(t+h)^2 = t^2 + 2th + h^2",
          annotation:
            "Expand using (a+b)^2 = a^2 + 2ab + b^2 with a = t, b = h. Same rule as ex1.",
        },
        {
          expression:
            "y(t+h) = \\frac{g}{2}(t^2 + 2th + h^2) = \\frac{g}{2}t^2 + \\frac{g}{2} \\cdot 2th + \\frac{g}{2}h^2",
          annotation: "Distribute g/2 to each of the three terms.",
        },
        {
          expression: "= \\frac{g}{2}t^2 + gth + \\frac{g}{2}h^2",
          annotation:
            "Simplify the middle term: (g/2) times 2th = gth (the 2s cancel).",
        },
        {
          expression:
            "y(t+h) - y(t) = \\frac{g}{2}t^2 + gth + \\frac{g}{2}h^2 - \\frac{g}{2}t^2",
          annotation: "Subtract y(t) = (g/2)t^2. The (g/2)t^2 terms cancel.",
        },
        {
          expression: "= gth + \\frac{g}{2}h^2",
          annotation:
            "Two h-terms remain: gth and (g/2)h^2. Check: both contain h.",
        },
        {
          expression:
            "gth + \\frac{g}{2}h^2 = h \\cdot gt + h \\cdot \\frac{g}{2}h = h\\left(gt + \\frac{g}{2}h\\right)",
          annotation:
            "Factor h: gth = h times gt, and (g/2)h^2 = h times (g/2)h. Both terms contain h, apply the distributive law in reverse.",
        },
        {
          expression:
            "\\frac{y(t+h)-y(t)}{h} = \\frac{h(gt + \\frac{g}{2}h)}{h} = gt + \\frac{g}{2}h",
          annotation:
            "Cancel h/h (h is nonzero). Difference quotient equals gt + (g/2)h.",
        },
        {
          expression:
            "v(t) = \\lim_{h \\to 0}\\left(gt + \\frac{g}{2}h\\right) = gt",
          annotation:
            "Take h to 0. The (g/2)h term vanishes. Velocity function: v(t) = gt.",
        },
        {
          expression: "v(3) = 9.8 \\times 3 = 29.4 \\text{ m/s}",
          annotation:
            "At t = 3 s, the object is falling at 29.4 m/s. Plug in g = 9.8 and t = 3.",
        },
        {
          expression:
            "a(t) = v'(t) = \\lim_{h \\to 0} \\frac{v(t+h) - v(t)}{h} = \\lim_{h \\to 0} \\frac{g(t+h) - gt}{h}",
          annotation:
            "Find acceleration by differentiating velocity. v(t) = gt is a linear function — use the same definition.",
        },
        {
          expression:
            "= \\lim_{h \\to 0} \\frac{gt + gh - gt}{h} = \\lim_{h \\to 0} \\frac{gh}{h} = \\lim_{h \\to 0} g = g",
          annotation:
            "The gt terms cancel. gh/h = g (cancel h/h). Limit of constant g is g.",
        },
        {
          expression: "a(t) = g \\approx 9.8 \\text{ m/s}^2",
          annotation:
            "Acceleration is constant — the same 9.8 m/s^2 regardless of how long the object has been falling. Gotcha: constant acceleration does NOT mean constant velocity. Velocity v(t) = gt increases linearly with time. Constant acceleration means velocity increases by g every second — the change in velocity is steady, not the velocity itself.",
        },
      ],
      conclusion:
        "From y(t) = (1/2)gt^2: v(t) = gt, v(3) = 29.4 m/s, a(t) = g (constant). Galileo proved that all objects fall with the same constant acceleration regardless of mass — and here you derived it algebraically.",
    },
    {
      id: "ch2-000-ex9",
      title: "Full Quadratic — Profit Function",
      problem:
        "A company's weekly profit from selling $x$ units is $P(x) = -2x^2 + 120x - 500$ dollars. Find $P'(x)$ from first principles. Evaluate at $x = 20$ units and find the unit count that maximizes profit.",
      steps: [
        {
          expression: "P'(x) = \\lim_{h \\to 0} \\frac{P(x+h) - P(x)}{h}",
          annotation:
            "Write the definition. In economics, P'(x) is called marginal profit — the rate at which profit changes per additional unit sold.",
        },
        {
          expression: "P(x+h) = -2(x+h)^2 + 120(x+h) - 500",
          annotation:
            "Substitute (x+h) wherever x appears. Three terms: quadratic, linear, and constant.",
        },
        {
          expression: "-2(x+h)^2 = -2(x^2 + 2xh + h^2)",
          annotation: "Expand (x+h)^2 first using (a+b)^2 = a^2 + 2ab + b^2.",
        },
        {
          expression: "= -2x^2 - 4xh - 2h^2",
          annotation:
            "Distribute -2 to every term: -2 times x^2 = -2x^2, -2 times 2xh = -4xh, -2 times h^2 = -2h^2. The negative coefficient distributes to all three.",
        },
        {
          expression: "120(x+h) = 120x + 120h",
          annotation: "Distribute 120.",
        },
        {
          expression: "P(x+h) = -2x^2 - 4xh - 2h^2 + 120x + 120h - 500",
          annotation: "Combine all expanded pieces.",
        },
        {
          expression:
            "P(x+h) - P(x) = (-2x^2 - 4xh - 2h^2 + 120x + 120h - 500) - (-2x^2 + 120x - 500)",
          annotation:
            "Subtract P(x) with parentheses. The entire expression (-2x^2 + 120x - 500) gets negated.",
        },
        {
          expression:
            "= -2x^2 - 4xh - 2h^2 + 120x + 120h - 500 + 2x^2 - 120x + 500",
          annotation:
            "Prerequisite: distribute the minus sign. -(-2x^2 + 120x - 500) = +2x^2 - 120x + 500. Every sign inside the parentheses flips.",
        },
        {
          expression: "= -4xh - 2h^2 + 120h",
          annotation:
            "Collect like terms: -2x^2 + 2x^2 = 0, 120x - 120x = 0, -500 + 500 = 0. Three h-terms survive. Good — every remaining term has h.",
        },
        {
          expression: "-4xh - 2h^2 + 120h = h(-4x - 2h + 120)",
          annotation:
            "Factor h: -4xh = h times (-4x), -2h^2 = h times (-2h), 120h = h times 120. All three terms share h as a factor. Apply distributive law in reverse.",
        },
        {
          expression: "\\frac{P(x+h)-P(x)}{h} = -4x - 2h + 120",
          annotation: "Cancel h/h (h nonzero in the limit).",
        },
        {
          expression: "P'(x) = \\lim_{h \\to 0}(-4x - 2h + 120) = -4x + 120",
          annotation: "Take h to 0. The -2h term vanishes.",
        },
        {
          expression:
            "P'(20) = -4(20) + 120 = -80 + 120 = \\$40 \\text{ per unit}",
          annotation:
            "Marginal profit at x = 20 is $40 per unit. If you sell the 21st unit, profit increases by approximately $40.",
        },
        {
          expression: "P'(x) = 0 \\Rightarrow -4x + 120 = 0",
          annotation:
            "Prerequisite algebra — finding a zero of a linear expression: set P'(x) = 0 and solve.",
        },
        {
          expression: "4x = 120 \\Rightarrow x = 30",
          annotation:
            "Add 4x to both sides: 4x = 120. Divide both sides by 4: x = 30. At x = 30, slope of the profit curve is zero — the profit is at its peak. Below 30 units, P'(x) > 0 (profit growing). Above 30, P'(x) < 0 (profit shrinking). This is a preview of optimization — finding maximum/minimum values using derivatives.",
        },
        {
          expression:
            "P(30) = -2(30)^2 + 120(30) - 500 = -1800 + 3600 - 500 = \\$1300",
          annotation:
            "Maximum weekly profit is $1,300, achieved at exactly 30 units.",
        },
      ],
      conclusion:
        "P'(x) = -4x + 120. Marginal profit at x = 20 is $40/unit. Maximum profit ($1300) occurs at x = 30 units where P'(30) = 0.",
    },
    {
      id: "ch2-000-ex10",
      title: "Rational Function — Dose-Response Model",
      problem:
        "The fraction of drug receptors activated at dose $x$ follows $f(x) = \\dfrac{x}{x+1}$. Find $f'(x)$ from the limit definition. This tells a pharmacologist how sensitive receptor activation is to a small change in dose.",
      steps: [
        {
          expression:
            "f'(x) = \\lim_{h \\to 0} \\frac{\\dfrac{x+h}{x+h+1} - \\dfrac{x}{x+1}}{h}",
          annotation:
            "Write the definition and substitute. f(x+h) means replace x with (x+h) in x/(x+1): get (x+h)/((x+h)+1) = (x+h)/(x+h+1). The result is a compound fraction whose numerator is a difference of two rational expressions.",
        },
        {
          expression:
            "\\text{LCD of } (x+h+1) \\text{ and } (x+1) \\text{ is } (x+h+1)(x+1)",
          annotation:
            "Prerequisite: to subtract rational expressions, convert both to a common denominator. These two denominators share no common factor (h makes them different), so the LCD is their product.",
        },
        {
          expression:
            "\\frac{x+h}{x+h+1} - \\frac{x}{x+1} = \\frac{(x+h)(x+1) - x(x+h+1)}{(x+h+1)(x+1)}",
          annotation:
            "Convert both fractions to the LCD and combine into one fraction by subtracting the numerators.",
        },
        {
          expression: "(x+h)(x+1) = x^2 + x + xh + h",
          annotation:
            "Expand using FOIL: x times x = x^2, x times 1 = x, h times x = xh, h times 1 = h.",
        },
        {
          expression: "x(x+h+1) = x^2 + xh + x",
          annotation:
            "Distribute x: x times x = x^2, x times h = xh, x times 1 = x.",
        },
        {
          expression:
            "(x+h)(x+1) - x(x+h+1) = (x^2 + x + xh + h) - (x^2 + xh + x)",
          annotation: "Write the subtraction of both expanded numerators.",
        },
        {
          expression: "= x^2 + x + xh + h - x^2 - xh - x = h",
          annotation:
            "Distribute the minus sign and collect like terms: x^2 - x^2 = 0, x - x = 0, xh - xh = 0. Only h remains. The numerator collapses to a single h.",
        },
        {
          expression:
            "\\frac{f(x+h)-f(x)}{h} = \\frac{1}{h} \\cdot \\frac{h}{(x+h+1)(x+1)} = \\frac{1}{(x+h+1)(x+1)}",
          annotation:
            "The full difference quotient: divide the fraction difference by h. The h from the numerator cancels the h we are dividing by.",
        },
        {
          expression:
            "f'(x) = \\lim_{h \\to 0} \\frac{1}{(x+h+1)(x+1)} = \\frac{1}{(x+1)^2}",
          annotation:
            "Substitute h = 0: (x+h+1) becomes (x+1). Denominator becomes (x+1)^2.",
        },
        {
          expression: "f'(x) = \\frac{1}{(x+1)^2}",
          annotation:
            "The derivative is always positive — receptor activation always increases with dose. But f'(x) shrinks as x grows. At dose 0: f'(0) = 1 (steep response, each extra unit of drug has big effect). At dose 9: f'(9) = 1/100 (nearly saturated, extra drug has tiny effect). This is diminishing returns — a universal biological pattern.",
        },
      ],
      conclusion:
        "f'(x/(x+1)) = 1/(x+1)^2. Key algebra: combine the fraction difference using LCD, let the numerator simplify to h, then cancel h with the division by h.",
    },
    {
      id: "ch2-000-ex11",
      title: "Marginal Cost and the Approximation Error",
      problem:
        "A factory's total daily cost is $C(x) = 0.02x^2 + 40x + 300$ dollars to produce $x$ units. Find marginal cost $C'(x)$ from first principles. Evaluate at $x = 100$ and compute the actual cost of the 101st unit to see how close the derivative approximation is.",
      steps: [
        {
          expression: "C'(x) = \\lim_{h \\to 0} \\frac{C(x+h) - C(x)}{h}",
          annotation:
            "Marginal cost is the derivative of total cost. Economic interpretation: C'(x) is the approximate cost of producing one more unit when already producing x.",
        },
        {
          expression: "C(x+h) = 0.02(x+h)^2 + 40(x+h) + 300",
          annotation: "Substitute (x+h) wherever x appears.",
        },
        {
          expression:
            "0.02(x+h)^2 = 0.02(x^2 + 2xh + h^2) = 0.02x^2 + 0.04xh + 0.02h^2",
          annotation:
            "Expand (x+h)^2, then distribute 0.02: 0.02 times x^2 = 0.02x^2, 0.02 times 2xh = 0.04xh, 0.02 times h^2 = 0.02h^2.",
        },
        {
          expression: "40(x+h) = 40x + 40h",
          annotation: "Distribute 40.",
        },
        {
          expression: "C(x+h) - C(x) = 0.04xh + 0.02h^2 + 40h",
          annotation:
            "Subtract C(x) = 0.02x^2 + 40x + 300. All non-h terms cancel: 0.02x^2 - 0.02x^2 = 0, 40x - 40x = 0, 300 - 300 = 0. Three h-terms remain.",
        },
        {
          expression: "= h(0.04x + 0.02h + 40)",
          annotation:
            "Factor h: 0.04xh = h times 0.04x, 0.02h^2 = h times 0.02h, 40h = h times 40. Apply distributive law in reverse.",
        },
        {
          expression:
            "C'(x) = \\lim_{h \\to 0}(0.04x + 0.02h + 40) = 0.04x + 40",
          annotation:
            "Cancel h/h, take h to 0. Marginal cost function: C'(x) = 0.04x + 40.",
        },
        {
          expression:
            "C'(100) = 0.04(100) + 40 = 4 + 40 = \\$44 \\text{ per unit}",
          annotation: "Derivative says the 101st unit costs approximately $44.",
        },
        {
          expression: "C(101) = 0.02(101)^2 + 40(101) + 300",
          annotation:
            "Now compute the exact cost at 101 units to verify the approximation.",
        },
        {
          expression: "101^2 = (100+1)^2 = 10000 + 200 + 1 = 10201",
          annotation:
            "Prerequisite: expand 101^2 using (a+b)^2 = a^2 + 2ab + b^2 with a = 100, b = 1.",
        },
        {
          expression:
            "C(101) = 0.02(10201) + 40(101) + 300 = 204.02 + 4040 + 300 = 4544.02",
          annotation:
            "Arithmetic: 0.02 times 10201 = 204.02, 40 times 101 = 4040.",
        },
        {
          expression:
            "C(100) = 0.02(10000) + 4000 + 300 = 200 + 4000 + 300 = 4500.00",
          annotation: "Cost at exactly 100 units.",
        },
        {
          expression: "C(101) - C(100) = 4544.02 - 4500.00 = \\$44.02",
          annotation: "Exact cost of producing the 101st unit: $44.02.",
        },
        {
          expression: "C'(100) = \\$44 \\approx \\$44.02 = C(101) - C(100)",
          annotation:
            "The derivative approximation ($44) is very close to the exact discrete cost ($44.02). The $0.02 error exists because the derivative measures the instantaneous rate at x = 100, but the actual question asks about a finite step from 100 to 101. As the step size shrinks (say, a half unit instead of a full unit), the approximation error also shrinks. This is the fundamental link between derivatives and differences.",
        },
      ],
      conclusion:
        "C'(x) = 0.04x + 40. At x = 100, C'(100) = $44/unit. Actual cost of 101st unit = $44.02. The derivative gives a linear approximation; the error of $0.02 comes from the quadratic term.",
    },
    {
      id: "ch2-000-ex12",
      title: "Rate of Cooling — Newton's Law Word Problem",
      problem:
        "A casserole at 400°F cools after removal from the oven. Its temperature model is $T(t) = 400 - 150t + 20t^2$ (degrees F, $t$ in hours, $0 \\leq t \\leq 4$). Find $T'(t)$ from first principles. Evaluate at $t = 1$ hr and find when cooling is fastest.",
      steps: [
        {
          expression: "T'(t) = \\lim_{h \\to 0} \\frac{T(t+h) - T(t)}{h}",
          annotation:
            "T'(t) gives instantaneous rate of temperature change in degrees F per hour. A negative value means the temperature is dropping.",
        },
        {
          expression: "T(t+h) = 400 - 150(t+h) + 20(t+h)^2",
          annotation: "Substitute (t+h) for t. Three terms need expansion.",
        },
        {
          expression: "-150(t+h) = -150t - 150h",
          annotation:
            "Distribute -150. Note: -150 times h = -150h (negative coefficient, so h-term is negative).",
        },
        {
          expression: "20(t+h)^2 = 20(t^2 + 2th + h^2) = 20t^2 + 40th + 20h^2",
          annotation: "Expand (t+h)^2 then distribute 20.",
        },
        {
          expression: "T(t+h) = 400 - 150t - 150h + 20t^2 + 40th + 20h^2",
          annotation: "Assemble the full expansion.",
        },
        {
          expression:
            "T(t+h) - T(t) = (400 - 150t - 150h + 20t^2 + 40th + 20h^2) - (400 - 150t + 20t^2)",
          annotation: "Subtract T(t) = 400 - 150t + 20t^2 with parentheses.",
        },
        {
          expression: "= -150h + 40th + 20h^2",
          annotation:
            "Collect like terms: 400 - 400 = 0, -150t + 150t = 0, 20t^2 - 20t^2 = 0. Three h-terms remain.",
        },
        {
          expression: "-150h + 40th + 20h^2 = h(-150 + 40t + 20h)",
          annotation:
            "Factor h: -150h = h times (-150), 40th = h times 40t, 20h^2 = h times 20h. All three share h.",
        },
        {
          expression: "T'(t) = \\lim_{h \\to 0}(-150 + 40t + 20h) = -150 + 40t",
          annotation: "Cancel h/h, take h to 0.",
        },
        {
          expression: "T'(1) = -150 + 40(1) = -110 \\;{^\\circ}\\text{F/hr}",
          annotation:
            "At t = 1 hour, temperature is dropping at 110 degrees F per hour. Negative sign confirms cooling.",
        },
        {
          expression:
            "\\text{Units: } T \\text{ in }^\\circ\\text{F},\\; t \\text{ in hours} \\Rightarrow T'(t) \\text{ in }^\\circ\\text{F/hr}",
          annotation:
            "Units check: derivative of temperature (degrees F) with respect to time (hours) must be degrees-F per hour.",
        },
        {
          expression:
            "T'(t) = -150 + 40t \\text{ is an increasing function of } t",
          annotation:
            "The cooling rate T'(t) has slope +40 with respect to t. As t increases, T'(t) becomes less negative — the food cools more slowly over time. This matches Newton's law of cooling: cooling rate is proportional to the temperature difference from the surroundings.",
        },
        {
          expression:
            "T'(0) = -150 \\;{^\\circ}\\text{F/hr} \\text{ (fastest cooling)}",
          annotation:
            "Cooling is fastest at t = 0, the moment the casserole is removed. The temperature difference from room temperature is greatest then. As it cools, the difference shrinks and the rate of cooling slows.",
        },
      ],
      conclusion:
        "T'(t) = -150 + 40t deg-F/hr. At t = 1 hr, T'(1) = -110 deg-F/hr. Fastest cooling is at t = 0: T'(0) = -150 deg-F/hr.",
    },
    {
      id: "ch2-000-ex13",
      title: "Building the Power Rule: f(x) = x\\u2074",
      problem:
        "f(x) = x^4. \\text{ Find } f'(x) \\text{ from the limit definition. Then compare your results from ex1, ex2, and this example to state the general power rule pattern.}",
      steps: [
        {
          expression: "f'(x) = \\lim_{h \\to 0} \\frac{(x+h)^4 - x^4}{h}",
          annotation:
            "Set up the definition. The challenge: expand (x+h)^4 completely.",
        },
        {
          expression: "(x+h)^4 = [(x+h)^2]^2",
          annotation:
            "Prerequisite strategy: do not expand (x+h)^4 all at once. Instead, rewrite it as [(x+h)^2]^2, use the result (x+h)^2 = x^2 + 2xh + h^2 from ex1, then square that result. Breaking into two steps makes the algebra manageable.",
        },
        {
          expression: "= (x^2 + 2xh + h^2)^2",
          annotation:
            "Substitute (x+h)^2 = x^2 + 2xh + h^2. Now we need to square this trinomial.",
        },
        {
          expression: "= (x^2 + 2xh + h^2)(x^2 + 2xh + h^2)",
          annotation: "Write it as the trinomial times itself.",
        },
        {
          expression:
            "= x^2(x^2 + 2xh + h^2) + 2xh(x^2 + 2xh + h^2) + h^2(x^2 + 2xh + h^2)",
          annotation:
            "Prerequisite: distribute each of the three terms in the first factor across the entire second factor. Three groups — one per term.",
        },
        {
          expression:
            "= (x^4 + 2x^3 h + x^2 h^2) + (2x^3 h + 4x^2 h^2 + 2xh^3) + (x^2 h^2 + 2xh^3 + h^4)",
          annotation:
            "Expand each group. x^2 times x^2 = x^4, x^2 times 2xh = 2x^3 h, x^2 times h^2 = x^2 h^2. Then 2xh times each term. Then h^2 times each term.",
        },
        {
          expression: "= x^4 + 4x^3 h + 6x^2 h^2 + 4xh^3 + h^4",
          annotation:
            "Collect like terms: 2x^3 h + 2x^3 h = 4x^3 h. x^2 h^2 + 4x^2 h^2 + x^2 h^2 = 6x^2 h^2. 2xh^3 + 2xh^3 = 4xh^3. The coefficients 1, 4, 6, 4, 1 match row 4 of Pascal's triangle — this is the binomial theorem.",
        },
        {
          expression:
            "= \\lim_{h \\to 0} \\frac{4x^3 h + 6x^2 h^2 + 4xh^3 + h^4}{h}",
          annotation:
            "Substitute into the difference quotient. Cancel x^4 - x^4 = 0. Four h-terms remain.",
        },
        {
          expression:
            "= \\lim_{h \\to 0} \\frac{h(4x^3 + 6x^2 h + 4xh^2 + h^3)}{h}",
          annotation:
            "Factor h from all four terms: 4x^3 h = h(4x^3), 6x^2 h^2 = h(6x^2 h), 4xh^3 = h(4xh^2), h^4 = h(h^3).",
        },
        {
          expression: "= \\lim_{h \\to 0}(4x^3 + 6x^2 h + 4xh^2 + h^3) = 4x^3",
          annotation:
            "Cancel h/h, take h to 0. The three h-containing terms vanish. Only 4x^3 survives.",
        },
        {
          expression: "f(x) = x^2 \\Rightarrow f'(x) = 2x^1",
          annotation:
            "Pattern review — n = 2: exponent 2 became coefficient 2, new power is 1.",
        },
        {
          expression: "f(x) = x^3 \\Rightarrow f'(x) = 3x^2",
          annotation: "n = 3: exponent 3 became coefficient 3, new power is 2.",
        },
        {
          expression: "f(x) = x^4 \\Rightarrow f'(x) = 4x^3",
          annotation: "n = 4: exponent 4 became coefficient 4, new power is 3.",
        },
        {
          expression: "\\frac{d}{dx}[x^n] = nx^{n-1}",
          annotation:
            "Power rule — observed pattern: the exponent drops down as the leading coefficient, and the new exponent is n - 1. You have now confirmed this for n = 2, 3, and 4 by grinding through the limit definition. The next lesson proves this for all n using the binomial theorem. Once proved, you will never have to repeat this process — you will just use the rule instantly. But you needed to see where it comes from.",
        },
      ],
      conclusion:
        "f'(x^4) = 4x^3. Confirmed: the power rule pattern d/dx[x^n] = nx^{n-1} holds for n = 2, 3, 4. The next lesson proves it for all n.",
    },
    {
      id: "ch2-000-ex14",
      title: "Derivative of a Quadratic with Linear Term: x² + 3x",
      problem:
        "\\text{Let } f(x) = x^2 + 3x. \\text{ Use the limit definition to find } f'(x). \\text{ Then evaluate } f'(2) \\text{ and interpret the result as slope and marginal change.}",
      steps: [
        {
          expression: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}",
          annotation:
            "Always begin with the exact limit definition. This is the fundamental algorithm for every derivative we compute from first principles. Never skip it — it keeps sign errors and algebra mistakes visible.",
        },
        {
          expression: "f(x+h) = (x+h)^2 + 3(x+h)",
          annotation:
            "Substitute (x+h) for every occurrence of x in the original function. There are two places: inside the square and in the linear term.",
        },
        {
          expression: "(x+h)^2 = x^2 + 2xh + h^2",
          annotation:
            "Prerequisite algebra from ex1: expand the square using (a+b)^2 = a^2 + 2ab + b^2. Do not write (x+h)^2 as x^2 + h^2 — the middle term 2xh is essential and is the most common early mistake.",
        },
        {
          expression: "3(x+h) = 3x + 3h",
          annotation:
            "Distribute the 3. The coefficient 3 multiplies both x and h.",
        },
        {
          expression: "f(x+h) = x^2 + 2xh + h^2 + 3x + 3h",
          annotation: "Combine both expanded pieces.",
        },
        {
          expression:
            "f(x+h) - f(x) = (x^2 + 2xh + h^2 + 3x + 3h) - (x^2 + 3x)",
          annotation:
            "Write the subtraction with full parentheses around f(x) to protect every sign when distributing the negative.",
        },
        {
          expression: "= x^2 + 2xh + h^2 + 3x + 3h - x^2 - 3x",
          annotation:
            "Distribute the minus: every term in f(x) flips sign. This is another high-error step — forgetting to change the sign of 3x is common.",
        },
        {
          expression: "= 2xh + h^2 + 3h",
          annotation:
            "Cancel like terms: x^2 - x^2 = 0 and 3x - 3x = 0. Only terms containing h survive — this is the expected pattern in any derivative calculation.",
        },
        {
          expression: "2xh + h^2 + 3h = h(2x + h + 3)",
          annotation:
            "Factor h out of every term using the distributive property in reverse: each piece contains h (2xh = h·2x, h^2 = h·h, 3h = h·3). Verify by distributing back if needed.",
        },
        {
          expression: "= \\lim_{h \\to 0} \\frac{h(2x + h + 3)}{h}",
          annotation:
            "Substitute the factored form back into the difference quotient.",
        },
        {
          expression: "= \\lim_{h \\to 0} (2x + h + 3)",
          annotation:
            "Cancel h/h = 1. This cancellation is valid because h approaches 0 but is never actually zero during the process — we are not dividing by zero.",
        },
        {
          expression: "= 2x + 0 + 3 = 2x + 3",
          annotation:
            "Now safely substitute h = 0. The h term disappears, leaving the derivative function.",
        },
        {
          expression: "f'(x) = 2x + 3",
          annotation:
            "The derivative is 2x + 3. Pattern check: the derivative of x^2 is 2x (from ex1), the derivative of 3x is 3 (from the linear case in ex5), and constants would give 0. The operations are linear — derivatives respect addition.",
        },
        {
          expression: "f'(2) = 2(2) + 3 = 7",
          annotation:
            "Evaluate at x = 2. This is the slope of the tangent line to the curve at the point where x = 2 (the point itself is (2, f(2)) = (2, 4 + 6) = (2, 10)).",
        },
      ],
      conclusion:
        "f'(x) = 2x + 3. At x = 2 the slope is 7. This example shows how the derivative of a sum is the sum of the derivatives — a preview of the linearity of differentiation that we will prove formally later. Algebra keys: always expand fully before subtracting, factor h completely, and remember why h/h cancellation is legal in the limit.",
    },
  ],

  discovery: [
    {
      title: `How Fast Is My Driver Going Right Now?`,
      persona: `I'm a race engineer for a NASCAR team at Talladega Superspeedway. My driver is 3 laps from the finish, locked in a drafting battle for second place. I have a GPS unit that gives me his exact position at any moment. I need to know his speed at the exact instant he exits Turn 4 — because that's when the slingshot draft window opens. Not his average lap speed. Not his speed "around" that point. His speed at that exact instant.`,
      steps: [
        {
          phase: "need",
          title: `The tool I have: average speed`,
          content: `The formula every engineer knows:

$$\\text{average speed} = \\frac{\\text{distance traveled}}{\\text{time elapsed}} = \\frac{\\Delta p}{\\Delta t}$$

where $\\Delta p$ is the change in position and $\\Delta t$ is the time interval.

I have GPS data so I can read off position $p$ at any moment $t$. If I pick two moments — say $t_1 = 46$ seconds and $t_2 = 47$ seconds — I can compute:

$$\\text{average speed} = \\frac{p(47) - p(46)}{47 - 46} = \\frac{p(47) - p(46)}{1 \\text{ second}}$$

This formula is clean, exact, and requires nothing more than subtraction and division. I've been using it my whole career.`,
        },
        {
          phase: "need",
          title: `Why average speed isn't enough`,
          content: `The problem: in the last 2 seconds before Turn 4 exit, my driver braked to hit the apex, then floored the throttle coming out. That 2-second window contains braking, coasting, and full acceleration.

If I compute average speed over that 2 seconds and get 192 mph, that number is a blend. He might have been going 175 mph at the apex and 209 mph at exit. The average hides the real value.

The draft window opens **exactly** at the exit point. I need to know his speed at **exactly** $t = 47$ seconds — the moment the GPS marks the exit line.

Not "between $t = 46$ and $t = 48$." Not "around $t = 47$." The exact instant $t = 47$.`,
        },
        {
          phase: "need",
          title: `My formula collapses at a single instant`,
          content: `So I try to apply the average speed formula at exactly $t = 47$:

$$\\text{speed at } t = 47 = \\frac{p(47) - p(47)}{47 - 47} = \\frac{0}{0}$$

Zero divided by zero. Undefined. My formula gives no answer.

This isn't a rounding error or a data problem. It's a fundamental breakdown: **the average speed formula requires an interval.** A "speed at a single point in time" has no change in position and no change in time. There is nothing to divide.

For 2,000 years, this was the state of things. You could measure average speed. You could not, in any rigorous sense, measure speed at an instant. Aristotle even argued that motion at an instant was a contradiction in terms.

I need a new tool. My current one literally cannot answer the question.`,
        },
        {
          phase: "discovery",
          title: `Try a smaller window — does the average get more accurate?`,
          content: `If I can't use an interval of zero length, what about a very *small* interval?

Instead of measuring from $t = 46$ to $t = 47$, I measure from $t = 46.9$ to $t = 47$. A tenth of a second. Much less time for braking and acceleration to distort the reading.

My GPS gives position as $p(t) = 290t - 15t^2$ (feet from the reference line, $t$ in seconds from the start of the run). Let's compute average speed over progressively shorter windows ending at $t = 0$ (I'll reset my clock so "Turn 4 exit" is $t = 0$):

$$\\text{average speed} = \\frac{p(h) - p(0)}{h} \\quad \\text{for smaller and smaller } h$$

where $h$ is the window length in seconds.

| Window $h$ | $p(h)$ (feet) | $p(0)$ (feet) | Average speed (ft/s) | mph |
|---|---|---|---|---|
| $h = 1$ s | $275$ | $0$ | $275$ ft/s | 188 mph |
| $h = 0.1$ s | $28.85$ | $0$ | $288.5$ ft/s | 197 mph |
| $h = 0.01$ s | $2.8985$ | $0$ | $289.85$ ft/s | 198 mph |
| $h = 0.001$ s | $0.28999$ | $0$ | $289.99$ ft/s | 198 mph |

The numbers are changing. But they're not jumping around randomly — **they're converging.**`,
        },
        {
          phase: "discovery",
          title: `I see the pattern — write the algebra`,
          content: `The convergence isn't a coincidence. Let me write the average speed formula **algebraically** and see what's happening:

$$\\frac{p(h) - p(0)}{h}$$

Substitute $p(t) = 290t - 15t^2$:

$$p(h) = 290h - 15h^2 \\qquad p(0) = 290(0) - 15(0)^2 = 0$$

So:

$$\\frac{p(h) - p(0)}{h} = \\frac{290h - 15h^2 - 0}{h} = \\frac{h(290 - 15h)}{h}$$

As long as $h \\neq 0$, I can cancel the $h$:

$$= 290 - 15h$$

Now I can see exactly why the table converged:

| $h$ | $290 - 15h$ | ft/s |
|---|---|---|
| $1$ | $290 - 15 = 275$ | 188 mph |
| $0.1$ | $290 - 1.5 = 288.5$ | 197 mph |
| $0.01$ | $290 - 0.15 = 289.85$ | 198 mph |
| $0.001$ | $290 - 0.015 = 289.985$ | 198 mph |

The $-15h$ term is the source of all the "blending" — the contamination from the braking phase. As $h$ shrinks, that contamination shrinks too. It approaches zero. What's left is $290$.`,
        },
        {
          phase: "discovery",
          title: `The answer appears — without ever dividing by zero`,
          content: `The expression $290 - 15h$ approaches $290$ as $h$ gets small. I never need $h$ to actually equal zero. I just need to ask: **what value does the expression approach?**

$$\\text{As } h \\to 0: \\quad 290 - 15h \\to 290 - 15(0) = 290 \\text{ ft/s}$$

That is the instantaneous speed at $t = 0$: **290 ft/s**, which converts to:

$$290 \\frac{\\text{ft}}{\\text{s}} \\times \\frac{3600 \\text{ s}}{1 \\text{ hr}} \\times \\frac{1 \\text{ mile}}{5280 \\text{ ft}} \\approx 197.7 \\text{ mph}$$

I avoided $0/0$ entirely. The key move was:
1. Expand the numerator
2. Factor out $h$
3. Cancel $h$ (legal since $h \\neq 0$)
4. Ask what the result approaches as $h \\to 0$

Step 4 is the limit. I used it in Chapter 1 to resolve $0/0$ fractions. This is the same tool — here it's resolving "the speed at an instant."

My driver is hitting the Turn 4 exit line at **197.7 mph**. The draft window is open.`,
        },
        {
          phase: "formalization",
          title: `Name the process: Newton's difference quotient`,
          content: `What I just did has a name. For any function $f$ (position, temperature, profit — anything), the expression:

$$\\frac{f(t + h) - f(t)}{h}$$

is called the **difference quotient** (Newton called it the "method of fluxions" in the 1660s; Leibniz independently called his version "differentials").

The limit of the difference quotient as $h \\to 0$ is the **derivative** of $f$ at $t$:

$$f'(t) = \\lim_{h \\to 0} \\frac{f(t+h) - f(t)}{h}$$

This is the formal definition of the derivative. In our case:
- $f(t) = 290t - 15t^2$ (position)
- $f'(t)$ = instantaneous speed (velocity) at time $t$

The difference quotient is the average speed over a window of width $h$. The derivative is what that average stabilizes to as the window collapses to a point.

**Notation:** mathematicians use several equivalent symbols for the derivative:

$$f'(t) = \\frac{df}{dt} = \\frac{dp}{dt} = \\dot{f}(t)$$

All mean the same thing: the instantaneous rate of change of $f$ with respect to $t$.`,
        },
        {
          phase: "formalization",
          title: `Compute $p'(t)$ — not just at one moment, but at every moment`,
          content: `The big payoff: I don't have to repeat the whole process every time. Let me compute $p'(t)$ for a **general** time $t$ (not just $t = 0$):

$$p(t) = 290t - 15t^2$$

**Step 1 — Write the difference quotient:**

$$\\frac{p(t+h) - p(t)}{h}$$

**Step 2 — Expand $p(t+h)$:**

$$p(t+h) = 290(t+h) - 15(t+h)^2 = 290t + 290h - 15t^2 - 30th - 15h^2$$

**Step 3 — Subtract $p(t)$ and simplify:**

$$p(t+h) - p(t) = 290h - 30th - 15h^2 = h(290 - 30t - 15h)$$

**Step 4 — Divide by $h$ (cancel, since $h \\neq 0$):**

$$\\frac{p(t+h) - p(t)}{h} = 290 - 30t - 15h$$

**Step 5 — Take the limit as $h \\to 0$:**

$$p'(t) = \\lim_{h \\to 0}(290 - 30t - 15h) = 290 - 30t$$

**The velocity function:** $p'(t) = 290 - 30t$ ft/s.

This single formula gives my driver's speed at **every** moment $t$:
- At $t = 0$ (Turn 4 exit): $290 - 0 = 290$ ft/s = 197.7 mph ✓
- At $t = 5$ s (mid-straightaway): $290 - 150 = 140$ ft/s = 95 mph (braking for Turn 1)
- At $t = 9.67$ s: $290 - 290 = 0$ ft/s (momentarily stopped, deepest brake point)

What started as a single unanswerable question — "how fast at one instant?" — became a machine that answers it for every instant at once.`,
        },
      ],
      resolution: `**The derivative, rebuilt from one question:**

$$f'(t) = \\lim_{h \\to 0} \\frac{f(t+h) - f(t)}{h}$$

**The four-step process (always the same):**

1. Write $\\dfrac{f(t+h) - f(t)}{h}$
2. Expand $f(t+h)$ by substituting $(t+h)$ everywhere $t$ appears
3. Simplify — every term without an $h$ will cancel; factor $h$ from what remains
4. Cancel $h$ from numerator and denominator, then take the limit as $h \\to 0$

**What we avoided:** we never divided by zero. We divided by $h$ while $h \\neq 0$, then asked what value the result *approaches*. That is exactly the limit from Chapter 1 — same idea, new application.

**What it gives you:** not a single speed at a single moment, but a new function $f'(t)$ — the velocity function — that answers the question for every moment simultaneously.

Newton invented this in 1666 to describe planetary motion. You just re-invented it to solve a NASCAR drafting problem. The question was different; the math was identical.`,
    },
    {
      title: "The Overtake: Discovering Instantaneous Speed",
      persona:
        "I'm a NASCAR driver on the final lap at Daytona. I'm running side-by-side with the leader, but I have to decide in the next half-second whether to pull out and go for the pass. The spotter just gave me my average speed over the last 2 seconds (198 mph), but that's not enough. I need to know my exact speed **right now** — at this precise instant — because if I'm still accelerating, I have more speed coming; if I'm already at the limit, I don't. Average speed tells me what happened in the past. I need the speed at one frozen moment. How do I get it from the data I actually have?",
      steps: [
        {
          phase: "need",
          title: "What I already know — and why it fails me at 200 mph",
          content:
            "I know how to calculate average speed. If I travel 396 feet in 2 seconds, my average speed is 198 mph. That's simple division:\n\n$$\\text{average speed} = \\frac{\\text{distance}}{\\text{time}}$$\n\nBut right now I need the speed **at one exact instant** — the moment I decide to pull out. If I use the 2-second average, I'm basing my decision on data from the past 2 seconds, not on what my car is doing **right now**. The car could be speeding up or slowing down inside that interval. Average speed hides the truth at the exact moment I need it.\n\nThis is the gap: algebra gives me averages over intervals, but racing demands the rate of change at a single point. My existing tools break here.",
        },
        {
          phase: "need",
          title: "Trying smaller intervals — the first hint",
          content:
            "I ask the spotter for shorter intervals. Here's what we get for my position data around the critical moment (t = 0 is right now):\n\n| Interval length | Time interval | Distance traveled | Average speed |\n|---|---|---|---|\n| 2.0 s | –1 to +1 s | 396 ft | 198 mph |\n| 1.0 s | –0.5 to +0.5 s | 198.5 ft | 198.5 mph |\n| 0.5 s | –0.25 to +0.25 s | 99.4 ft | 198.8 mph |\n| 0.1 s | –0.05 to +0.05 s | 19.92 ft | 199.2 mph |\n\nThe numbers are getting closer and closer to 200 mph as the interval shrinks. But I still don't have the speed at the exact instant — only averages over smaller and smaller slices of time. How small does the slice have to be before I can trust the number as the true speed right now?",
        },
        {
          phase: "discovery",
          title: "Building the rate manually — finite differences",
          content:
            "I realize I can write the average speed over any tiny interval of length h as:\n\n$$\\text{average speed over } h = \\frac{s(t + h) - s(t)}{h}$$\n\nwhere s(t) is my position at time t. This is just the old distance-over-time formula, but now applied to a tiny slice.\n\nI don't know s(t) exactly, but I can measure it at many points. So I compute this expression for smaller and smaller h:\n\n- h = 1.0 s → 198.5 mph\n- h = 0.5 s → 198.8 mph\n- h = 0.1 s → 199.2 mph\n- h = 0.01 s → 199.92 mph\n- h = 0.001 s → 199.992 mph\n\nThe values are clearly approaching 200 mph. No matter how small I make the interval, the number stabilizes at 200. This is not coincidence — it's the car telling me its true speed at that exact moment.",
        },
        {
          phase: "discovery",
          title: "The breakthrough — what if the interval never reaches zero?",
          content:
            "I can't actually make h = 0 (that would be dividing by zero). But I can make h as small as my measurement equipment allows. The pattern is clear: as h gets closer to zero, the average speed over that tiny interval gets closer and closer to a single fixed number.\n\nThat fixed number is the **instantaneous speed** at the exact moment t. It is the limit of the average speeds as the time slice shrinks to nothing.\n\nI write it as:\n\n$$\\text{instantaneous speed at } t = \\lim_{h \\to 0} \\frac{s(t + h) - s(t)}{h}$$\n\nThis is the quantity I actually need on the track. It tells me my true speed right now, not an average from the recent past.",
        },
        {
          phase: "formalization",
          title: "Compressing the idea — the derivative is born",
          content:
            "We have reconstructed the idea from raw measurements and repeated calculations. Now we give it a name and a symbol so we can use it quickly.\n\nThe expression we built is called the **derivative** of the position function s(t) at the point t. We write it:\n\n$$s'(t) = \\lim_{h \\to 0} \\frac{s(t + h) - s(t)}{h}$$\n\nor, using the common notation for instantaneous rate of change:\n\n$$\\frac{ds}{dt} = \\lim_{h \\to 0} \\frac{\\Delta s}{\\Delta t}$$\n\nThis single symbol $s'(t)$ or $\\dfrac{ds}{dt}$ is just a compressed way of saying \"the limiting value of the average speed as the time interval shrinks to zero.\"\n\nThe derivative is not a new invention — it is the precise mathematical way to capture the instantaneous rate we already discovered on the track.",
        },
        {
          phase: "formalization",
          title: "Why this matters on the track — and everywhere else",
          content:
            "Back on the Daytona straightaway, I now have a tool. My position function (from the car's sensors) gives me s(t). I compute s'(t) at the critical moment and get exactly 200 mph. That tells me I am still accelerating and will have more speed in the next half-second — enough to complete the pass safely.\n\nThe same limiting process works for any changing quantity:\n- speed from position\n- population growth rate from population data\n- inflation rate from price data\n- voltage change from a sensor reading\n\nWhenever we need the rate at one exact instant, we use the same limit-of-average-rates construction we just rebuilt.",
        },
      ],
      resolution:
        '**The derivative — earned from first principles**\n\nWe started with the real problem a NASCAR driver actually faces: average speed is not enough when you need the speed **right now**. We tried smaller and smaller intervals, computed average rates manually, watched the numbers stabilize, and discovered the limit process. Only then did we give it the name and notation "derivative."\n\n**The four-step discovery process we just used (and will use for every calculus concept):**\n1. **Need** — show where everyday algebra or averages fail.\n2. **Discovery** — build the answer with finite, measurable steps and repeated calculations.\n3. **Limit behavior** — watch what happens as the interval shrinks.\n4. **Formalization** — compress the repeated process into clean notation.\n\nThis is how calculus is born on the track: not from definitions first, but from a problem that demands an instantaneous rate. The derivative is the tool we invented to answer that demand.\n\nNow every time you see $\\dfrac{ds}{dt}$ you will remember: it is the limiting value of $\\dfrac{\\Delta s}{\\Delta t}$ as $\\Delta t \\to 0$ — the exact speed at one frozen moment.',
    },
    {
      title: "How Fast Is My Battery Dying?",
      persona:
        "I'm sitting in a long meeting with 28% battery left on my phone. I need to know: will it last until the end of the meeting, or should I start looking for a charger right now? The phone says '2 hours 10 minutes remaining,' but that number keeps changing. I want to know the **real rate** at which my battery is draining **right now**, not an average guess. How can I figure that out from the data I actually have?",
      steps: [
        {
          phase: "need",
          title: "What I already know — and why it fails me",
          content:
            "I know how to calculate average battery drain. If my phone went from 100% to 28% in 4 hours, the average drain rate is:\n\n$$\\text{average rate} = \\frac{100 - 28}{4} = 18\\% \\text{ per hour}$$\n\nThat's simple subtraction and division. But right now I need something more precise. The '2 hours 10 minutes remaining' estimate keeps jumping around — sometimes it says 2 hours 30 minutes, sometimes 1 hour 50 minutes. That tells me the drain rate is **not constant**. It changes depending on what I'm doing (screen brightness, apps running, signal strength).\n\nAverage rate over the whole day doesn't help me decide whether I’ll make it through the next 90 minutes. I need the **instantaneous drain rate** at this exact moment. My old algebra tools give me averages over intervals, but they break when I need the rate right now.",
        },
        {
          phase: "need",
          title: "Trying smaller time windows",
          content:
            "I start recording the battery percentage every few minutes during the meeting:\n\n| Time elapsed (minutes) | Battery % left | Average drain rate over this interval |\n|---|---|---|\n| 0 | 28% | — |\n| 5 | 26.8% | 1.2% per 5 min = 14.4%/hour |\n| 10 | 25.5% | 1.3% per 5 min = 15.6%/hour |\n| 15 | 24.1% | 1.4% per 5 min = 16.8%/hour |\n| 20 | 22.6% | 1.5% per 5 min = 18%/hour |\n\nAs I look at shorter and shorter time windows, the calculated average drain rate is increasing. It seems to be heading toward something around 20% per hour. But I still only have averages — never the exact rate at one single moment.",
        },
        {
          phase: "discovery",
          title: "Building the rate manually with tiny slices",
          content:
            "I realize I can write the average drain rate over any small time interval h as:\n\n$$\\text{average drain rate over } h = \\frac{B(t) - B(t + h)}{h}$$\n\nwhere B(t) is the battery percentage at time t. (Note the negative sign will appear naturally because battery is decreasing.)\n\nI keep taking smaller slices:\n\n- Over 5 minutes: ≈ 14.4 %/hour\n- Over 2 minutes: ≈ 16.8 %/hour\n- Over 1 minute: ≈ 18.6 %/hour\n- Over 30 seconds: ≈ 19.6 %/hour\n- Over 10 seconds: ≈ 19.92 %/hour\n\nThe numbers are clearly approaching 20 % per hour as the time slice gets smaller. I can't make the interval zero (that would divide by zero), but the pattern is unmistakable: there is a definite rate at which the battery is draining **right now**.",
        },
        {
          phase: "discovery",
          title: "The key insight — the limit of shrinking intervals",
          content:
            "Even though I can never reach a time interval of exactly zero, I can get as close as my phone’s update rate allows. As the interval shrinks toward zero, the average drain rate over that tiny slice stabilizes at a single value.\n\nThat stable value is the **instantaneous drain rate** at this exact moment.\n\nI can write it formally as:\n\n$$\\text{instantaneous drain rate at time } t = \\lim_{h \\to 0} \\frac{B(t) - B(t + h)}{h}$$\n\nThis is the number I actually need. If it’s 20 % per hour right now, then in the next 90 minutes (1.5 hours) I should expect to lose about 30 % battery — meaning I’ll be down to roughly –2 % (i.e., dead) before the meeting ends. Time to find a charger.",
        },
        {
          phase: "formalization",
          title: "Compressing the idea — the derivative",
          content:
            "We have rebuilt the concept from real measurements and repeated calculations. Now we give it a clean name and symbol so we can use it efficiently.\n\nThe expression we constructed is called the **derivative** of the battery function B(t) at time t. We write it:\n\n$$B'(t) = \\lim_{h \\to 0} \\frac{B(t) - B(t + h)}{h}$$\n\nor, using the common rate-of-change notation:\n\n$$\\frac{dB}{dt} = \\lim_{h \\to 0} \\frac{\\Delta B}{\\Delta t}$$\n\nThe negative value (–20 %/hour) tells us the battery is decreasing. The derivative is not a mysterious new invention — it is simply the precise way to capture the instantaneous rate we already discovered by shrinking the time slices.",
        },
        {
          phase: "formalization",
          title: "Why this matters in everyday life",
          content:
            "This same limiting process applies to any quantity that changes over time:\n- How fast is my gas tank emptying while driving?\n- How quickly is the temperature rising in the oven?\n- How fast is traffic speed changing on my commute?\n- How rapidly is my bank account balance changing with spending?\n\nWhenever we need the rate **at one exact instant** instead of an average over a period, we use the same construction: take smaller and smaller intervals, compute the average rate over each, and take the limit as the interval shrinks to zero.\n\nThat limit is the derivative.",
        },
      ],
      resolution:
        "**The derivative — earned from real life**\n\nWe started with a practical problem almost everyone faces: the phone’s 'remaining time' estimate is unreliable because drain rate changes. We tried smaller time windows, computed average rates manually, watched the numbers stabilize, and discovered the limit process. Only then did we name it the derivative.\n\n**The discovery process we just used:**\n1. **Need** — Show where averages fail for decisions that need the current rate.\n2. **Discovery** — Compute average rates over smaller and smaller finite intervals.\n3. **Limit behavior** — Observe the numbers approaching a stable value.\n4. **Formalization** — Compress the repeated process into the notation $\\dfrac{dB}{dt}$.\n\nThis is how calculus concepts should be born: from a real question we actually care about, rebuilt step by step, with symbols introduced only as useful compression at the end.\n\nNext time your phone says '2 hours remaining,' you’ll know what question to ask: what is the **instantaneous** drain rate right now?",
    },
  ],

  challenges: [
    {
      id: "ch2-000-ch1",
      difficulty: "easy",
      problem:
        "Use the limit definition of the derivative to find the equation of the tangent line to f(x) = 2x^2 - 3x at x = 1.",
      hint: "First find f'(x) using the definition, then evaluate at x = 1 to get the slope. Use f(1) for the y-coordinate of the point.",
      walkthrough: [
        {
          expression:
            "f'(x) = \\lim_{h \\to 0} \\frac{[2(x+h)^2 - 3(x+h)] - [2x^2 - 3x]}{h}",
          annotation:
            "Set up the difference quotient for f(x) = 2x\u00b2 - 3x.",
        },
        {
          expression:
            "= \\lim_{h \\to 0} \\frac{2(x^2+2xh+h^2) - 3x - 3h - 2x^2 + 3x}{h}",
          annotation:
            "Expand (x+h)\u00b2 = x\u00b2+2xh+h\u00b2 and distribute the 2 and -3.",
        },
        {
          expression:
            "= \\lim_{h \\to 0} \\frac{2x^2 + 4xh + 2h^2 - 3x - 3h - 2x^2 + 3x}{h}",
          annotation: "Distribute fully.",
        },
        {
          expression: "= \\lim_{h \\to 0} \\frac{4xh + 2h^2 - 3h}{h}",
          annotation: "Cancel: 2x\u00b2 - 2x\u00b2 = 0 and -3x + 3x = 0.",
        },
        {
          expression: "= \\lim_{h \\to 0} (4x + 2h - 3) = 4x - 3",
          annotation: "Factor h and cancel, then let h \u2192 0.",
        },
        {
          expression: "f'(1) = 4(1) - 3 = 1, \\quad f(1) = 2(1)^2 - 3(1) = -1",
          annotation: "Evaluate slope f'(1) = 1 and y-coordinate f(1) = -1.",
        },
        {
          expression: "y - (-1) = 1 \\cdot (x - 1) \\implies y = x - 2",
          annotation: "Use point-slope form with point (1, -1) and slope 1.",
        },
      ],
      answer: "y = x - 2",
    },
    {
      id: "ch2-000-ch2",
      difficulty: "medium",
      problem:
        "Prove from the limit definition that \\dfrac{d}{dx}[x^4] = 4x^3. You will need the expansion (x+h)^4 = x^4 + 4x^3h + 6x^2h^2 + 4xh^3 + h^4.",
      hint: "Expand (x+h)^4 using the given binomial expansion, subtract x^4, divide by h, then let h\u21920. Identify which terms survive after h\u21920.",
      walkthrough: [
        {
          expression:
            "\\frac{d}{dx}[x^4] = \\lim_{h \\to 0} \\frac{(x+h)^4 - x^4}{h}",
          annotation: "Apply the limit definition.",
        },
        {
          expression:
            "= \\lim_{h \\to 0} \\frac{(x^4 + 4x^3 h + 6x^2 h^2 + 4xh^3 + h^4) - x^4}{h}",
          annotation: "Substitute the binomial expansion of (x+h)^4.",
        },
        {
          expression:
            "= \\lim_{h \\to 0} \\frac{4x^3 h + 6x^2 h^2 + 4xh^3 + h^4}{h}",
          annotation: "Cancel x^4 - x^4 = 0.",
        },
        {
          expression: "= \\lim_{h \\to 0} (4x^3 + 6x^2 h + 4xh^2 + h^3)",
          annotation:
            "Divide every term in the numerator by h. Every term had at least one factor of h.",
        },
        {
          expression: "= 4x^3 + 0 + 0 + 0 = 4x^3",
          annotation:
            "Let h \u2192 0. Every term containing h vanishes. Only 4x\u00b3 survives.",
        },
      ],
      answer: "\\dfrac{d}{dx}[x^4] = 4x^3",
    },
    {
      id: "ch2-000-ch3",
      difficulty: "hard",
      problem:
        "Let f(x) = x\\sin(1/x) for x \\neq 0 and f(0) = 0. Prove that f is differentiable at x = 0 by evaluating the limit definition directly. Use the Squeeze Theorem.",
      hint: "Set up the difference quotient at a = 0. You will have [f(h) - f(0)] / h = h\u00b7sin(1/h) / h = sin(1/h). But sin(1/h) oscillates wildly — think about what bounds sin always satisfies, then squeeze.",
      walkthrough: [
        {
          expression:
            "f'(0) = \\lim_{h \\to 0} \\frac{f(0+h) - f(0)}{h} = \\lim_{h \\to 0} \\frac{f(h) - 0}{h}",
          annotation: "Write the derivative at x = 0 using f(0) = 0.",
        },
        {
          expression: "= \\lim_{h \\to 0} \\frac{h \\sin(1/h)}{h}",
          annotation:
            "Substitute f(h) = h\u00b7sin(1/h) (valid for h \u2260 0, which is exactly what the limit requires).",
        },
        {
          expression: "= \\lim_{h \\to 0} \\sin\\left(\\frac{1}{h}\\right)",
          annotation:
            "Cancel h/h. Now we have the limit of sin(1/h) as h \u2192 0. This limit does NOT exist in the ordinary sense — sin(1/h) oscillates infinitely often near h = 0.",
        },
        {
          expression:
            "-1 \\leq \\sin\\left(\\frac{1}{h}\\right) \\leq 1 \\quad \\text{for all } h \\neq 0",
          annotation:
            "Wait — we made an error above. We should NOT have canceled so quickly. Let us restart from the difference quotient before canceling.",
        },
        {
          expression:
            "\\frac{f(h) - f(0)}{h} = \\frac{h \\sin(1/h)}{h} = \\sin(1/h)? \\quad \\text{Hmm — but this limit does not exist!}",
          annotation:
            "This seems to show f is NOT differentiable at 0. But wait — go back to the un-canceled form: f(h)/h = sin(1/h). Indeed this has no limit. So... is f differentiable?",
        },
        {
          expression:
            "\\text{Reconsider: } \\frac{f(h)}{h} = \\frac{h\\sin(1/h)}{h} = \\sin(1/h)",
          annotation:
            "The cancellation is correct. The issue is that sin(1/h) does NOT have a limit as h\u21920. Therefore f'(0) does not exist for f(x) = x\u00b7sin(1/x). This function is actually NOT differentiable at 0.",
        },
        {
          expression: "\\text{Compare with } g(x) = x^2 \\sin(1/x),\\; g(0)=0",
          annotation:
            "The function x\u00b7sin(1/x) is NOT differentiable at 0. The differentiable version requires the extra factor of x. With g(x) = x\u00b2\u00b7sin(1/x), the difference quotient becomes h\u00b7sin(1/h), which DOES go to 0 by the Squeeze Theorem.",
        },
        {
          expression:
            "g'(0) = \\lim_{h\\to 0} \\frac{h^2 \\sin(1/h)}{h} = \\lim_{h\\to 0} h\\sin(1/h)",
          annotation:
            "For g(x) = x\u00b2 sin(1/x), the difference quotient reduces to h\u00b7sin(1/h).",
        },
        {
          expression: "-|h| \\leq h\\sin(1/h) \\leq |h|",
          annotation:
            "Since |sin(1/h)| \u2264 1 for all h \u2260 0, we have |h\u00b7sin(1/h)| \u2264 |h|, giving the squeeze inequality.",
        },
        {
          expression:
            "\\lim_{h\\to 0}(-|h|) = 0 \\leq \\lim_{h\\to 0} h\\sin(1/h) \\leq \\lim_{h\\to 0}|h| = 0",
          annotation:
            "Both bounding functions approach 0 as h \u2192 0. By the Squeeze Theorem, the middle term also approaches 0.",
        },
        {
          expression: "\\therefore g'(0) = 0",
          annotation:
            "The Squeeze Theorem gives g'(0) = 0. So g(x) = x\u00b2\u00b7sin(1/x) IS differentiable at 0, with derivative 0.",
        },
      ],
      answer:
        "f(x) = x\\sin(1/x) \\text{ is NOT differentiable at } 0. \\text{ The correct differentiable version is } g(x) = x^2\\sin(1/x),\\text{ for which } g'(0) = 0 \\text{ by the Squeeze Theorem.}",
    },
    {
      id: "ch2-000-ch4",
      difficulty: "hard",
      problem:
        "Let $f(x) = \\begin{cases} x^2 & x \\leq 1 \\\\ 2x - 1 & x > 1 \\end{cases}$. Is $f$ differentiable at $x = 1$? Compute both one-sided difference quotients.",
      hint: "Compute the left-hand and right-hand limits of [f(1+h)−f(1)]/h separately. For h<0, use the x² branch; for h>0, use the 2x−1 branch. Check if they agree.",
      walkthrough: [
        {
          expression: "f(1) = 1^2 = 1",
          annotation: "At x=1 we use the left branch: f(1)=1.",
        },
        {
          expression:
            "f'_-(1) = \\lim_{h \\to 0^-}\\frac{(1+h)^2 - 1}{h} = \\lim_{h \\to 0^-}\\frac{1+2h+h^2-1}{h} = \\lim_{h \\to 0^-}(2+h) = 2",
          annotation:
            "For h<0, 1+h<1 so use the x² branch. Factor and cancel h.",
        },
        {
          expression:
            "f'_+(1) = \\lim_{h \\to 0^+}\\frac{[2(1+h)-1] - 1}{h} = \\lim_{h \\to 0^+}\\frac{2h}{h} = 2",
          annotation:
            "For h>0, 1+h>1 so use the 2x−1 branch. f(1+h)=2(1+h)−1=1+2h.",
        },
        {
          expression: "f'_-(1) = 2 = f'_+(1)",
          annotation: "Both one-sided derivatives agree.",
        },
        {
          expression: "f'(1) = 2",
          annotation:
            "Since the one-sided limits match, f is differentiable at x=1 with derivative 2.",
        },
      ],
      answer:
        "f is differentiable at x=1 with f'(1)=2. Both pieces meet smoothly: the parabola's slope at x=1 is 2x|_{x=1}=2, which matches the linear piece's slope of 2.",
    },
  ],

  crossRefs: [
    {
      lessonSlug: "continuity",
      label: "Limits and Continuity",
      context:
        "The derivative is defined as a limit; the limit laws and squeeze theorem are essential tools.",
    },
    {
      lessonSlug: "differentiation-rules",
      label: "Differentiation Rules",
      context:
        "The limit definition motivates and proves the power rule and other shortcuts.",
    },
    {
      lessonSlug: "linear-approximation",
      label: "Linear Approximation",
      context:
        "The tangent line at a point is the best linear approximation to the function near that point.",
    },
  ],

  // ─── Spiral Learning ───────────────────────────────────────────────
  spiral: {
    recoveryPoints: [
      {
        lessonId: "ch0-lines",
        label: "Slope formula (Chapter 0)",
        note: "The difference quotient [f(x+h)-f(x)]/h IS the slope formula \u0394y/\u0394x with \u0394x = h. \u0394y/\u0394x is the slope of a line through two points — the derivative is that formula with h \u2192 0. If slope between two points feels rusty, review it now: lines have constant slope, curves need a limit because slope changes at every point.",
      },
      {
        lessonId: "ch1-limits-intro",
        label: "Limits (Chapter 1)",
        note: "The derivative is defined as a limit. The 0/0 indeterminate form and the algebra of cancelling h in the difference quotient are the exact same techniques from Chapter 1. If you feel shaky on limits, revisit them now — you will use them in every derivative calculation in this lesson.",
      },
      {
        lessonId: "ch1-continuity",
        label: "Chapter 1: Continuity",
        note: "We now prove (not just assume) that differentiable \u21d2 continuous. The theorem is short: if the limit of the difference quotient exists and is finite, the function cannot have a jump. Understanding why requires the limit product rule you learned in Chapter 1.",
      },
    ],
    futureLinks: [
      {
        lessonId: "ch2-differentiation-rules",
        label: "Differentiation rules (next lesson)",
        note: "Every shortcut rule (power, product, quotient) is a theorem proved exactly once from the limit definition you learn here, then used freely ever after. Computing (x+h)^100 from scratch would take a page; the power rule makes it three seconds.",
      },
      {
        lessonId: "ch5-integration-intro",
        label: "Chain rule",
        note: "The chain rule depends on understanding that the limit process is the foundation of every derivative — knowing why the definition works makes the chain rule proof transparent. The limit definition you master here is the starting point for every derivative rule in the course.",
      },
    ],
  },

  // ─── Assessment: Mastery Check ────────────────────────────────────────────
  assessment: {
    questions: [
      {
        id: "deriv-assess-1",
        type: "input",
        text: "The difference quotient [f(x+h)-f(x)]/h represents the slope of what kind of line?",
        answer: "secant",
        hint: "It passes through TWO points on the curve. As h\u21920, this line approaches the tangent.",
      },
      {
        id: "deriv-assess-2",
        type: "input",
        text: "Using the limit definition, what is d/dx[x\u00b2]?",
        answer: "2x",
        hint: "Expand (x+h)\u00b2, subtract x\u00b2, divide by h, cancel h, then let h\u21920.",
      },
      {
        id: "deriv-assess-3",
        type: "choice",
        text: "If f is differentiable at a, then f is:",
        options: [
          "Necessarily continuous at a",
          "Necessarily discontinuous at a",
          "May or may not be continuous",
          "Continuous everywhere except a",
        ],
        answer: "Necessarily continuous at a",
        hint: "Differentiability \u21d2 Continuity (proven in the Rigor section). The converse is false: |x| is continuous but not differentiable at 0.",
      },
      {
        id: "deriv-assess-4",
        type: "input",
        text: "What is the equation of the tangent line to f(x) = x\u00b2 at the point (3, 9)?",
        answer: "y=6x-9",
        hint: "f'(3) = 2(3) = 6. Then use point-slope: y - 9 = 6(x - 3), simplify to y = 6x - 9.",
      },
      {
        id: "deriv-assess-5",
        type: "choice",
        text: "The function f(x) = |x| is NOT differentiable at x=0 because:",
        options: [
          "It is discontinuous at x=0",
          "The left and right-hand derivatives are unequal (+1 and -1)",
          "The limit does not exist",
          "The function is undefined at x=0",
        ],
        answer: "The left and right-hand derivatives are unequal (+1 and -1)",
        hint: "It is continuous (no hole), but it has a CORNER. From the right, slope = +1. From the left, slope = -1. They disagree, so no derivative exists.",
      },
    ],
  },

  // ─── Mental Model Compression ─────────────────────────────────────────────
  mentalModel: [
    "Derivative = Limit of (\u0394y / \u0394x) as \u0394x \u2192 0",
    "Tangent Slope = Instantaneous Rate of Change",
    "Corner = Continuous + Not Differentiable",
    "f\u2019(x) = new function (slope at every point of f)",
  ],

  checkpoints: [
    "read-intuition",
    "read-math",
    "read-rigor",
    "completed-example-1",
    "completed-example-2",
    "completed-example-3",
    "completed-example-4",
    "completed-example-5",
    "completed-example-6",
    "completed-example-7",
    "attempted-challenge-easy",
    "attempted-challenge-medium",
    "attempted-challenge-hard",
  ],

  quiz: [
    {
      id: "tangent-q1",
      type: "choice",
      text: "What is the difference quotient for a function $f$ at $x$?",
      options: [
        "$f(x+h) \\cdot f(x) / h$",
        "$\\dfrac{f(x+h) - f(x)}{h}$",
        "$\\dfrac{f(x) - f(x+h)}{x}$",
        "$f'(x+h)$",
      ],
      answer: "$\\dfrac{f(x+h) - f(x)}{h}$",
      hints: [
        "It is rise over run between two points on the curve separated by h.",
      ],
      reviewSection: "Intuition tab — difference quotient definition",
    },
    {
      id: "tangent-q2",
      type: "choice",
      text: "When you plug $h = 0$ directly into the difference quotient you get $0/0$. Why does the derivative still exist?",
      options: [
        "Because $0/0 = 0$ by convention",
        "Because we take the limit as $h \\to 0$, which is different from evaluating at $h = 0$",
        "Because we use L'Hôpital's Rule immediately",
        "Because the function must be linear near $x$",
      ],
      answer:
        "Because we take the limit as $h \\to 0$, which is different from evaluating at $h = 0$",
      hints: [
        "Recall from Ch.1: a limit asks what the expression approaches, not its value at the point.",
      ],
      reviewSection: "Intuition tab — why the limit resolves the 0/0 form",
    },
    {
      id: "tangent-q3",
      type: "input",
      text: "Use the limit definition to find $f'(x)$ for $f(x) = x^2$. Simplify the difference quotient and evaluate the limit.",
      answer: "2*x",
      hints: [
        "Expand $(x+h)^2 = x^2 + 2xh + h^2$, subtract $x^2$, divide by $h$, then let $h \\to 0$.",
      ],
      reviewSection: "Math tab — limit definition examples",
    },
    {
      id: "tangent-q4",
      type: "input",
      text: "Use the limit definition to find $f'(x)$ for $f(x) = 3x + 5$.",
      answer: "3",
      hints: [
        "$f(x+h) = 3(x+h)+5 = 3x+3h+5$. Subtract $f(x)$, divide by $h$, take limit.",
      ],
      reviewSection: "Math tab — constant and linear functions",
    },
    {
      id: "tangent-q5",
      type: "input",
      text: "Use the limit definition to find $f'(x)$ for $f(x) = x^3$.",
      answer: "3*x^2",
      hints: [
        "Expand $(x+h)^3 = x^3 + 3x^2h + 3xh^2 + h^3$, cancel $x^3$, divide by $h$, then let $h \\to 0$.",
      ],
      reviewSection: "Math tab — limit definition with cubic",
    },
    {
      id: "tangent-q6",
      type: "input",
      text: "Find the slope of the tangent line to $f(x) = x^2$ at $x = 3$ using the derivative.",
      answer: "6",
      hints: [
        "First find $f'(x) = 2x$ from the limit definition, then evaluate at $x = 3$.",
      ],
      reviewSection:
        "Intuition tab — tangent line slope equals derivative value",
    },
    {
      id: "tangent-q7",
      type: "input",
      text: "Use the limit definition to find $f'(x)$ for $f(x) = \\dfrac{1}{x}$.",
      answer: "-1/x^2",
      hints: [
        "$f(x+h) - f(x) = \\frac{1}{x+h} - \\frac{1}{x}$. Find a common denominator, simplify, divide by $h$, take the limit.",
      ],
      reviewSection: "Math tab — limit definition with rational functions",
    },
    {
      id: "tangent-q8",
      type: "input",
      text: "For $f(x) = x^2 - 4x$, the difference quotient simplifies to $2x + h - 4$. What is $f'(x)$?",
      answer: "2*x - 4",
      hints: ["Let $h \\to 0$ in the simplified difference quotient."],
      reviewSection: "Math tab — evaluating the limit of a difference quotient",
    },
    {
      id: "tangent-q9",
      type: "choice",
      text: "Which of the following is true about a function that is differentiable at $x = a$?",
      options: [
        "It may be discontinuous at $x = a$",
        "It must be continuous at $x = a$",
        "It must be a polynomial near $x = a$",
        "Its graph must be a straight line near $x = a$",
      ],
      answer: "It must be continuous at $x = a$",
      hints: [
        "Differentiability implies continuity — but the converse is not always true.",
      ],
      reviewSection: "Rigor tab — differentiability implies continuity",
    },
    {
      id: "tangent-q10",
      type: "choice",
      text: "Why is $f(x) = |x|$ not differentiable at $x = 0$, even though it is continuous there?",
      options: [
        "Because $f(0) = 0$",
        "Because the left-hand and right-hand limits of the difference quotient disagree ($-1$ vs $+1$)",
        "Because the function has a jump discontinuity at $0$",
        "Because the limit definition gives $0/0$ with no resolution",
      ],
      answer:
        "Because the left-hand and right-hand limits of the difference quotient disagree ($-1$ vs $+1$)",
      hints: [
        "Approach $x=0$ from the right: slope = +1. From the left: slope = -1. They must agree for the derivative to exist.",
      ],
      reviewSection: "Rigor tab — corner at the origin",
    },
  ],
};
