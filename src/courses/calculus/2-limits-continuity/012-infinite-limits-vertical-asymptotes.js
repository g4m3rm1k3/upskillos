import verticalAsymptoteUrl from '../diagrams/calc-vertical-asymptote.svg?url';
import limitsInfinityUrl from '../diagrams/calc-limits-infinity.svg?url';
import vertAsymSignUrl from '../diagrams/calc-vert-asym-sign.svg?url';
export default {
  id: 'ch1-infinite-limits-vertical-asymptotes',
  slug: 'infinite-limits-vertical-asymptotes',
  chapter: 1,
  order: 5,
  title: 'Infinite Limits & Vertical Asymptotes',
  subtitle: 'When function values grow without bound near a point',
  tags: ['infinite-limits', 'vertical-asymptote', 'one-sided-limits', 'rational-functions', 'unbounded'],

  hook: {
    question: 'What does it mean for a limit to equal infinity — and isn\'t infinity not a number?',
    realWorldContext:
      'Gravity near a black hole intensifies without bound as distance r → 0. ' +
      'The gravitational field g = GM/r² has a vertical asymptote at r = 0: as you approach the singularity, g → ∞. ' +
      'Electric fields near a point charge, sound pressure near a speaker cone, pressure in an ideal gas at zero volume — ' +
      'all of these are real-world situations where a quantity grows without bound. ' +
      '"The limit is infinity" is our precise way of saying "the function grows beyond every bound" — ' +
      'infinity is not a value the function reaches, it\'s a description of the function\'s behavior.',
    previewVisualizationId: '',
  },

  intuition: {
    blocks: [
      {
        type: 'prose',
        paragraphs: [
          'When we write lim(x→a) f(x) = ∞, we mean: no matter how large a number M you choose, ' +
          'f(x) will eventually exceed M as x gets close to a. The function "grows without bound."',
        ],
      },
      { type: 'image', src: verticalAsymptoteUrl, alt: 'Vertical asymptote panels: 1/x² (both → +∞) and 1/x (opposite signs)', caption: 'A vertical asymptote at x=a occurs when the denominator is zero and the numerator is not.' },
      {
        type: 'prose',
        paragraphs: [
          'This is different from a regular limit (where the function approaches a finite value). ' +
          'Technically, a limit of ±∞ means the limit does NOT EXIST in the strict sense — ' +
          'but we write "= ∞" to give useful, specific information ABOUT why it fails to exist.',
        ],
      },
      { type: 'image', src: limitsInfinityUrl, alt: 'Contrasting horizontal asymptotes (end behavior) with vertical blow-up', caption: 'Vertical asymptotes: limits near a finite point. Horizontal: limits as x → ±∞.' },
      {
        type: 'prose',
        paragraphs: [
          'To determine whether a vertical asymptote goes to +∞ or −∞ from each side, use a sign chart. ' +
          'Test one value in each interval defined by the asymptote — the sign of the numerator and denominator separately determines the sign of the quotient, and hence the direction of blow-up.',
        ],
      },
      { type: 'image', src: vertAsymSignUrl, alt: 'Sign chart method for determining ±∞ direction of vertical asymptote limits', caption: 'Test a point on each side of the asymptote to determine whether the limit is +∞ or −∞.' },
    ],
  },

  math: {
    blocks: [
      {
        type: 'callout',
        callout: {
          type: 'definition',
          title: 'Infinite Limits — Formal Meaning',
          body: '\\lim_{x\\to a} f(x) = \\infty \\iff \\forall M > 0,\\;\\exists\\,\\delta > 0: 0 < |x-a| < \\delta \\Rightarrow f(x) > M \\\\ \\lim_{x\\to a} f(x) = -\\infty \\iff \\forall M > 0,\\;\\exists\\,\\delta > 0: 0 < |x-a| < \\delta \\Rightarrow f(x) < -M',
        },
      },
      {
        type: 'callout',
        callout: {
          type: 'definition',
          title: 'Vertical Asymptote',
          body: 'The line $x = a$ is a **vertical asymptote** of $f$ if at least one of these is true: \\\\ \\lim_{x\\to a^-} f(x) = \\pm\\infty \\quad \\text{or} \\quad \\lim_{x\\to a^+} f(x) = \\pm\\infty',
        },
      },
      {
        type: 'prose',
        paragraphs: [
          '**Finding vertical asymptotes of rational functions:**',
          'For f(x) = p(x)/q(x) where p and q are polynomials (with no common factors):',
          '• Set q(x) = 0 to find candidates',
          '• At each candidate a, check whether the numerator p(a) ≠ 0',
          '  - If p(a) ≠ 0: there IS a vertical asymptote at x = a',
          '  - If p(a) = 0: there is a REMOVABLE discontinuity (a "hole"), not a vertical asymptote — cancel the common factor first',
          'Note: If p and q share a factor (x − a), always cancel it before classifying the discontinuity.',
        ],
      },
      {
        type: 'callout',
        callout: {
          type: 'tip',
          title: 'Determining the Sign of the Infinite Limit',
          body: 'To determine if an infinite limit is +∞ or −∞:\n' +
                '1. Write out the sign of the numerator near x = a\n' +
                '2. Write out the sign of the denominator for x → a⁺ and x → a⁻\n' +
                '3. Divide signs: +/+ = + | +/− = − | −/+ = − | −/− = +\n' +
                'Example: lim(x→2⁺) 1/(x−2) → 1/(tiny positive) = +∞\n' +
                'Example: lim(x→2⁻) 1/(x−2) → 1/(tiny negative) = −∞',
        },
      },
      {
        type: 'prose',
        paragraphs: [
          '**Infinite limits of common functions:**',
          '• lim(x→0⁺) ln(x) = −∞ (log blows to −∞ as x → 0 from the right)',
          '• lim(x→0⁺) 1/x = +∞',
          '• lim(x→0⁻) 1/x = −∞',
          '• lim(x→(π/2)⁻) tan(x) = +∞',
          '• lim(x→(π/2)⁺) tan(x) = −∞',
          '• lim(x→0⁺) 1/x² = +∞ (same from both sides, since x² > 0 always)',
        ],
      },
    ],
  },

  rigor: {
    prose: [
      '**Why "= ∞" doesn\'t mean the limit exists:** In the real number system ℝ, ∞ is not a number. ' +
      'So strictly, lim(x→a) f(x) = ∞ means the limit FAILS to exist at a — but it fails in a specific, ' +
      'informative way (the function grows without bound). The statement "lim = ∞" gives more information ' +
      'than just "DNE."',
      'In the **extended real number system** ℝ̄ = ℝ ∪ {−∞, +∞}, we can legitimately say a limit equals ∞. ' +
      'This is how analysis textbooks frame it. For calculus purposes, the statement is used informally ' +
      'to mean "grows without bound."',
      '**Vertical asymptotes and continuity:** A function with a vertical asymptote at x = a cannot be continuous there. ' +
      'It is not even defined there (or if it is, the limit is ∞ which ≠ f(a)). ' +
      'Vertical asymptotes are therefore always infinite discontinuities — one of the four types of discontinuity ' +
      'introduced in "Types of Discontinuities."',
    ],
    callouts: [
      {
        type: 'tip',
        title: 'Vertical Asymptotes vs. Holes at Zeros of Denominators',
        body: '\\frac{x^2-4}{x-2} = \\frac{(x-2)(x+2)}{x-2} = x+2 \\quad (x \\neq 2) \\\\ \\text{This has a HOLE at } x=2,\\text{ not an asymptote, because the factors cancel.} \\\\ \\frac{x+1}{x-2} \\text{ has a vertical asymptote at } x=2 \\text{ (numerator is } 3 \\neq 0 \\text{ there).}',
      },
    ],
    visualizationId: null,
  },

  examples: [
    {
      id: 'ex-rational-asymptote',
      title: 'Identifying and Evaluating Infinite Limits',
      problem: 'For $f(x) = \\dfrac{x+3}{(x-1)^2(x+2)}$, find all vertical asymptotes and evaluate the limit at each from both sides.',
      steps: [
        {
          expression: '\\text{Set denominator} = 0: (x-1)^2(x+2) = 0 \\implies x = 1 \\text{ or } x = -2',
          annotation: 'Candidates for vertical asymptotes.',
        },
        {
          expression: '\\text{Check numerator at } x=1: x+3 = 4 \\neq 0',
          annotation: 'No cancellation. x = 1 IS a vertical asymptote.',
        },
        {
          expression: '\\text{Check numerator at } x=-2: x+3 = 1 \\neq 0',
          annotation: 'No cancellation. x = −2 IS a vertical asymptote.',
        },
        {
          expression: '\\textbf{At } x=1: \\text{ numerator} \\approx 4 > 0, \\text{ denominator: } (x-1)^2 \\geq 0 \\text{ always}',
          annotation: '(x−1)² is always ≥ 0, so denominator is positive for x near 1. Sign of (x+2): +. So overall denominator is positive from both sides.',
        },
        {
          expression: '\\lim_{x\\to 1^-} f(x) = \\lim_{x\\to 1^+} f(x) = +\\infty',
          annotation: 'Positive numerator divided by positive denominator (→ 0⁺) = +∞ from both sides.',
        },
        {
          expression: '\\textbf{At } x=-2: \\text{ numerator} \\approx 1 > 0',
          annotation: '',
        },
        {
          expression: 'x \\to -2^-: (x+2) < 0,\\; (x-1)^2 > 0 \\Rightarrow \\text{denom} < 0 \\Rightarrow f(x) \\to -\\infty',
          annotation: '',
        },
        {
          expression: 'x \\to -2^+: (x+2) > 0,\\; (x-1)^2 > 0 \\Rightarrow \\text{denom} > 0 \\Rightarrow f(x) \\to +\\infty',
          annotation: '',
        },
      ],
      conclusion: 'x = 1 has same-sign asymptote (both sides → +∞) because (x−1)² never changes sign. x = −2 has opposite signs (left → −∞, right → +∞) because (x+2) changes sign at −2.',
    },
    {
      id: 'ex-hole-vs-asymptote',
      title: 'Hole vs. Vertical Asymptote',
      problem: 'Classify the discontinuity at $x = 2$ for: (a) $f(x) = \\dfrac{x^2-4}{x-2}$, (b) $g(x) = \\dfrac{x^2-4}{(x-2)^2}$.',
      steps: [
        {
          expression: '\\textbf{(a) } f(x) = \\frac{(x-2)(x+2)}{x-2} = x + 2 \\quad (x \\neq 2)',
          annotation: 'Factor and cancel the common (x−2).',
        },
        {
          expression: '\\lim_{x\\to 2} f(x) = \\lim_{x\\to 2}(x+2) = 4',
          annotation: 'The limit exists and is finite. This is a REMOVABLE discontinuity (hole at (2, 4)).',
        },
        {
          expression: '\\textbf{(b) } g(x) = \\frac{(x-2)(x+2)}{(x-2)^2} = \\frac{x+2}{x-2} \\quad (x \\neq 2)',
          annotation: 'Cancel one factor of (x−2); still has (x−2) in denominator.',
        },
        {
          expression: '\\lim_{x\\to 2^+} g(x) = \\frac{4}{0^+} = +\\infty, \\quad \\lim_{x\\to 2^-} g(x) = \\frac{4}{0^-} = -\\infty',
          annotation: 'After canceling, numerator → 4 and denominator → 0. Infinite limits → x = 2 IS a vertical asymptote.',
        },
      ],
      conclusion: '(a) is a hole (removable discontinuity) — the common factor cancels completely. (b) is a vertical asymptote — the factor only partially cancels. Always simplify fully before classifying.',
    },
  ],

  challenges: [
    {
      id: 'ch1-ilva-c1',
      difficulty: 'easy',
      problem: 'Evaluate $\\displaystyle\\lim_{x\\to 3^+} \\frac{2}{x-3}$ and $\\displaystyle\\lim_{x\\to 3^-} \\frac{2}{x-3}$.',
      hint: 'Think about the sign of (x − 3) when x is slightly greater than 3 vs. slightly less than 3.',
      walkthrough: [
        { expression: 'x \\to 3^+: (x-3) \\to 0^+ \\Rightarrow \\frac{2}{0^+} = +\\infty', annotation: '' },
        { expression: 'x \\to 3^-: (x-3) \\to 0^- \\Rightarrow \\frac{2}{0^-} = -\\infty', annotation: '' },
      ],
      answer: 'Right-hand limit = +∞, left-hand limit = −∞',
    },
    {
      id: 'ch1-ilva-c2',
      difficulty: 'medium',
      problem: 'Find all vertical asymptotes of $f(x) = \\dfrac{\\sin x}{x^2 - \\pi^2}$.',
      hint: 'Factor the denominator as (x−π)(x+π). Check the numerator at x = π and x = −π.',
      walkthrough: [
        { expression: 'x^2 - \\pi^2 = (x-\\pi)(x+\\pi) = 0 \\implies x = \\pm\\pi', annotation: '' },
        { expression: '\\sin(\\pi) = 0 \\implies \\text{possible hole at } x = \\pi', annotation: 'Numerator also zero — need L\'Hôpital or limit check.' },
        { expression: '\\lim_{x\\to\\pi} \\frac{\\sin x}{(x-\\pi)(x+\\pi)}: \\text{ let } u = x-\\pi, \\; \\sin(u+\\pi) = -\\sin u', annotation: '' },
        { expression: '\\lim_{u\\to 0} \\frac{-\\sin u}{u \\cdot 2\\pi} = \\frac{-1}{2\\pi} \\quad (\\text{finite})', annotation: 'Limit exists and is finite → hole at x = π, not an asymptote.' },
        { expression: '\\sin(-\\pi) = 0 \\implies \\text{check } x=-\\pi \\text{ similarly} \\to \\text{hole at } x=-\\pi', annotation: '' },
        { expression: '\\therefore \\text{ NO vertical asymptotes — both are removable discontinuities.}', annotation: '' },
      ],
      answer: 'No vertical asymptotes — both x = π and x = −π are removable discontinuities (holes).',
    },
  ],

  crossRefs: [
    { lessonSlug: 'one-sided-limits', label: 'Prerequisite: One-Sided Limits', context: 'Vertical asymptotes are described using one-sided infinite limits.' },
    { lessonSlug: 'limits-at-infinity', label: 'Compare: Limits at Infinity', context: 'Horizontal asymptotes — the opposite situation: input grows, not output.' },
    { lessonSlug: 'types-of-discontinuities', label: 'Related: Types of Discontinuities', context: 'Vertical asymptotes are infinite discontinuities.' },
    { lessonSlug: 'lhopital', label: 'Future Use: L\'Hôpital\'s Rule (Ch. 3)', context: 'Handles 0/0 and ∞/∞ indeterminate forms.' },
  ],

  checkpoints: ['read-intuition', 'read-math', 'read-rigor', 'completed-example-1', 'completed-example-2', 'solved-challenge'],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'What does lim(x→2⁺) 1/(x−2) equal, and why?',
      options: [
        '0 — dividing by an increasingly large denominator shrinks the fraction toward zero',
        '+∞ — as x approaches 2 from the right, (x−2) is a small positive number, so 1/(x−2) grows without bound in the positive direction',
        '−∞ — the function flips sign when the input gets close to the singularity',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'For 1/(x−2), the left-hand limit at x = 2 is −∞ and the right-hand limit is +∞. What does this mean for the two-sided limit?',
      options: [
        'The two-sided limit is ∞ — both sides blow up so the combined limit is infinite',
        'The two-sided limit does not exist — the left and right limits are not equal (they differ in sign)',
        'The two-sided limit is 0 — the two infinite values cancel each other',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'A function has a vertical asymptote at x = a. What must be true?',
      options: [
        'f(a) must be undefined — the function cannot be defined at a vertical asymptote',
        'At least one one-sided limit at x = a must be +∞ or −∞ — the function grows without bound as x approaches a from at least one direction',
        'Both one-sided limits must be +∞ — the function must blow up symmetrically on both sides',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'How do you find the vertical asymptotes of f(x) = (x+1)/((x−3)(x+2))?',
      options: [
        'Set the numerator equal to zero: x + 1 = 0 gives x = −1, so the vertical asymptote is at x = −1',
        'Set the denominator equal to zero: (x−3)(x+2) = 0 gives x = 3 and x = −2, and since neither cancels with the numerator, both are vertical asymptotes',
        'Set the whole function equal to infinity and solve for x — this gives the points where the graph goes vertical',
      ],
      correct: 1,
    },
  ],
}
