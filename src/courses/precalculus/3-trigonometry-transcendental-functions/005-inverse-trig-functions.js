export default {
  id: 'precalc3-004',
  slug: 'inverse-trig-functions',
  chapter: 'precalc-3',
  order: 6,
  title: 'Inverse Trig Functions: Undoing the Circle',
  subtitle: 'Why domain restriction is not a technicality — it is the only way inverse trig can exist',
  tags: ['inverse trig', 'arcsin', 'arccos', 'arctan', 'domain restriction', 'principal value', 'inverse functions'],
  aliases: 'arcsin arccos arctan inverse sine cosine tangent domain restriction principal value arcsec arccsc arccot',

  hook: {
    question: 'If $\\sin(\\pi/6) = 1/2$, then $\\sin^{-1}(1/2)$ should be $\\pi/6$. But $\\sin(5\\pi/6) = 1/2$ too — and infinitely many other angles. How does $\\sin^{-1}$ give a single answer?',
    realWorldContext: 'Inverse trig functions appear any time you need an angle from a ratio: surveying (finding an angle from measured distances), robotics (computing joint angles from end-effector position), physics (finding launch angles for projectile motion). In calculus, $\\frac{d}{dx}\\arctan x = \\frac{1}{1+x^2}$ is one of the most important antiderivative formulas — it is how integrals like $\\int \\frac{1}{1+x^2}\\,dx$ are solved.',
    previewVisualizationId: 'InverseTrigViz',
  },

  intuition: {
    prose: [
      'The sine function is not one-to-one — it takes the same value at infinitely many angles. $\\sin(\\pi/6) = \\sin(5\\pi/6) = \\sin(13\\pi/6) = \\cdots = 1/2$. A function that is not one-to-one has no inverse — there is no way to say "the angle whose sine is $1/2$" because there are infinitely many.',
      'The solution is domain restriction: we agree to only use a specific portion of the sine curve — the piece from $-\\pi/2$ to $\\pi/2$. On that interval, sine is strictly increasing and therefore one-to-one. The inverse of this restricted function is $\\arcsin$. The output is always in $[-\\pi/2, \\pi/2]$ — the "principal value." No ambiguity.',
      'Each inverse trig function has a different restriction, chosen to cover the full output range while keeping the function one-to-one: $\\arcsin$ uses $[-\\pi/2, \\pi/2]$, $\\arccos$ uses $[0, \\pi]$, $\\arctan$ uses $(-\\pi/2, \\pi/2)$. These choices are conventions — but they are universal conventions, and every calculator uses them.',
      '**The Language of the Arc**: The prefix "Arc-" refers to the arc length on the unit circle. While "Sine" asks for the ratio of a given angle, "Arc-sine" asks for the length of the arc that produces that ratio. It is the language of reverse-engineering rotation.',
      '**The Domain Trade**: To gain an inverse function, we must sacrifice the periodic nature of the original. We "Trade" the entire sine wave for a single strictly increasing piece that passes the horizontal line test. This segment becomes the "Reference Standard" for all reverse calculations.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'The three principal inverse trig functions',
        body: '\\arcsin x:\\; [-1,1] \\to [-\\tfrac{\\pi}{2}, \\tfrac{\\pi}{2}] \\quad \\text{(sin restricted to } [-\\tfrac{\\pi}{2},\\tfrac{\\pi}{2}]\\text{)} \\\\ \\arccos x:\\; [-1,1] \\to [0, \\pi] \\quad \\text{(cos restricted to } [0,\\pi]\\text{)} \\\\ \\arctan x:\\; \\mathbb{R} \\to (-\\tfrac{\\pi}{2}, \\tfrac{\\pi}{2}) \\quad \\text{(tan restricted to } (-\\tfrac{\\pi}{2},\\tfrac{\\pi}{2})\\text{)}',
      },
      {
        type: 'warning',
        title: 'The principal value trap',
        body: '\\arcsin(\\sin(5\\pi/6)) \\neq 5\\pi/6 \\\\ \\arcsin(\\sin(5\\pi/6)) = \\arcsin(1/2) = \\pi/6 \\\\ \\text{Because } 5\\pi/6 \\notin [-\\pi/2, \\pi/2]\\text{, arcsin gives the equivalent angle IN the principal range.}',
      },
      {
        type: 'insight',
        title: 'Why arctan has asymptotes but arcsin does not',
        body: '\\arctan x \\to \\pm\\tfrac{\\pi}{2} \\text{ as } x \\to \\pm\\infty \\quad \\text{(tan can take any real input)} \\\\ \\arcsin x \\text{ is only defined for } x \\in [-1, 1] \\quad \\text{(sin output is bounded)} \\\\ \\arccos x \\text{ is only defined for } x \\in [-1, 1] \\quad \\text{(same reason)}',
      },
      {
        type: 'insight',
        title: 'Linguistic Learner: The Language of the Arc',
        body: '\\text{While } \\sin^{-1} \\text{ is common shorthand, "Arcsine" is the more descriptive term.} \\\\ \\text{It literally asks "What is the Arc length on the circle whose vertical height is } Y\\text{?"}',
      },
      {
        type: 'insight',
        title: 'Logical Learner: The Domain Trade',
        body: '\\text{Why } [-\\pi/2, \\pi/2] \\text{ for sine but } [0, \\pi] \\text{ for cosine?} \\\\ \\text{Logic dictates we need a "One-to-One" piece.} \\\\ \\text{For sine, the most symmetric piece containing zero is the first and fourth quadrants. For cosine, the first and second quadrants cover all positive and negative ratios without repetition.}',
      },
      {
        type: 'insight',
        title: 'Physical Learner: The Reverse Engineer',
        body: '\\text{In robotics, this is "Inverse Kinematics."} \\\\ \\text{The robot knows where its hand is (the coordinate). It uses inverse trig to solve for the target angle of its shoulder joint to reach that spot.}',
      },
      {
        type: 'insight',
        title: 'Visual Learner: The Mirror Reflection',
        body: '\\text{Every inverse function is a mirror reflection over } Y = X. \\\\ \\text{Visualize the sine curve. Now rotate the whole graph 90 degrees and flip it. The "S-curve" you see in the middle is the Arcsine function.}',
      },
    ],
    visualizations: [
      {
        id: 'InverseTrigViz',
        title: 'Restricting the Domain to Create an Inverse',
        mathBridge: 'Toggle between sin, cos, tan. See the restriction highlighted, then the inverse function as a reflection over y = x.',
        caption: 'The inverse function is the reflection of the restricted portion — not the whole periodic curve.',
      },
      {
        id: 'UniversalInverseLab',
        title: 'Universal Mirror Sandbox — Any Function',
        mathBridge: 'Pick any function preset. Drag the amber point along f(x). The pink point mirrors on f^-1(x). The HUD shows m1 * m2 = 1.',
        caption: 'Rise becomes run. The slope of f^-1 is always the reciprocal of the slope of f.',
      },
      {
        id: 'LogExpReciprocalViz',
        title: 'e^x and ln(x) — Slope Reciprocity',
        mathBridge: 'The slope of e^x at any point equals its y-value. Drag the amber point to see how this flips to give ln(x) a slope of 1/x.',
        caption: 'The most famous inverse pair shows slope reciprocity most clearly.',
      },
            { id: 'VideoCarousel', title: 'Inverse Sine & Cosine Functions', props: { videos: [
          { url: "", title: 'TR-23 — Dennis F. Davis' },
          { url: "", title: 'TR-23X — Extended version' },
        ]},
      },
            { id: 'VideoCarousel', title: 'Evaluating Inverse Trig Functions', props: { videos: [
          { url: "", title: 'TR-25 — Calculator Methods' },
          { url: "", title: 'Evaluating Inverse Trig — Kim' },
          { url: "", title: 'Evaluating Inverse Trig — Kim (Extended)' },
        ]},
      },
    ],
  },

  math: {
    prose: [
      'The derivatives of the inverse trig functions are algebraic — no trig appears in them. This is surprising until you see how they are derived: using implicit differentiation on $y = \\arcsin x$ means differentiating $\\sin y = x$, giving $\\cos y \\cdot y\' = 1$, so $y\' = 1/\\cos y$. Then using the Pythagorean identity $\\cos y = \\sqrt{1 - \\sin^2 y} = \\sqrt{1 - x^2}$, the final result is $\\frac{1}{\\sqrt{1-x^2}}$ — no trig at all.',
      'The key derivatives to know: $\\frac{d}{dx}\\arcsin x = \\frac{1}{\\sqrt{1-x^2}}$, $\\frac{d}{dx}\\arctan x = \\frac{1}{1+x^2}$. These also give the two most important inverse trig antiderivatives, which appear constantly in calculus.',
      'The identity $\\arcsin x + \\arccos x = \\pi/2$ holds for all $x \\in [-1,1]$. Geometrically: in a right triangle, the two acute angles sum to $\\pi/2$, and if one is $\\arcsin x$, the other is $\\arccos x$. This means you only really need to remember $\\arcsin$ and $\\arctan$ — the others follow from complementary angle relationships.',
    ],
    visualizations: [
      {
        id: 'PythagoreanSlopeEngine',
        title: 'The Triangle Behind the Denominator',
        mathBridge: 'Switch between arcsin and arctan. Drag x. The highlighted triangle leg is the denominator in the derivative formula.',
        caption: 'The denominator comes from Pythagorean structure, not a memorized trick.',
      },
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'Inverse trig derivatives — all derived via implicit differentiation',
        body: '\\frac{d}{dx}\\arcsin x = \\frac{1}{\\sqrt{1-x^2}} \\qquad \\frac{d}{dx}\\arccos x = \\frac{-1}{\\sqrt{1-x^2}} \\\\ \\frac{d}{dx}\\arctan x = \\frac{1}{1+x^2} \\qquad \\frac{d}{dx}\\text{arcsec}\\, x = \\frac{1}{|x|\\sqrt{x^2-1}}',
      },
      {
        type: 'theorem',
        title: 'The two inverse trig antiderivatives you must know cold',
        body: '\\int \\frac{dx}{\\sqrt{1-x^2}} = \\arcsin x + C \\\\ \\int \\frac{dx}{1+x^2} = \\arctan x + C',
      },
      {
        type: 'theorem',
        title: 'Generalised forms (used in practice)',
        body: '\\int \\frac{dx}{\\sqrt{a^2-x^2}} = \\arcsin\\frac{x}{a} + C \\\\ \\int \\frac{dx}{a^2+x^2} = \\frac{1}{a}\\arctan\\frac{x}{a} + C',
      },
      {
        type: 'insight',
        title: 'Complementary identity',
        body: '\\arcsin x + \\arccos x = \\frac{\\pi}{2} \\quad \\text{for all } x \\in [-1,1] \\\\ \\text{So: } \\frac{d}{dx}\\arccos x = -\\frac{d}{dx}\\arcsin x \\text{ — the derivatives are negatives of each other.}',
      },
      {
        type: 'theorem',
        title: 'Existence: Monotonicity and Invertibility',
        body: '\\text{A function } f(x) \\text{ is invertible on an interval if it is strictly monotonic.} \\\\ \\sin x \\text{ is strictly increasing on } [-\\pi/2, \\pi/2] \\text{ from } -1 \\text{ to } 1. \\\\ \\text{This satisfies the Horizontal Line Test, guaranteeing arc-sine as a true function.}',
      },
      {
        type: 'theorem',
        title: 'The Quadrant Choice (Sign Continuity)',
        body: '\\text{Sine outputs are positive in Q1 and negative in Q4. This spans } [-1, 1] \\text{ continuously.} \\\\ \\text{Cosine outputs are positive in Q1 and negative in Q2. This also spans } [-1, 1] \\text{ continuously.} \\\\ \\text{These choices minimize the "distance" from the standard 0-threshold.}',
      },
    ],
  },

  rigor: {
    title: 'Deriving $\\frac{d}{dx}\\arctan x = \\frac{1}{1+x^2}$ by implicit differentiation',
    visualizationId: 'InverseTrigViz',
    proofSteps: [
      {
        expression: 'y = \\arctan x \\iff \\tan y = x, \\quad y \\in \\bigl(-\\tfrac{\\pi}{2}, \\tfrac{\\pi}{2}\\bigr)',
        annotation: 'Rewrite using the definition of arctan. We will differentiate the simpler form $\\tan y = x$.',
      },
      {
        expression: '\\frac{d}{dx}[\\tan y] = \\frac{d}{dx}[x]',
        annotation: 'Differentiate both sides with respect to $x$.',
      },
      {
        expression: '\\sec^2 y \\cdot \\frac{dy}{dx} = 1',
        annotation: 'Chain rule on the left: derivative of $\\tan y$ is $\\sec^2 y$, times $dy/dx$.',
      },
      {
        expression: '\\frac{dy}{dx} = \\frac{1}{\\sec^2 y} = \\cos^2 y',
        annotation: 'Solve for $dy/dx$.',
      },
      {
        expression: '\\tan y = x \\Rightarrow \\text{right triangle: opposite}=x, \\text{adjacent}=1, \\text{hypotenuse}=\\sqrt{1+x^2}',
        annotation: 'Draw the right triangle corresponding to $\\tan y = x$. The hypotenuse is $\\sqrt{1+x^2}$ by the Pythagorean theorem.',
      },
      {
        expression: '\\cos y = \\frac{1}{\\sqrt{1+x^2}} \\Rightarrow \\cos^2 y = \\frac{1}{1+x^2}',
        annotation: 'Read $\\cos y$ from the triangle: adjacent over hypotenuse.',
      },
      {
        expression: '\\therefore \\quad \\frac{d}{dx}\\arctan x = \\frac{1}{1+x^2} \\qquad \\blacksquare',
        annotation: 'Substitute back. The result is purely algebraic — no trig remains. This is why arctan appears as the antiderivative of $1/(1+x^2)$.',
      },
      {
        expression: '\\text{--- Part II: The Cancellation Trap Proof ---}',
        annotation: 'Let us prove why $\\arcsin(\\sin x) \\neq x$ when $x = 5\\pi/6$.'
      },
      {
        expression: 'x = \\frac{5\\pi}{6} \\implies \\sin(x) = \\frac{1}{2}',
        annotation: 'Step 1: The input value produces a ratio.'
      },
      {
        expression: '\\arcsin(1/2) = \\theta, \\quad \\theta \\in [-\\pi/2, \\pi/2]',
        annotation: 'Step 2: The inverse function is restricted to producing outputs in the principal range.'
      },
      {
        expression: '\\theta = \\frac{\\pi}{6}',
        annotation: 'Step 3: The unique value in the range that produces 1/2 is $\\pi/6$.'
      },
      {
        expression: '\\arcsin(\\sin(5\\pi/6)) = \\frac{\\pi}{6} \\neq \\frac{5\\pi}{6} \\qquad \\blacksquare',
        annotation: 'Step 4: The function correctly "maps back," but to the reference quadrant—not the original rotation.'
      }
    ],
  },

  examples: [
    {
      id: 'ch3-004-ex1',
      title: 'Evaluating inverse trig exactly',
      problem: '\\text{Find: } (a)\\; \\arcsin\\tfrac{\\sqrt{3}}{2}, \\quad (b)\\; \\arctan(-1), \\quad (c)\\; \\arccos 0.',
      steps: [
        {
          expression: '\\arcsin\\tfrac{\\sqrt{3}}{2} = \\tfrac{\\pi}{3}',
          annotation: '$\\sin(\\pi/3) = \\sqrt{3}/2$ and $\\pi/3 \\in [-\\pi/2, \\pi/2]$ — it is in the principal range.',
        },
        {
          expression: '\\arctan(-1) = -\\tfrac{\\pi}{4}',
          annotation: '$\\tan(-\\pi/4) = -1$ and $-\\pi/4 \\in (-\\pi/2, \\pi/2)$. The negative angle is correct — arctan output is negative for negative inputs.',
        },
        {
          expression: '\\arccos 0 = \\tfrac{\\pi}{2}',
          annotation: '$\\cos(\\pi/2) = 0$ and $\\pi/2 \\in [0, \\pi]$. Note: $\\arcsin 0 = 0$ but $\\arccos 0 = \\pi/2$ — different principal ranges give different answers.',
        },
      ],
      conclusion: 'Always check the principal range. The answer must lie in the correct interval for each inverse function.',
    },
    {
      id: 'ch3-004-ex2',
      title: 'Chain rule with inverse trig',
      problem: "\\text{Differentiate } f(x) = \\arctan(x^2).",
      steps: [
        {
          expression: "f'(x) = \\frac{1}{1+(x^2)^2} \\cdot \\frac{d}{dx}(x^2)",
          annotation: 'Chain rule: derivative of arctan is $1/(1+u^2)$ evaluated at the inner function, times the inner derivative.',
        },
        {
          expression: "= \\frac{1}{1+x^4} \\cdot 2x = \\frac{2x}{1+x^4}",
          annotation: 'Simplify. Note the denominator is $1+x^4$ not $1+x^2$ — the inner function was $x^2$, so it gets squared again.',
        },
      ],
      conclusion: 'Chain rule with inverse trig: apply $1/(1+u^2)$ or $1/\\sqrt{1-u^2}$ at the inner function, then multiply by the inner derivative.',
    },
    {
      id: 'ch3-004-ex3',
      title: 'Inverse trig antiderivative — completing the square first',
      problem: '\\text{Evaluate } \\displaystyle\\int \\frac{dx}{x^2 - 4x + 8}.',
      steps: [
        {
          expression: 'x^2 - 4x + 8 = (x-2)^2 + 4',
          annotation: 'Complete the square on the denominator. This converts it to the arctan standard form $u^2 + a^2$.',
        },
        {
          expression: '\\int \\frac{dx}{(x-2)^2 + 4}',
          annotation: 'Let $u = x-2$, $du = dx$. Then $a^2 = 4$, $a = 2$.',
        },
        {
          expression: '= \\frac{1}{2}\\arctan\\frac{x-2}{2} + C',
          annotation: 'Apply $\\int \\frac{du}{u^2+a^2} = \\frac{1}{a}\\arctan\\frac{u}{a} + C$ with $a=2$.',
        },
      ],
      conclusion: 'Completing the square converts a general quadratic denominator into the arctan standard form. This is the reverse path from the calculus bridge in the quadratics lesson.',
    },
    {
      id: 'ex-inverse-nested-reconstruct',
      title: 'The Nested Triangle: Composition without Angles',
      problem: '\\text{Evaluate } \\cos(\\arcsin(4/5)) \\text{ without finding the angle.}',
      steps: [
        {
          expression: '\\theta = \\arcsin(4/5) \\implies \\sin(\\theta) = 4/5',
          annotation: 'Step 1: Let the inner expression represent an angle theta.'
        },
        {
          expression: '\\text{opp} = 4, \\text{ hyp} = 5 \\implies \\text{adj} = \\sqrt{25-16} = 3',
          annotation: 'Step 2: Draw the triangle. Opposite is 4, Hypotenuse is 5 (a standard 3-4-5 triangle).'
        },
        {
          expression: '\\cos(\\theta) = \\frac{\\text{adj}}{\\text{hyp}} = 3/5',
          annotation: 'Step 3: Read the required ratio directly from the geometry.'
        }
      ],
      conclusion: 'Nested trig functions are solved by drawing the representative triangle. You do not need to know the angle to know its other ratios.'
    },
    {
      id: 'ex-inverse-arctan-shift',
      title: 'The Arctan Shift: Solving for x',
      problem: '\\text{Solve for } x: \\arctan(5x - 2) = \\frac{\\pi}{3}.',
      steps: [
        {
          expression: '5x - 2 = \\tan(\\frac{\\pi}{3})',
          annotation: 'Step 1: Apply tangent to both sides to "undo" the arctan.'
        },
        {
          expression: '5x - 2 = \\sqrt{3}',
          annotation: 'Step 2: Substitute the exact value for tan(60°).'
        },
        {
          expression: 'x = \\frac{2 + \\sqrt{3}}{5}',
          annotation: 'Step 3: Solve for x algebraically.'
        }
      ],
      conclusion: 'Equations are "unwrapped" layer-by-layer. To remove an inverse trig function, apply its standard trig counterpart.'
    },
  ],

  challenges: [
    {
      id: 'ch3-004-ch1',
      difficulty: 'medium',
      problem: "\\text{Differentiate } g(x) = x\\arcsin x + \\sqrt{1-x^2}.",
      hint: 'Product rule on the first term, chain rule on the second.',
      walkthrough: [
        {
          expression: "\\frac{d}{dx}[x\\arcsin x] = \\arcsin x + x \\cdot \\frac{1}{\\sqrt{1-x^2}}",
          annotation: 'Product rule: $u\'v + uv\'$ where $u=x$, $v=\\arcsin x$.',
        },
        {
          expression: "\\frac{d}{dx}[\\sqrt{1-x^2}] = \\frac{-x}{\\sqrt{1-x^2}}",
          annotation: 'Chain rule on the square root.',
        },
        {
          expression: "g'(x) = \\arcsin x + \\frac{x}{\\sqrt{1-x^2}} - \\frac{x}{\\sqrt{1-x^2}} = \\arcsin x",
          annotation: 'The two fractional terms cancel exactly. The derivative is simply $\\arcsin x$ — a hint that $x\\arcsin x + \\sqrt{1-x^2}$ is an antiderivative of $\\arcsin x$.',
        },
      ],
      answer: "g'(x) = \\arcsin x",
    },
    {
      id: 'ch3-004-ch2',
      difficulty: 'hard',
      problem: '\\text{Prove: } \\arctan x + \\arctan\\frac{1}{x} = \\frac{\\pi}{2} \\text{ for } x > 0.',
      hint: 'Differentiate the left side — if the derivative is zero, the expression is constant. Then find the constant by evaluating at a specific $x$.',
      walkthrough: [
        {
          expression: "\\frac{d}{dx}\\left[\\arctan x + \\arctan\\frac{1}{x}\\right] = \\frac{1}{1+x^2} + \\frac{1}{1+(1/x)^2} \\cdot \\left(-\\frac{1}{x^2}\\right)",
          annotation: 'Differentiate both terms. Chain rule on the second: derivative of $1/x$ is $-1/x^2$.',
        },
        {
          expression: '= \\frac{1}{1+x^2} + \\frac{x^2}{x^2+1} \\cdot \\left(-\\frac{1}{x^2}\\right) = \\frac{1}{1+x^2} - \\frac{1}{1+x^2} = 0',
          annotation: 'Simplify: $1/(1+(1/x)^2) = x^2/(x^2+1)$. The terms cancel exactly.',
        },
        {
          expression: '\\text{At } x=1: \\arctan 1 + \\arctan 1 = \\frac{\\pi}{4} + \\frac{\\pi}{4} = \\frac{\\pi}{2} \\qquad \\blacksquare',
          annotation: 'Zero derivative means constant. Evaluate at $x=1$ to find the constant is $\\pi/2$. The identity holds for all $x > 0$.',
        },
      ],
      answer: '\\arctan x + \\arctan(1/x) = \\pi/2 \\text{ for } x > 0.',
    },
    {
      id: 'ch3-004-ch3',
      difficulty: 'harder',
      problem: '\\text{Prove: } \\arcsin x + \\arccos x = \\frac{\\pi}{2} \\text{ using the geometry of a right triangle.}',
      hint: 'In a right triangle with hypotenuse 1, the two acute angles have sine and cosine values that are swapped.',
      walkthrough: [
        {
          expression: '\\theta = \\arcsin x \\implies \\sin \\theta = x',
          annotation: 'Step 1: Let $\\theta$ be the angle whose sine is $x$.'
        },
        {
          expression: '\\cos(90^\\circ - \\theta) = \\sin \\theta = x',
          annotation: 'Step 2: Use the co-function identity from Lesson 3.'
        },
        {
          expression: '\\arccos x = 90^\\circ - \\theta = \\frac{\\pi}{2} - \\arcsin x',
          annotation: 'Step 3: Therefore, the angle whose cosine is x is the complement of $\\theta$.'
        },
        {
          expression: '\\arcsin x + \\arccos x = \\frac{\\pi}{2} \\qquad \\blacksquare',
          annotation: 'Step 4: Algebraic sum confirms the geometric complementarity.'
        }
      ],
      answer: '\\arcsin x + \\arccos x = \\pi/2'
    }
  ],

  calcBridge: {
    teaser: 'The two integrals $\\int \\frac{dx}{\\sqrt{1-x^2}} = \\arcsin x + C$ and $\\int \\frac{dx}{1+x^2} = \\arctan x + C$ are among the most common antiderivatives in calculus. They appear in trig substitution problems, completing the square problems, and in the integral formulas for the arc length of a circle. You will use them constantly.',
    linkedLessons: ['trig-in-calculus', 'logarithm-relationships'],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'arcsin has domain [-1, 1] and range [-π/2, π/2]. Why is the range restricted to this interval?',
      options: [
        'To match the unit circle, which only has y-values between -1 and 1',
        'Sine is not one-to-one over its full domain — sin(π/6) = sin(5π/6) = 0.5, so "which angle?" is ambiguous. Restricting to [-π/2, π/2] selects a piece where sine IS one-to-one (each y-value appears exactly once), enabling a well-defined inverse — this is the principal value branch',
        'The restriction is due to convention about radian measure always being positive',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'arctan(x) has domain all real numbers but arcsin(x) only has domain [-1, 1]. Why the difference?',
      options: [
        'Tangent was invented later than sine and gets a wider domain by convention',
        'Tangent ranges over all real numbers (tan → -∞ to +∞ across each interval), so every real x is a valid output of tangent with a corresponding angle; sine is bounded between -1 and 1, so no angle produces sin = 2, meaning arcsin(2) is undefined',
        'Arctan is defined differently — it uses cosine values, which have infinite range',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'arcsin(sin(5π/4)) ≠ 5π/4. What DOES it equal?',
      options: [
        '5π/4 — inverse functions always cancel when composed',
        '-π/4 — since 5π/4 is outside the principal range [-π/2, π/2], arcsin first finds the value sin(5π/4) = -√2/2, then returns the principal angle in [-π/2, π/2] with that sine value, which is -π/4',
        '3π/4 — the supplementary angle of 5π/4',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'To evaluate sin(arctan(3/4)), the recommended approach is to draw a right triangle with opposite=3, adjacent=4. Why is this more useful than computing arctan(3/4) numerically?',
      options: [
        'Numerical computation of arctan is impossible without a calculator',
        'arctan(3/4) means "the angle whose tangent is 3/4"; a right triangle with legs 3 and 4 has hypotenuse 5. sin(that angle) = 3/5 exactly — no approximation needed. The triangle reveals exact ratios that the inverse-function definition guarantees',
        'Right triangles only apply to inverse sine; arctan problems need the unit circle',
      ],
      correct: 1,
    },
  ],
}
