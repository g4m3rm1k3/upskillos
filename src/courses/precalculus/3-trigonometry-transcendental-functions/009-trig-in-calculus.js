export default {
  id: 'precalc3-002',
  slug: 'trig-in-calculus',
  chapter: 'precalc-3',
  order: 9,
  title: 'Trig in Calculus: Knowing Which Identity to Reach For',
  subtitle: 'The pattern-matching layer between trig identities and calculus problems',
  tags: ['trig substitution', 'chain rule', 'integration', 'trig derivatives', 'strategy'],
  aliases: 'trig substitution integral sin cos chain rule calculus strategy which identity',

  hook: {
    question: 'You see $\\int \\sqrt{1 - x^2}\\, dx$. What do you do first — and why does $x = \\sin\\theta$ magically work?',
    realWorldContext: 'In signal processing, Fourier transforms decompose any signal into trig components. The integrals that arise are exactly the type covered here. In mechanics, the period of a pendulum involves an elliptic integral that requires trig substitution to approximate. Knowing the pattern lets you see the structure before you compute.',
    previewVisualizationId: 'TrigSubstitutionViz',
  },

  intuition: {
    prose: [
      'Trig shows up in calculus in three distinct situations, each with its own strategy. Recognizing which situation you\'re in is more than half the work.',
      'Situation 1: you\'re differentiating a trig function (possibly composed with something else). This is chain rule territory. The inner function tells you what to multiply by.',
      'Situation 2: you\'re integrating a power of $\\sin$ or $\\cos$. The exponent tells you the strategy: odd power → factor one out and use $u$-sub. Even power → power reduction identity first.',
      'Situation 3: you see $\\sqrt{a^2 - x^2}$, $\\sqrt{a^2 + x^2}$, or $\\sqrt{x^2 - a^2}$ under a radical. This screams trig substitution — the substitution is chosen so the Pythagorean identity eliminates the radical entirely.',
      '**The Sine Approximation**: For very small angles, $\\sin x$ is indistinguishable from $x$. This logical bridge—the "Linearization" of circular motion—is why physics formulas for pendulums and waves can be simplified into linear equations at the limit.',
      '**The Harmonic Slope**: Differentiating a wave reveals its velocity. The slope of a Sine wave is exactly the value of a Cosine wave. When the shadow of a rotating wheel moves fastest (at the origin), the cosine is at its peak. This physical synchrony is the heart of oscillatory calculus.',
    ],
    callouts: [
      {
        type: 'proof-map',
        title: 'Three trig situations — three different moves',
        body: '\\text{Differentiating trig} \\to \\text{chain rule} \\qquad \\text{Integrating } \\sin^n/\\cos^n \\to \\text{parity strategy} \\qquad \\sqrt{a^2 \\pm x^2} \\to \\text{trig substitution}',
      },
      {
        type: 'insight',
        title: 'Why trig substitution works geometrically',
        body: '\\sqrt{1 - x^2} \\text{ is the height of a point on a unit circle at horizontal position } x. \\text{ Setting } x = \\sin\\theta \\text{ makes } \\sqrt{1-x^2} = \\cos\\theta \\text{ — a leg of the same right triangle.}',
      },
      {
        type: 'insight',
        title: 'Linguistic Learner: The Instantaneous Limit',
        body: '\\text{"Limit" comes from the Latin "Limes" (a boundary or threshold).} \\\\ \\text{Trig in calculus is the art of pushing the boundary. "Instantaneous" change is simply the average change over a distance that becomes infinitely small.}',
      },
      {
        type: 'insight',
        title: 'Logical Learner: The Sine Approximation',
        body: '\\text{Why is } \\lim_{x \\to 0} \\frac{\\sin x}{x} = 1 \\text{?} \\\\ \\text{Logic: As the arc shrinks, the vertical height and the arc length become identical.} \\\\ \\text{In the limit, the curve and the straight line are one.}',
      },
      {
        type: 'insight',
        title: 'Physical Learner: The Harmonic Slope',
        body: '\\text{Visualize a mass on a spring.} \\\\ \\text{The position is a sine wave. The velocity (the derivative) is a cosine wave. The velocity is highest when the position is zero (passing the center), and zero when the position is maxed. Calculus is the language of this trade-off.}',
      },
      {
        type: 'insight',
        title: 'Visual Learner: The Squeeze Theorem',
        body: '\\text{Imagine a thin slice of pizza (a sector) squashed between two triangles.} \\\\ \\text{One triangle is smaller (height } \\sin x\\text{), one is larger (height } \\tan x\\text{). As the slice gets thinner, the area of the three shapes must converge to the same point.}',
      },
    ],
    visualizations: [
      {
        id: 'TrigSubstitutionViz',
        title: 'Why $x = \\sin\\theta$ Kills the Radical',
        mathBridge: 'The substitution $x = \\sin\\theta$ is not a trick — it is the unit circle. $\\sqrt{1 - x^2}$ is literally $\\cos\\theta$ in the same right triangle.',
        caption: 'Drag $x$ along the circle to see how $\\sqrt{1 - x^2}$ corresponds to $\\cos\\theta$.',
      },
                                    {
        id: 'ChainRuleCompositionViz',
        title: 'Two Function Machines — Inner and Outer',
        mathBridge: 'Pick any composition. See x flow through inner g then outer f. The chain rule assembles from the two derivatives.',
      },
      {
        id: 'ChainRuleZoomViz',
        title: 'Shrinking Δx — Why Derivatives Multiply',
        mathBridge: 'Shrink Δx to zero. Watch Δy/Δx converge to f\'(g(x))·g\'(x). The proof without a single limit symbol.',
      },
      {
        id: 'ChainRuleRatesViz',
        title: 'Rates Multiplying — Leibniz Notation',
        mathBridge: 'Two analogies: unit conversion chain and gear train. Both show why dy/dx = (dy/du)·(du/dx).',
      },
    ],
  },

  math: {
    prose: [
      'The derivatives of all six trig functions follow from $\\frac{d}{dx}\\sin x = \\cos x$ and the quotient rule. You should be able to derive $\\frac{d}{dx}\\tan x = \\sec^2 x$ on demand — it takes three lines.',
      'For integration strategy with $\\sin^m x\\cos^n x$: if either exponent is odd, save one copy of that function and convert the rest using $\\sin^2 + \\cos^2 = 1$, then $u$-substitute. If both are even, power reduce first.',
      'The trig substitution table is derived from three Pythagorean identities. You are not memorizing three arbitrary substitutions — you are choosing which Pythagorean identity will eliminate the square root.',
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'Trig Derivatives (the six you must know cold)',
        body: '\\frac{d}{dx}\\sin x = \\cos x \\quad \\frac{d}{dx}\\cos x = -\\sin x \\quad \\frac{d}{dx}\\tan x = \\sec^2 x \\\\ \\frac{d}{dx}\\csc x = -\\csc x\\cot x \\quad \\frac{d}{dx}\\sec x = \\sec x\\tan x \\quad \\frac{d}{dx}\\cot x = -\\csc^2 x',
      },
      {
        type: 'theorem',
        title: 'Trig Substitution Table — read from the radical',
        body: '\\sqrt{a^2 - x^2} \\to x = a\\sin\\theta \\quad (\\text{uses } 1 - \\sin^2 = \\cos^2) \\\\ \\sqrt{a^2 + x^2} \\to x = a\\tan\\theta \\quad (\\text{uses } 1 + \\tan^2 = \\sec^2) \\\\ \\sqrt{x^2 - a^2} \\to x = a\\sec\\theta \\quad (\\text{uses } \\sec^2 - 1 = \\tan^2)',
      },
      {
        type: 'insight',
        title: 'Odd-power integration strategy',
        body: '\\int \\sin^5 x\\cos^2 x\\,dx: \\quad \\text{odd power of sin} \\Rightarrow \\text{factor out } \\sin x, \\text{ convert } \\sin^4 = (1-\\cos^2)^2, \\text{ let } u = \\cos x',
      },
      {
        type: 'warning',
        title: 'Don\'t forget $dx$ when substituting',
        body: 'x = a\\sin\\theta \\Rightarrow dx = a\\cos\\theta\\,d\\theta. \\text{ The } dx \\text{ replacement is essential and easy to drop under pressure.}',
      },
      {
        type: 'theorem',
        title: 'The Unit Threshold',
        body: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1. \\\\ \\text{This is the single most important identity in trig calculus. It states that the arc and its sine merge at the limit.}',
      },
      {
        type: 'theorem',
        title: 'The Domain of Substitution',
        body: '\\text{For } x = a\\sin\\theta \\text{, we restrict } \\theta \\in [-\\pi/2, \\pi/2]. \\\\ \\text{This restriction ensures the substitution is "One-to-One," allowing us to invert back to arcsin at the end.}',
      },
    ],
    visualizations: [
      {
        id: 'TrigIntegrationStrategyViz',
        title: 'Integration Strategy Decision Tree',
        mathBridge: 'Interactive flowchart: enter what your integrand looks like, see which strategy applies and why.',
        caption: 'The strategy is determined by the structure of the integrand, not the specific numbers.',
      },
      {
        id: 'ChainRuleLimitBridgeViz',
        title: 'The sin(x³) Proof — Step by Step',
        mathBridge: 'Walks through the exact textbook proof. Each step explained in plain English. Prerequisite drawers for every concept used.',
      },
      {
        id: 'ChainRulePracticeViz',
        title: 'Practice — 10 Forms of the Chain Rule',
        mathBridge: '10 different compositions covering every form you will encounter. Reveal steps one at a time.',
      },
    ],
  },

  rigor: {
    title: 'Full Worked Trig Substitution: $\\int \\sqrt{1 - x^2}\\, dx$',
    prose: [
      'This is the area under a semicircle — it should equal $\\frac{\\pi}{4}$ over $[0,1]$. We\'ll verify that too.',
    ],
    visualizationId: 'TrigSubstitutionViz',
    proofSteps: [
      {
        expression: '\\text{Radical: } \\sqrt{1 - x^2} \\Rightarrow \\text{form } \\sqrt{a^2 - x^2} \\text{ with } a=1 \\Rightarrow \\text{substitute } x = \\sin\\theta',
        annotation: 'Pattern match: $\\sqrt{a^2 - x^2}$ form → use $x = a\\sin\\theta$. This is the only decision you need to make.',
      },
      {
        expression: 'dx = \\cos\\theta\\,d\\theta \\qquad \\sqrt{1 - x^2} = \\sqrt{1 - \\sin^2\\theta} = \\sqrt{\\cos^2\\theta} = \\cos\\theta',
        annotation: 'Compute $dx$ and simplify the radical. The Pythagorean identity $1 - \\sin^2\\theta = \\cos^2\\theta$ kills the square root. This is exactly why we chose this substitution.',
      },
      {
        expression: '\\int \\sqrt{1 - x^2}\\,dx = \\int \\cos\\theta \\cdot \\cos\\theta\\,d\\theta = \\int \\cos^2\\theta\\,d\\theta',
        annotation: 'Substitute everything. The ugly radical is gone — we have a clean trig integral.',
      },
      {
        expression: '\\int \\cos^2\\theta\\,d\\theta = \\int \\frac{1 + \\cos 2\\theta}{2}\\,d\\theta',
        annotation: 'Both exponents are even — apply power reduction to $\\cos^2\\theta$.',
      },
      {
        expression: '= \\frac{\\theta}{2} + \\frac{\\sin 2\\theta}{4} + C',
        annotation: 'Integrate term by term.',
      },
      {
        expression: '\\sin 2\\theta = 2\\sin\\theta\\cos\\theta = 2x\\sqrt{1-x^2}',
        annotation: 'Back-substitute: $\\sin\\theta = x$, $\\cos\\theta = \\sqrt{1-x^2}$, $\\theta = \\arcsin x$.',
      },
      {
        expression: '\\int \\sqrt{1-x^2}\\,dx = \\frac{\\arcsin x}{2} + \\frac{x\\sqrt{1-x^2}}{2} + C',
        annotation: 'Final answer. Evaluate from 0 to 1: $\\frac{\\pi/2}{2} - 0 = \\frac{\\pi}{4}$ — exactly the area of a quarter circle. ✓',
      },
      {
         expression: '\\text{--- Part II: Proving } \\lim_{x \\to 0} \\frac{\\sin x}{x} = 1 \\text{ ---}',
         annotation: 'Let us use the Squeeze Theorem on a unit circle sector.'
      },
      {
         expression: '\\cos x < \\frac{\\sin x}{x} < 1',
         annotation: 'Step 1: On the interval $(0, \\pi/2)$, the area of the inner triangle is less than the sector area, which is less than the outer tangent triangle.'
      },
      {
         expression: '\\frac{1}{2}\\sin x < \\frac{1}{2}x < \\frac{1}{2}\\tan x',
         annotation: 'Step 2: Multiply by 2. $\\sin x < x < \\tan x$.'
      },
      {
         expression: '1 < \\frac{x}{\\sin x} < \\frac{1}{\\cos x}',
         annotation: 'Step 3: Divide everything by $\\sin x$. Note that $\\tan x / \\sin x = 1/\\cos x$.'
      },
      {
         expression: '1 > \\frac{\\sin x}{x} > \\cos x',
         annotation: 'Step 4: Take the reciprocals. The inequalities flip.'
      },
      {
         expression: '\\lim_{x \\to 0} \\cos x = 1 \\implies \\lim_{x \\to 0} \\frac{\\sin x}{x} = 1 \\qquad \\blacksquare',
         annotation: 'Step 5: Apply the Squeeze Theorem. Since both outer functions limit to 1, the middle must as well.'
      }
    ],
  },

  examples: [
    {
      id: 'ch3-002-ex1',
      title: 'Chain Rule with Trig: $\\frac{d}{dx}\\sin(x^3)$',
      problem: "\\text{Differentiate } f(x) = \\sin(x^3).",
      steps: [
        {
          expression: "f'(x) = \\cos(\\underbrace{x^3}_{\\text{inner}}) \\cdot \\frac{d}{dx}(x^3)",
          annotation: 'Chain rule: derivative of outer (sin → cos) evaluated at inner, times derivative of inner.',
        },
        {
          expression: "= 3x^2\\cos(x^3)",
          annotation: 'Power rule on the inner. Notice the argument of cos stays $x^3$ — never simplify it away.',
        },
      ],
      conclusion: 'Chain rule with trig: differentiate the trig function (sin→cos, cos→−sin etc.), keep the inner function as the argument, then multiply by the inner derivative.',
    },
    {
      id: 'ch3-002-ex2',
      title: 'Odd Power Strategy: $\\int \\sin^3 x\\, dx$',
      problem: '\\text{Evaluate } \\int \\sin^3 x\\, dx.',
      steps: [
        {
          expression: '\\int \\sin^3 x\\,dx = \\int \\sin^2 x \\cdot \\sin x\\,dx',
          annotation: 'Odd power of sin: factor off one $\\sin x$ to pair with $dx$ for the substitution.',
        },
        {
          expression: '= \\int (1 - \\cos^2 x)\\sin x\\,dx',
          annotation: 'Convert $\\sin^2 x = 1 - \\cos^2 x$. Now let $u = \\cos x$, $du = -\\sin x\\,dx$.',
        },
        {
          expression: '= -\\int (1 - u^2)\\,du = -u + \\frac{u^3}{3} + C',
          annotation: 'Substitute. Clean polynomial integral.',
        },
        {
          expression: '= -\\cos x + \\frac{\\cos^3 x}{3} + C',
          annotation: 'Back-substitute $u = \\cos x$.',
        },
      ],
      conclusion: 'Odd power → peel one off, convert the rest with Pythagorean identity, $u$-substitute. Works every time.',
    },
    {
      id: 'ch3-002-ex3',
      title: 'Trig Sub with $\\sqrt{x^2 + 4}$',
      problem: '\\text{Evaluate } \\int \\frac{dx}{\\sqrt{x^2 + 4}}.',
      steps: [
        {
          expression: '\\sqrt{x^2 + 4} = \\sqrt{4 + x^2} \\Rightarrow \\text{form } \\sqrt{a^2 + x^2},\\ a=2 \\Rightarrow x = 2\\tan\\theta',
          annotation: 'Pattern: $\\sqrt{a^2 + x^2}$ → use $x = a\\tan\\theta$. The identity $1 + \\tan^2 = \\sec^2$ will eliminate the radical.',
        },
        {
          expression: 'dx = 2\\sec^2\\theta\\,d\\theta \\qquad \\sqrt{x^2+4} = \\sqrt{4\\tan^2\\theta + 4} = 2\\sec\\theta',
          annotation: 'Compute $dx$ and simplify the radical using $1 + \\tan^2\\theta = \\sec^2\\theta$.',
        },
        {
          expression: '\\int \\frac{2\\sec^2\\theta\\,d\\theta}{2\\sec\\theta} = \\int \\sec\\theta\\,d\\theta = \\ln|\\sec\\theta + \\tan\\theta| + C',
          annotation: 'Simplify and integrate. $\\int \\sec\\theta\\,d\\theta$ is a standard result.',
        },
        {
          expression: '= \\ln\\left|\\frac{\\sqrt{x^2+4}}{2} + \\frac{x}{2}\\right| + C = \\ln\\bigl|\\sqrt{x^2+4} + x\\bigr| + C',
          annotation: 'Back-substitute: $\\tan\\theta = x/2$ so $\\sec\\theta = \\sqrt{x^2+4}/2$. Absorb the constant $\\ln(1/2)$ into $C$.',
        },
      ],
      conclusion: 'Pattern recognition is everything: see which radical form you have, choose the substitution, and the Pythagorean identity does the rest.',
    },
    {
      id: 'ex-trig-implicit-osc',
      title: 'Implicit Oscillation: Hidden Derivatives',
      problem: '\\text{Find } dy/dx \\text{ for the curve } x^2 + \\sin y = xy.',
      steps: [
        {
          expression: '2x + \\cos y \\cdot \\frac{dy}{dx} = y + x\\frac{dy}{dx}',
          annotation: 'Step 1: Differentiate implicitly. Remember the chain rule for the sin(y) term and product rule for the xy term.'
        },
        {
          expression: '\\frac{dy}{dx}(\\cos y - x) = y - 2x',
          annotation: 'Step 2: Collect all dy/dx terms on one side.'
        },
        {
          expression: '\\frac{dy}{dx} = \\frac{y-2x}{\\cos y - x} \\qquad \\blacksquare',
          annotation: 'Step 3: Solve for the derivative.'
        }
      ],
      conclusion: 'Trig functions in implicit equations behave like any other function, but the chain rule for the dependent variable ($y$) is the engine.'
    },
    {
      id: 'ex-trig-lighthouse-tracking',
      title: 'The Tracking Problem: Related Rates of Sweep',
      problem: '\\text{A lighthouse is 2km from a shore. The light rotates at 3 rad/min. Find the beam speed on the shore when it is 1km from the point nearest the lighthouse.}',
      steps: [
        {
          expression: 'x = 2\\tan\\theta \\implies \\frac{dx}{dt} = 2\\sec^2\\theta \\cdot \\frac{d\\theta}{dt}',
          annotation: 'Step 1: Set up the geometric relationship. $x$ is the distance on shore, $2$ is the lighthouse distance.'
        },
        {
          expression: 'x=1 \\implies \\tan\\theta = 1/2 \\implies \\sec^2\\theta = 1 + \\tan^2\\theta = 5/4',
          annotation: 'Step 2: Find the trigonometric state at the moment of interest.'
        },
        {
          expression: '\\frac{dx}{dt} = 2(5/4) \\cdot 3 = 7.5 \\text{ km/min} \\qquad \\blacksquare',
          annotation: 'Step 3: Plug in the rotation rate (3 rad/min) and solve for the beam velocity.'
        }
      ],
      conclusion: 'Polar sweeps translate into linear speeds through the derivative of the tangent function.'
    },
  ],

  challenges: [
    {
      id: 'ch3-002-ch1',
      difficulty: 'medium',
      problem: "\\text{Differentiate } g(x) = \\tan^2(3x).",
      hint: 'This is a chain rule twice — power rule on the outer square, then chain through tan, then chain through 3x.',
      walkthrough: [
        {
          expression: "g(x) = [\\tan(3x)]^2 \\Rightarrow g'(x) = 2\\tan(3x) \\cdot \\frac{d}{dx}[\\tan(3x)]",
          annotation: 'Power rule on the outer square: bring down the 2, reduce the exponent.',
        },
        {
          expression: '\\frac{d}{dx}[\\tan(3x)] = \\sec^2(3x) \\cdot 3',
          annotation: 'Chain rule again: derivative of tan is $\\sec^2$, times derivative of inner $3x$.',
        },
        {
          expression: "g'(x) = 6\\tan(3x)\\sec^2(3x)",
          annotation: 'Combine. This pattern — trig squared composed with a linear function — appears constantly.',
        },
      ],
      answer: "g'(x) = 6\\tan(3x)\\sec^2(3x)",
    },
    {
      id: 'ch3-002-ch2',
      difficulty: 'hard',
      problem: '\\text{Evaluate } \\int \\sin^2 x \\cos^3 x\\, dx.',
      hint: 'cos has an odd power. Factor one cos off, convert the remaining $\\cos^2$ using Pythagorean identity, let $u = \\sin x$.',
      walkthrough: [
        {
          expression: '\\int \\sin^2 x \\cdot \\cos^2 x \\cdot \\cos x\\, dx',
          annotation: 'Factor off one $\\cos x$ to sit with $dx$.',
        },
        {
          expression: '= \\int \\sin^2 x (1 - \\sin^2 x) \\cos x\\, dx',
          annotation: 'Replace $\\cos^2 x = 1 - \\sin^2 x$.',
        },
        {
          expression: 'u = \\sin x,\\quad du = \\cos x\\,dx \\Rightarrow \\int u^2(1 - u^2)\\,du',
          annotation: 'Let $u = \\sin x$. The $\\cos x\\, dx$ is absorbed as $du$.',
        },
        {
          expression: '= \\int (u^2 - u^4)\\,du = \\frac{u^3}{3} - \\frac{u^5}{5} + C = \\frac{\\sin^3 x}{3} - \\frac{\\sin^5 x}{5} + C',
          annotation: 'Integrate and back-substitute.',
        },
      ],
      answer: '\\dfrac{\\sin^3 x}{3} - \\dfrac{\\sin^5 x}{5} + C',
    },
    {
      id: 'ch3-trig-calculus-009-ch3',
      difficulty: 'harder',
      problem: '\\text{Find the second derivative of } f(x) = \\sin^2 x.',
      hint: 'Either use the power chain rule on two layers, or use the power reduction identity FIRST to make the calculation trivial.',
      walkthrough: [
        {
          expression: 'f(x) = \\frac{1 - \\cos 2x}{2}',
          annotation: 'Step 1: Apply the identity. This is the "Master Move" before doing any calculus.'
        },
        {
          expression: "f'(x) = \\frac{1}{2}(2\\sin 2x) = \\sin 2x",
          annotation: 'Step 2: Differentiate the linear terms. Derivative of -cos(2x) is +sin(2x)*2.'
        },
        {
          expression: "f''(x) = 2\\cos 2x \\qquad \\blacksquare",
          annotation: 'Step 3: Differentiate again. The acceleration of the energy wave is a cosine wave with double frequency.'
        }
      ],
      answer: "f''(x) = 2\\cos 2x"
    }
  ],

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'd/dx[sin(x)] = cos(x). What does this say geometrically about the sine graph?',
      options: [
        'The derivative of sine is 1 because sine is a unit function',
        'At each point on the sine curve, the slope equals the cosine value: where sin(x) is rising fastest (x=0), cos(0)=1 (maximum slope); at sin\'s peak (x=π/2), cos(π/2)=0 (flat tangent); where sin is falling (x=π), cos(π)=-1 (steepest descent). The derivative encodes the slope behavior of sine exactly',
        'The formula d/dx[sin] = cos means sine and cosine cancel each other when integrated',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: '∫sin(x)dx = -cos(x) + C. Why the negative sign?',
      options: [
        'Integration always introduces a negative sign for periodic functions',
        'Because d/dx[-cos(x)] = -(-sin(x)) = sin(x) — verifying the antiderivative. The negative sign comes from the chain of derivative rules: cosine\'s derivative is -sine, so the antiderivative of sine must be negative cosine',
        'The negative sign is a convention to distinguish the integral from the derivative',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'To evaluate ∫sin²(x)dx, you replace sin²(x) with (1-cos(2x))/2. Why can\'t you integrate sin²(x) directly?',
      options: [
        'Powers of trig functions cannot be integrated — only first-power trig functions have antiderivatives',
        'There is no simple antiderivative rule for sin² directly; the power-reduction substitution converts it to a sum of 1/2 and cos(2x)/2 — both standard antiderivatives. The identity "lowers the power" from squared to first-power trig, enabling direct integration',
        'sin²(x) = sin(x)·sin(x) so you use integration by parts with u = sin(x), dv = sin(x)dx',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Trig substitution: for an integral containing √(1-x²), substitute x = sin(θ). Why?',
      options: [
        'Because sin is bounded by 1, matching the range of √(1-x²)',
        'With x = sin(θ), √(1-x²) = √(1-sin²(θ)) = √(cos²(θ)) = cos(θ) — the square root disappears using the Pythagorean identity. The substitution transforms an algebraically difficult square root into a simple trig function that can be integrated directly',
        'Trig substitution converts the integral to polar form, which is easier to evaluate',
      ],
      correct: 1,
    },
  ],
}
