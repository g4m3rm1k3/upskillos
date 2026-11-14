export default {
  id: 'precalc3-001',
  slug: 'trig-identities-deep-dive',
  chapter: 'precalc-3',
  order: 7,
  title: 'Trig Identities: Where They Come From',
  subtitle: 'From the unit circle to the identities you actually use in calculus',
  tags: ['trigonometry', 'identities', 'unit circle', 'pythagorean identity', 'angle addition'],
  aliases: 'sin cos tan trig identities precalc double angle half angle',

  hook: {
    question: 'Why does $\\sin^2 x + \\cos^2 x = 1$ always? And how does knowing that save you in a calculus problem?',
    realWorldContext: 'Trig identities are not facts to memorize — they are tools. In calculus, the choice of which identity to apply transforms an impossible integral into a trivial one. Signal processing, AC circuit analysis, and wave mechanics all reduce to identity manipulation.',
    previewVisualizationId: 'UnitCircleIdentityViz',
  },

  intuition: {
    prose: [
      'Every trig identity is a geometric fact in disguise. The unit circle — radius 1, centered at the origin — is the source of all of them. A point on the unit circle at angle $\\theta$ has coordinates $(\\cos\\theta,\\, \\sin\\theta)$ by definition.',
      'Because the circle has radius 1, the Pythagorean theorem applied to that point gives $\\cos^2\\theta + \\sin^2\\theta = 1$ immediately. This is not a coincidence — it IS the Pythagorean theorem, just stated for a circle.',
      'The other identities flow from the same picture. The angle addition formulas come from rotating a point and reading off its new coordinates. The double angle formulas are just the angle addition formulas applied to $\\theta + \\theta$. Nothing is arbitrary.',
      '**The Language of Sameness**: An identity is a "Mathematical Synonym." Unlike an equation (which you solve for x), an identity is a statement that two expressions are identical for ALL x. It is the art of re-reading the same geometric reality in a different algebraic dialect.',
      '**The Area Puzzle**: Imagine a large rectangle with a diagonal. If you tilt the rectangle by an angle, its vertical height changes. The Sine Addition formula is the geometric account of how the "Components" of that tilt add up to the final height. It is a puzzle of rotational assembly.',
    ],
    callouts: [
      {
        type: 'insight',
        title: 'The single identity that generates all others',
        body: '\\sin^2\\theta + \\cos^2\\theta = 1',
      },
      {
        type: 'mnemonic',
        title: 'Two more Pythagorean identities — divide, don\'t memorize',
        body: '\\text{Divide by } \\cos^2\\theta: \\tan^2\\theta + 1 = \\sec^2\\theta \\qquad \\text{Divide by } \\sin^2\\theta: 1 + \\cot^2\\theta = \\csc^2\\theta',
      },
      {
        type: 'insight',
        title: 'How to see the angle addition formula geometrically',
        body: '\\sin(\\alpha+\\beta) = \\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta',
      },
      {
        type: 'proof-map',
        title: 'The identity family tree',
        body: '\\text{Pythagorean} \\xrightarrow{\\theta+\\theta} \\text{Double Angle} \\xrightarrow{\\div 2} \\text{Half Angle} \\xrightarrow{\\text{rearrange}} \\text{Power Reduction}',
      },
      {
        type: 'insight',
        title: 'Linguistic Learner: The Language of Sameness',
        body: '\\text{"Identity" comes from the Latin "Idem" (The Same).} \\\\ \\text{Think of identities as "Aliases." In identity proofs, the goal is to reveal that the masked stranger on the left is actually the familiar friend on the right.}',
      },
      {
        type: 'insight',
        title: 'Logical Learner: Algebraic Morphing',
        body: '\\text{Identity proofs are "Non-Destructive."} \\\\ \\text{You are not "Solving"—you are "Simplifying" and "Mapping." Every step is a logical equivalence. If } A = B \\text{ and } B = C \\text{, then } A = C \\text{ is the engine of the entire deep dive.}',
      },
      {
        type: 'insight',
        title: 'Physical Learner: Rotational Synchrony',
        body: '\\text{Double and Triple angle formulas describe "Harmonics."} \\\\ \\text{In acoustics or power electronics, } \\sin 2\\theta \\text{ is the first harmonic—a wave that spins twice as fast. Identities allow us to mix and separate these signals in the physical world.}',
      },
      {
        type: 'insight',
        title: 'Visual Learner: The Area Puzzle',
        body: '\\text{Visualize tiling a rectangle with smaller blocks.} \\\\ \\text{The Sine Addition formula } \\sin(A+B) \\text{ is the area-equivalent of placing two rotations together in space. The resulting total height is the sum of the rotated components.}',
      },
    ],
    visualizations: [
      {
        id: 'UnitCircleIdentityViz',
        title: 'Unit Circle — Identities as Geometry',
        mathBridge: 'Drag the angle $\\theta$ and watch $\\sin^2\\theta + \\cos^2\\theta$ stay exactly 1. The right triangle IS the Pythagorean theorem.',
        caption: 'Every trig value is a length on or inside the unit circle.',
      },
                              { id: 'VideoCarousel', title: 'Intro to Trig Identities & Proofs', props: { videos: [
          { url: "", title: 'TR-32 — Dennis F. Davis' },
          { url: "", title: 'Fundamental Identities — Kim' },
        ]},
      },
      { id: 'VideoCarousel', title: 'Pythagorean Trig Identities', props: { videos: [
          { url: "", title: 'TR-33 — Pythagorean Identities' },
          { url: "", title: 'TR-33Z — All 6 Functions on the Unit Circle' },
        ]},
      },
            { id: 'VideoCarousel', title: 'Symmetry, Conjugates & Reflections', props: { videos: [
          { url: "", title: 'TR-35 — Conjugate Identities' },
          { url: "", title: 'TR-36 — Even & Odd Trig Functions' },
          { url: "", title: 'TR-37 — More Trig Reflections' },
        ]},
      },
      { id: 'VideoCarousel', title: 'Sum & Difference Identities', props: { videos: [
          { url: "", title: 'TR-38 — Angle Sum & Difference' },
          { url: "", title: 'TR-39 — Using Sum/Diff Identities' },
        ]},
      },
      { id: 'VideoCarousel', title: 'Double & Half Angle Identities', props: { videos: [
          { url: "", title: 'TR-40 — Double Angle Identities' },
          { url: "", title: 'TR-41 — Half Angle Identities' },
        ]},
      },
    ],
  },

  math: {
    prose: [
      'The Pythagorean identity $\\sin^2\\theta + \\cos^2\\theta = 1$ has two children you derive by dividing both sides. These are the identities that appear in calculus integrals involving $\\tan$ and $\\sec$.',
      'The angle addition formulas are the workhorses. Every other compound identity derives from them. You should be able to re-derive the double angle formula in seconds by setting $\\beta = \\alpha$.',
      'Power reduction identities — expressing $\\sin^2 x$ and $\\cos^2 x$ as single-angle terms — are the key to integrating even powers of trig functions. If you see $\\int \\sin^2 x\\, dx$ in calculus, power reduction is the move.',
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'Angle Addition Formulas',
        body: '\\sin(A \\pm B) = \\sin A\\cos B \\pm \\cos A\\sin B \\qquad \\cos(A \\pm B) = \\cos A\\cos B \\mp \\sin A\\sin B',
      },
      {
        type: 'theorem',
        title: 'Double Angle Formulas (set $B = A$ above)',
        body: '\\sin 2A = 2\\sin A\\cos A \\qquad \\cos 2A = \\cos^2 A - \\sin^2 A = 1 - 2\\sin^2 A = 2\\cos^2 A - 1',
      },
      {
        type: 'theorem',
        title: 'Power Reduction (solve double angle for $\\sin^2$ and $\\cos^2$)',
        body: '\\sin^2 A = \\frac{1 - \\cos 2A}{2} \\qquad \\cos^2 A = \\frac{1 + \\cos 2A}{2}',
      },
      {
        type: 'warning',
        title: 'The most common calculus mistake with $\\cos 2A$',
        body: '\\cos 2A \\text{ has THREE equivalent forms. Pick the one that eliminates the variable you want.} \\\\ \\text{Seeing } \\sin^2? \\text{ Use } 1 - 2\\sin^2 A. \\quad \\text{Seeing } \\cos^2? \\text{ Use } 2\\cos^2 A - 1.',
      },
      {
        type: 'theorem',
        title: 'The Tangent Construction',
        body: '\\tan(A+B) = \\frac{\\tan A + \\tan B}{1 - \\tan A\\tan B}. \\\\ \\text{This is derived by dividing } \\frac{\\sin(A+B)}{\\cos(A+B)} \\text{ and then dividing all terms by } \\cos A\\cos B.',
      },
      {
        type: 'theorem',
        title: 'The Energy of the Wave',
        body: '\\text{In physics, Intensity (Power) is proportional to } \\sin^2(t). \\\\ \\text{Power reduction reveals } (1 - \\cos 2t)/2 \\text{, which proves that the power of an oscillating wave is itself a wave of double the frequency, centered around an average value of 1/2.}',
      },
    ],
    visualizations: [
      {
        id: 'DoubleAngleViz',
        title: 'Double Angle — Geometric Derivation',
        mathBridge: 'Watch $\\sin(\\theta + \\theta)$ decompose into $2\\sin\\theta\\cos\\theta$ geometrically as the angle doubles.',
        caption: 'The double angle formula is the angle addition formula applied to itself.',
      },
      {
        id: 'ImplicitDiffProof',
        title: 'Proof: x² + y² = r²  →  dy/dx = −x/y',
        mathBridge: 'The Pythagorean identity $\\sin^2\\theta + \\cos^2\\theta = 1$ comes from $x^2 + y^2 = 1$ on the unit circle. When you later learn calculus, this same equation can be differentiated implicitly to find the slope at every point on the circle — a preview of what these identities make possible.',
        caption: 'See what happens when calculus meets the Pythagorean identity: implicit differentiation of x² + y² = r².',
      },
                                                                                        ],
  },

  rigor: {
    title: 'Deriving the Angle Addition Formula from Scratch',
    prose: [
      'We can prove $\\cos(\\alpha - \\beta) = \\cos\\alpha\\cos\\beta + \\sin\\alpha\\sin\\beta$ using only the distance formula and the unit circle definition. All other angle addition formulas follow from this one.',
    ],
    visualizationId: 'AngleAdditionProofViz',
    proofSteps: [
      {
        expression: '\\text{Place points } P_1 = (\\cos\\alpha,\\, \\sin\\alpha) \\text{ and } P_2 = (\\cos\\beta,\\, \\sin\\beta) \\text{ on the unit circle.}',
        annotation: 'Both points are on the unit circle, so their coordinates are exactly their trig values by definition.',
      },
      {
        expression: '|P_1 P_2|^2 = (\\cos\\alpha - \\cos\\beta)^2 + (\\sin\\alpha - \\sin\\beta)^2',
        annotation: 'Apply the distance formula. We\'ll compute this two ways and equate them.',
      },
      {
        expression: '= \\cos^2\\alpha - 2\\cos\\alpha\\cos\\beta + \\cos^2\\beta + \\sin^2\\alpha - 2\\sin\\alpha\\sin\\beta + \\sin^2\\beta',
        annotation: 'Expand both squares.',
      },
      {
        expression: '= (\\cos^2\\alpha + \\sin^2\\alpha) + (\\cos^2\\beta + \\sin^2\\beta) - 2(\\cos\\alpha\\cos\\beta + \\sin\\alpha\\sin\\beta)',
        annotation: 'Group by angle. Each parenthesized pair equals 1 by the Pythagorean identity.',
      },
      {
        expression: '= 2 - 2(\\cos\\alpha\\cos\\beta + \\sin\\alpha\\sin\\beta)',
        annotation: 'Simplify.',
      },
      {
        expression: '\\text{Now rotate: the angle between } P_1 \\text{ and } P_2 \\text{ is } (\\alpha - \\beta), \\text{ so } |P_1 P_2|^2 = 2 - 2\\cos(\\alpha - \\beta)',
        annotation: 'The chord length between two unit circle points separated by angle $\\theta$ is $2 - 2\\cos\\theta$. This is a standard unit circle result.',
      },
      {
        expression: '2 - 2\\cos(\\alpha - \\beta) = 2 - 2(\\cos\\alpha\\cos\\beta + \\sin\\alpha\\sin\\beta)',
        annotation: 'Set the two expressions for $|P_1 P_2|^2$ equal.',
      },
      {
        expression: '\\therefore\\quad \\cos(\\alpha - \\beta) = \\cos\\alpha\\cos\\beta + \\sin\\alpha\\sin\\beta \\qquad \\blacksquare',
        annotation: 'Cancel 2 from both sides. All other angle formulas follow by substituting $-\\beta$, swapping to sin via co-function identities, and setting $\\beta = \\alpha$.',
      },
      {
        expression: '\\text{--- Part II: Deriving the Sine Addition Formula ---}',
        annotation: 'Let us prove $\\sin(A+B) = \\sin A\\cos B + \\cos A\\sin B$ using co-functions.'
      },
      {
        expression: '\\sin(A+B) = \\cos\\left(\\frac{\\pi}{2} - (A+B)\\right)',
        annotation: 'Step 1: Use the co-function identity $\\sin \\theta = \\cos(\\pi/2 - \\theta)$.'
      },
      {
        expression: '= \\cos\\left(\\left(\\frac{\\pi}{2} - A\\right) - B\\right)',
        annotation: 'Step 2: Group the first two terms to use the Cosine Subtraction formula proved in Part I.'
      },
      {
        expression: '= \\cos\\left(\\frac{\\pi}{2} - A\\right)\\cos B + \\sin\\left(\\frac{\\pi}{2} - A\\right)\\sin B',
        annotation: 'Step 3: Expand using the Cosine Subtraction formula.'
      },
      {
        expression: '= \\sin A\\cos B + \\cos A\\sin B \\qquad \\blacksquare',
        annotation: 'Step 4: Use co-function identities again. $\\cos(90-A) = \\sin A$ and $\\sin(90-A) = \\cos A$.'
      }
    ],
  },

  examples: [
    {
      id: 'ch3-001-ex1',
      title: 'Evaluating $\\sin(75°)$ exactly using angle addition',
      problem: '\\text{Find the exact value of } \\sin(75°).',
      steps: [
        {
          expression: '\\sin(75°) = \\sin(45° + 30°)',
          annotation: 'Split into angles whose exact values we know.',
        },
        {
          expression: '= \\sin 45°\\cos 30° + \\cos 45°\\sin 30°',
          annotation: 'Apply the angle addition formula for sin.',
        },
        {
          expression: '= \\frac{\\sqrt{2}}{2} \\cdot \\frac{\\sqrt{3}}{2} + \\frac{\\sqrt{2}}{2} \\cdot \\frac{1}{2}',
          annotation: 'Substitute exact values from the unit circle.',
        },
        {
          expression: '= \\frac{\\sqrt{6} + \\sqrt{2}}{4}',
          annotation: 'Combine fractions. This is the exact answer — no calculator needed.',
        },
      ],
      conclusion: 'Angle addition lets you find exact trig values for any angle that splits into 30°, 45°, or 60° pieces.',
    },
    {
      id: 'ch3-001-ex2',
      title: 'Power Reduction — the setup for $\\int \\sin^2 x\\, dx$',
      problem: '\\text{Rewrite } \\sin^2 x \\text{ so it can be integrated.}',
      steps: [
        {
          expression: '\\cos 2x = 1 - 2\\sin^2 x',
          annotation: 'Start from the double angle formula. Choose the form that has $\\sin^2 x$ in it.',
        },
        {
          expression: '2\\sin^2 x = 1 - \\cos 2x',
          annotation: 'Rearrange to isolate $\\sin^2 x$.',
        },
        {
          expression: '\\sin^2 x = \\frac{1 - \\cos 2x}{2}',
          annotation: 'Now the right side has no powers — it integrates directly term by term.',
        },
        {
          expression: '\\int \\sin^2 x\\, dx = \\int \\frac{1 - \\cos 2x}{2}\\, dx = \\frac{x}{2} - \\frac{\\sin 2x}{4} + C',
          annotation: 'Integrate. Without power reduction this integral has no direct antiderivative.',
        },
      ],
      conclusion: 'Power reduction is the only way to integrate even powers of sin and cos. It converts $\\sin^2$ into a $\\cos 2x$ term, which integrates cleanly.',
      visualizations: [
        {
          id: 'PowerReductionViz',
          title: 'Why $\\sin^2 x$ averages to $\\frac{1}{2}$',
          caption: 'The power reduction rewrite shows that $\\sin^2 x$ oscillates symmetrically around $\\frac{1}{2}$ — its area over a full period is exactly $\\frac{\\pi}{2}$.',
        },
      ],
    },
    {
      id: 'ch3-001-ex3',
      title: 'Choosing the right Pythagorean form under pressure',
      problem: '\\text{Simplify } \\frac{\\sin^2 x}{1 - \\cos x}.',
      steps: [
        {
          expression: '\\sin^2 x = 1 - \\cos^2 x',
          annotation: 'Rewrite numerator using the Pythagorean identity. Key move: recognize $1 - \\cos^2 x$ factors.',
        },
        {
          expression: '= \\frac{(1 - \\cos x)(1 + \\cos x)}{1 - \\cos x}',
          annotation: 'Factor as difference of squares: $a^2 - b^2 = (a-b)(a+b)$.',
        },
        {
          expression: '= 1 + \\cos x \\qquad (x \\neq 0, 2\\pi, \\ldots)',
          annotation: 'Cancel the $(1 - \\cos x)$ factor. Valid wherever the denominator is nonzero.',
        },
      ],
      conclusion: 'When you see $1 \\pm \\cos x$ or $1 \\pm \\sin x$ in a denominator, your first instinct should be the Pythagorean identity — it almost always creates a factorable numerator.',
    },
    {
      id: 'ex-trig-rational-strategy',
      title: 'The Rational Strategy: Complex Verification',
      problem: '\\text{Verify: } \\frac{\\sin \\theta}{1+\\cos \\theta} + \\frac{1+\\cos \\theta}{\\sin \\theta} = 2\\csc \\theta.',
      steps: [
        {
          expression: '\\frac{\\sin^2 \\theta + (1+\\cos \\theta)^2}{\\sin \\theta(1+\\cos \\theta)}',
          annotation: 'Step 1: Find a common denominator.'
        },
        {
          expression: '\\frac{\\sin^2 \\theta + 1 + 2\\cos \\theta + \\cos^2 \\theta}{\\dots}',
          annotation: 'Step 2: Expand the squared binomial.'
        },
        {
          expression: '\\frac{2 + 2\\cos \\theta}{\\sin \\theta(1+\\cos \\theta)}',
          annotation: 'Step 3: Recognize the Pythagorean identity $\\sin^2 \\theta + \\cos^2 \\theta = 1$.'
        },
        {
          expression: '\\frac{2(1+\\cos \\theta)}{\\sin \\theta(1+\\cos \\theta)} = \\frac{2}{\\sin \\theta} = 2\\csc \\theta \\qquad \\blacksquare',
          annotation: 'Step 4: Factor out 2 and cancel the common term.'
        }
      ],
      conclusion: 'Common denominators and Pythagorean recognition are the "Master Keys" for complex rational identities.'
    },
    {
      id: 'ex-trig-triple-angle',
      title: 'Triple Angle Expansion: Predicting the Future',
      problem: '\\text{Derive an expression for } \\sin 3x \\text{ in terms of } \\sin x.',
      steps: [
        {
          expression: '\\sin(2x + x) = \\sin 2x\\cos x + \\cos 2x\\sin x',
          annotation: 'Step 1: Treat 3x as 2x + x.'
        },
        {
          expression: '(2\\sin x\\cos x)\\cos x + (1 - 2\\sin^2 x)\\sin x',
          annotation: 'Step 2: Use double angle identities for sin and cos.'
        },
        {
          expression: '2\\sin x(1 - \\sin^2 x) + \\sin x - 2\\sin^3 x',
          annotation: 'Step 3: Convert all terms to sine using the Pythagorean identity.'
        },
        {
          expression: '3\\sin x - 4\\sin^3 x \\qquad \\blacksquare',
          annotation: 'Step 4: Distribute and combine like terms.'
        }
      ],
      conclusion: 'Higher harmonics can be systematically decomposed by nesting addition formulas.'
    },
  ],

  challenges: [
    {
      id: 'ch3-001-ch1',
      difficulty: 'medium',
      problem: '\\text{Prove: } \\tan^2 x + 1 = \\sec^2 x',
      hint: 'Start from $\\sin^2 x + \\cos^2 x = 1$ and divide every term by $\\cos^2 x$.',
      walkthrough: [
        {
          expression: '\\frac{\\sin^2 x}{\\cos^2 x} + \\frac{\\cos^2 x}{\\cos^2 x} = \\frac{1}{\\cos^2 x}',
          annotation: 'Divide the Pythagorean identity through by $\\cos^2 x$.',
        },
        {
          expression: '\\tan^2 x + 1 = \\sec^2 x \\qquad \\blacksquare',
          annotation: 'By definition $\\sin/\\cos = \\tan$ and $1/\\cos = \\sec$. This identity is crucial for integrals involving $\\sqrt{1 + x^2}$.',
        },
      ],
      answer: '\\tan^2 x + 1 = \\sec^2 x',
    },
    {
      id: 'ch3-001-ch2',
      difficulty: 'hard',
      problem: '\\text{Derive } \\sin^2\\frac{x}{2} = \\frac{1 - \\cos x}{2} \\text{ from the double angle formula.}',
      hint: 'Use $\\cos 2A = 1 - 2\\sin^2 A$ and substitute $A = x/2$.',
      walkthrough: [
        {
          expression: '\\cos 2A = 1 - 2\\sin^2 A',
          annotation: 'Start from the double angle formula (the $\\sin^2$ form).',
        },
        {
          expression: '\\text{Let } A = \\frac{x}{2}: \\quad \\cos x = 1 - 2\\sin^2\\frac{x}{2}',
          annotation: 'Substitute $A = x/2$ so $2A = x$.',
        },
        {
          expression: '\\sin^2\\frac{x}{2} = \\frac{1 - \\cos x}{2} \\qquad \\blacksquare',
          annotation: 'Rearrange. This is the half-angle identity — useful for integrating $\\sin^2(x/2)$ and appears in Fourier series.',
        },
      ],
      answer: '\\sin^2\\tfrac{x}{2} = \\tfrac{1 - \\cos x}{2}',
    },
    {
      id: 'ch3-trig-001-ch3',
      difficulty: 'harder',
      problem: '\\text{Combine the addition and subtraction formulas to prove: } \\sin A\\cos B = \\frac{1}{2}\\left[\\sin(A+B) + \\sin(A-B)\\right].',
      hint: 'Write out the full expansion for both sine formulas and add them together.',
      walkthrough: [
        {
          expression: '\\sin(A+B) = \\sin A\\cos B + \\cos A\\sin B',
          annotation: 'Step 1: Write the addition formula.'
        },
        {
          expression: '\\sin(A-B) = \\sin A\\cos B - \\cos A\\sin B',
          annotation: 'Step 2: Write the subtraction formula.'
        },
        {
          expression: '\\sin(A+B) + \\sin(A-B) = 2\\sin A\\cos B',
          annotation: 'Step 3: Combine. Notice the matched terms add up, while the opposite terms cancel out exactly.'
        },
        {
          expression: '\\sin A\\cos B = \\frac{1}{2}\\left[\\sin(A+B) + \\sin(A-B)\\right] \\qquad \\blacksquare',
          annotation: 'Step 4: Algebraic isolation for the product.'
        }
      ],
      answer: '\\sin A\\cos B = \\frac{1}{2}[\\sin(A+B) + \\sin(A-B)]'
    }
  ],

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'The Pythagorean identity sin²(x) + cos²(x) = 1. What geometric fact does this express?',
      options: [
        'That sine and cosine are both bounded between -1 and 1',
        'Any point (cos θ, sin θ) on the unit circle satisfies x² + y² = 1 — the equation of the unit circle; the identity is simply the Pythagorean theorem applied to the right triangle formed by the radius, the x-coordinate (cos θ), and the y-coordinate (sin θ)',
        'That the sum of sine and cosine over any interval equals 1',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'The double angle formula cos(2θ) = 1 - 2sin²(θ). This rearranges to sin²(θ) = (1 - cos(2θ))/2. Why is this power-reduction form critical in integration?',
      options: [
        'Power reduction makes the formula shorter and easier to remember',
        'Integrals of sin²(x) have no closed form without power reduction; substituting sin²(x) = (1-cos(2x))/2 converts the integral to ∫(1-cos(2x))/2 dx = x/2 - sin(2x)/4 + C — a standard antiderivative. This is the fundamental technique for integrating even powers of trig functions',
        'Power reduction is needed only when the angle is greater than π',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'The sum-to-product formula: sin(A) + sin(B) = 2·sin((A+B)/2)·cos((A-B)/2). Why was this historically important?',
      options: [
        'It was used to simplify logarithm calculations before calculators',
        'It converts a SUM of sines (hard to compute by hand) into a PRODUCT (easier to compute using logarithms — multiplication becomes addition in log space). Astronomers and navigators used these "prostaphaeresis" formulas for hundreds of years to replace expensive multiplication with addition',
        'It is used to solve triangles when two angles are given without any sides',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'sin(A+B) = sin(A)cos(B) + cos(A)sin(B). If you try to apply this with A=B=x, what identity do you derive?',
      options: [
        'sin(2x) = 2sin(x) — the factor of 2 comes from having two equal terms',
        'sin(2x) = 2sin(x)cos(x) — substituting A=B=x: sin(x)cos(x) + cos(x)sin(x) = 2sin(x)cos(x). This is the double-angle formula for sine, derived directly from the angle addition formula with a simple substitution',
        'sin(2x) = sin²(x) + cos²(x) = 1, since both terms are the same',
      ],
      correct: 1,
    },
  ],
}
