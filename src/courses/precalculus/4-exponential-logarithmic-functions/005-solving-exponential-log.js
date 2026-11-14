export default {
  id: 'precalc4-005',
  slug: 'solving-exponential-log',
  chapter: 'precalc-4',
  order: 5,
  title: 'Solving Exponential and Logarithmic Equations',
  subtitle: 'Two moves unlock every equation in this family: take a log of both sides, or exponentiate both sides',
  tags: ['solving exponential equations', 'solving logarithmic equations', 'natural log', 'common log', 'extraneous solutions', 'one-to-one property', 'different bases'],
  aliases: 'solve exponential equation logarithmic equation log both sides exponentiate one-to-one property extraneous solutions different bases',

  hook: {
    question: 'To solve $2^x = 5$, you cannot just take a square root or factor. You need to "undo" the exponential — and that is exactly what logarithms are for. Once you know the move, every exponential equation becomes a linear or quadratic equation in disguise.',
    realWorldContext: 'Solving exponential equations is how scientists compute radioactive half-lives, how pharmacists calculate drug elimination times, and how financial analysts find the time for an investment to reach a target. Solving logarithmic equations appears in chemistry (pH calculations), acoustics (decibel levels), and seismology (Richter magnitudes). The same two algebraic moves — take a log, or exponentiate — unlock all of these.',
    previewVisualizationId: 'ExpLogSolverViz',
  },

  intuition: {
    prose: [
      '**Where you are in the story:** You have built up the full toolkit: exponential functions, their inverse logarithms, the natural base $e$ and $\\ln$, and the three log properties. Now all of that pays off in one place — solving the equations these functions appear in. Everything you learned was preparation for this lesson.',
      'There are two master moves. To solve an exponential equation: take the logarithm of both sides. To solve a logarithmic equation: exponentiate both sides (raise the base to each side as an exponent). These two moves are inverses of each other — each undoes what the other does.',
      'The one-to-one property makes both moves valid: if $b^x = b^y$ then $x = y$ (exponentials are one-to-one), and if $\\log_b x = \\log_b y$ then $x = y$ (logs are one-to-one). This means equal outputs imply equal inputs — the foundation for all equation solving here.',
      'Logarithmic equations require a domain check — extraneous solutions are common. After solving, substitute every answer back into the original equation. Any answer that makes a log argument non-positive is extraneous and must be discarded. Exponential equations have no extraneous solutions because $b^x > 0$ always.',
      '**Where this is heading:** The final lesson in this chapter applies these exact solving techniques to real-world models — population growth, radioactive decay, Newton\'s law of cooling. Every real application reduces to exactly the equations you are practicing here.',
    ],
    callouts: [
      { type: 'sequencing', title: 'Precalc-4 arc — Lesson 5 of 6', body: '← The Natural Base e and ln | **Solving Exponential & Log Equations** | Exponential Applications →' },
      {
        type: 'proof-map',
        title: 'Master strategy — two types, two moves',
        body: '\\text{Exponential equation (variable in exponent):} \\\\ \\quad \\Rightarrow \\text{take } \\ln \\text{ (or } \\log\\text{) of both sides, use power rule} \\\\ \\quad \\Rightarrow \\text{if same base: set exponents equal (one-to-one)} \\\\ \\text{Logarithmic equation (variable inside log):} \\\\ \\quad \\Rightarrow \\text{condense to one log, then exponentiate both sides} \\\\ \\quad \\Rightarrow \\textbf{always check for extraneous solutions}',
      },
      {
        type: 'theorem',
        title: 'One-to-one properties',
        body: 'b^x = b^y \\iff x = y \\quad \\text{(exponential one-to-one)} \\\\ \\log_b x = \\log_b y \\iff x = y \\quad \\text{(log one-to-one)} \\\\ \\text{These let you "cancel" matching bases or matching logs.}',
      },
      {
        type: 'warning',
        title: 'Extraneous solutions in log equations',
        body: '\\text{Solve, then CHECK every answer.} \\\\ \\text{Example: if you get } x = -5 \\text{, and the equation has } \\ln(x+3), \\\\ \\text{then } \\ln(-5+3) = \\ln(-2) \\text{ is undefined.} \\\\ x = -5 \\text{ is extraneous — discard it.}',
      },
    ],
    visualizations: [
      {
        id: 'ExpLogSolverViz',
        title: 'Graphical Solution — Where the Curves Intersect',
        mathBridge: 'Step 1: Enter the equation $2^x = 5$. The left side $y = 2^x$ and the right side $y = 5$ are plotted as two curves. The solution is the $x$-coordinate of their intersection. Step 2: Zoom in on the intersection and read the approximate $x$ value. Step 3: Enter the algebraic answer $x = \\ln(5)/\\ln(2) \\approx 2.32$ and verify the curves cross exactly there. The key lesson: every equation is secretly "find where two functions are equal" — the intersection picture makes this concrete and lets you check algebraic answers visually.',
        caption: 'Every equation is secretly "find where two functions are equal." Seeing the intersection makes the solution concrete.',
      },
    ],
  },

  math: {
    prose: [
      'When both sides have the same base, set exponents equal directly: $3^{2x+1} = 3^{x-4} \\Rightarrow 2x+1 = x-4$. When bases differ, take $\\ln$ of both sides and use the power rule: $5^x = 12 \\Rightarrow x\\ln 5 = \\ln 12 \\Rightarrow x = \\ln 12 / \\ln 5$. This is exact — do not approximate until the final step.',
      'Some exponential equations are quadratic in disguise. $e^{2x} - 5e^x + 6 = 0$ is a quadratic in $e^x$: let $u = e^x$, factor $u^2 - 5u + 6 = (u-2)(u-3) = 0$, giving $e^x = 2$ or $e^x = 3$, so $x = \\ln 2$ or $x = \\ln 3$. Recognising this substitution is a key skill.',
      'Equations with different log bases: use the change of base formula to convert everything to $\\ln$ or $\\log$, then solve algebraically. Alternatively, use the one-to-one property after getting logs with the same base on both sides.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Solving exponential equations — the full toolkit',
        body: '\\text{Same base: } b^{f(x)} = b^{g(x)} \\Rightarrow f(x) = g(x) \\\\ \\text{Different bases: take ln both sides} \\Rightarrow x = \\frac{\\ln(\\text{RHS})}{\\ln(\\text{base})} \\\\ \\text{Quadratic type: substitute } u = b^x, \\text{ factor, solve for } u, \\text{ then } x = \\log_b u',
      },
      {
        type: 'definition',
        title: 'Solving logarithmic equations — the full toolkit',
        body: '\\text{One log: } \\log_b f(x) = c \\Rightarrow f(x) = b^c \\\\ \\text{Multiple logs: condense to one log first, then exponentiate} \\\\ \\text{Equal logs: } \\log_b f(x) = \\log_b g(x) \\Rightarrow f(x) = g(x) \\\\ \\textbf{Always: check domain of original equation}',
      },
    ],
  },

  rigor: {
    title: 'Solving a quadratic exponential: $e^{2x} - 7e^x + 10 = 0$',
    visualizationId: 'ExpLogSolverViz',
    proofSteps: [
      {
        expression: '\\text{Recognise: } e^{2x} = (e^x)^2. \\text{ Let } u = e^x.',
        annotation: 'Substitution reveals the hidden quadratic structure. $u > 0$ always (exponential is always positive).',
      },
      {
        expression: 'u^2 - 7u + 10 = 0 \\Rightarrow (u-2)(u-5) = 0',
        annotation: 'Factor the quadratic in $u$.',
      },
      {
        expression: 'u = 2 \\Rightarrow e^x = 2 \\Rightarrow x = \\ln 2 \\approx 0.693',
        annotation: 'First solution: take $\\ln$ of both sides.',
      },
      {
        expression: 'u = 5 \\Rightarrow e^x = 5 \\Rightarrow x = \\ln 5 \\approx 1.609',
        annotation: 'Second solution.',
      },
      {
        expression: '\\text{No domain check needed — } e^x > 0 \\text{ always, so no extraneous solutions.} \\qquad \\blacksquare',
        annotation: 'Both solutions are valid. Answer: $x = \\ln 2$ or $x = \\ln 5$.',
      },
    ],
  },

  examples: [
    {
      id: 'ch4-004-ex1',
      title: 'Different bases — take ln of both sides',
      problem: '\\text{Solve: } 5^{x+2} = 3^{2x-1}',
      steps: [
        {
          expression: '\\ln(5^{x+2}) = \\ln(3^{2x-1})',
          annotation: 'Take ln of both sides. Valid because ln is one-to-one.',
          hint: 'When the bases differ, taking ln of both sides is the only algebraic move available.',
        },
        {
          expression: '(x+2)\\ln 5 = (2x-1)\\ln 3',
          annotation: 'Power rule: bring exponents down.',
          hint: 'The power rule ln(a^n) = n·ln(a) brings each exponent down as a coefficient.',
        },
        {
          expression: 'x\\ln 5 + 2\\ln 5 = 2x\\ln 3 - \\ln 3',
          annotation: 'Expand both sides.',
          hint: 'Distribute ln(5) on the left and ln(3) on the right — these are constants, so treat them like ordinary numbers.',
        },
        {
          expression: 'x(\\ln 5 - 2\\ln 3) = -\\ln 3 - 2\\ln 5',
          annotation: 'Collect $x$ terms on one side.',
          hint: 'Subtract 2x·ln(3) from both sides, subtract 2·ln(5) from both sides, then factor out x.',
        },
        {
          expression: 'x = \\frac{-\\ln 3 - 2\\ln 5}{\\ln 5 - 2\\ln 3} = \\frac{\\ln 3 + 2\\ln 5}{2\\ln 3 - \\ln 5} \\approx \\frac{4.288}{1.415} \\approx 3.03',
          annotation: 'Solve. Leave exact, approximate at the end.',
          hint: 'Divide both sides by (ln5 - 2·ln3). Multiply numerator and denominator by -1 for a cleaner form.',
        },
      ],
      conclusion: 'When bases differ, take ln immediately. The power rule converts the equation to linear — collect $x$ terms, factor, divide.',
    },
    {
      id: 'ch4-004-ex2',
      title: 'Log equation — extraneous solution',
      problem: '\\text{Solve: } \\log_2(x+3) + \\log_2(x-3) = 4',
      steps: [
        {
          expression: '\\log_2[(x+3)(x-3)] = 4',
          annotation: 'Condense using the product rule.',
          hint: 'Use the product rule: log(A) + log(B) = log(AB). Condense before exponentiating.',
        },
        {
          expression: '\\log_2(x^2-9) = 4 \\Rightarrow x^2 - 9 = 2^4 = 16',
          annotation: 'Exponentiate both sides: $2^{\\log_2(...)} = ...$',
          hint: 'Exponentiate with base 2: raise 2 to both sides. The left side simplifies via the cancel identity.',
        },
        {
          expression: 'x^2 = 25 \\Rightarrow x = \\pm 5',
          annotation: 'Solve the resulting equation.',
          hint: 'Add 9 to both sides to get x^2 = 25, then take the square root — both ±5 are candidates.',
        },
        {
          expression: '\\text{Check } x=5: \\log_2(8)+\\log_2(2)=3+1=4 \\checkmark',
          annotation: 'Valid.',
          hint: 'Substitute x = 5 back into the original equation and verify each log argument is positive.',
        },
        {
          expression: '\\text{Check } x=-5: \\log_2(-2) \\text{ is undefined.} \\times \\Rightarrow \\text{extraneous}',
          annotation: 'Discard $x=-5$. Only $x=5$ is valid.',
          hint: 'Substitute x = -5: log₂(-5+3) = log₂(-2) — a negative argument is undefined. Reject this solution.',
        },
      ],
      conclusion: 'Quadratic log equations often produce two candidates but one is extraneous. Always check both.',
    },
    {
      id: 'ch4-004-ex3',
      title: 'Natural exponential equation',
      problem: '\\text{Solve: } 3e^{2x} - 4 = 11',
      steps: [
        {
          expression: '3e^{2x} = 15 \\Rightarrow e^{2x} = 5',
          annotation: 'Isolate the exponential first.',
          hint: 'Add 4 to both sides, then divide by 3 to isolate the exponential before taking ln.',
        },
        {
          expression: '\\ln(e^{2x}) = \\ln 5 \\Rightarrow 2x = \\ln 5',
          annotation: 'Take ln of both sides. $\\ln(e^{2x}) = 2x$ by cancellation identity.',
          hint: 'Take ln of both sides. The cancel identity ln(e^(2x)) = 2x clears the left side.',
        },
        {
          expression: 'x = \\frac{\\ln 5}{2} \\approx \\frac{1.609}{2} \\approx 0.805',
          annotation: 'Exact answer first, decimal approximation second.',
          hint: 'Divide both sides by 2. Write the exact answer ln(5)/2 before computing the decimal.',
        },
      ],
      conclusion: 'Always isolate the exponential before taking the log. Never take ln before the base is alone on one side.',
    },
  ],

  challenges: [
    {
      id: 'ch4-004-ch1',
      difficulty: 'medium',
      problem: '\\text{Solve: } \\log_3(x-1) - \\log_3(x+1) = 2',
      hint: 'Use the quotient rule to condense, then exponentiate base 3.',
      walkthrough: [
        {
          expression: '\\log_3\\frac{x-1}{x+1} = 2 \\Rightarrow \\frac{x-1}{x+1} = 3^2 = 9',
          annotation: 'Condense and exponentiate.',
        },
        {
          expression: 'x - 1 = 9(x+1) = 9x + 9 \\Rightarrow -8x = 10 \\Rightarrow x = -\\frac{5}{4}',
          annotation: 'Solve the resulting equation.',
        },
        {
          expression: '\\text{Check: } x-1 = -\\tfrac{9}{4} < 0. \\text{ Logarithm undefined.} \\Rightarrow \\text{no solution}',
          annotation: 'Extraneous! The original equation has NO solution.',
        },
      ],
      answer: '\\text{No solution (extraneous result)}',
    },
    {
      id: 'ch4-004-ch2',
      difficulty: 'hard',
      problem: '\\text{Solve } 2^x + 2^{-x} = 5. \\text{ Hint: it is quadratic in } 2^x.',
      hint: 'Multiply through by $2^x$ to clear the negative exponent.',
      walkthrough: [
        {
          expression: '\\text{Let } u = 2^x. \\text{ Then } 2^{-x} = 1/u. \\text{ Equation: } u + 1/u = 5.',
          annotation: 'Substitution.',
        },
        {
          expression: 'u^2 + 1 = 5u \\Rightarrow u^2 - 5u + 1 = 0 \\Rightarrow u = \\frac{5 \\pm \\sqrt{21}}{2}',
          annotation: 'Multiply by $u$, apply quadratic formula.',
        },
        {
          expression: 'u > 0 \\text{ both roots}: u = \\frac{5+\\sqrt{21}}{2} \\approx 4.79 \\text{ or } u = \\frac{5-\\sqrt{21}}{2} \\approx 0.21',
          annotation: 'Both are positive, so both give valid solutions.',
        },
        {
          expression: 'x = \\log_2\\frac{5+\\sqrt{21}}{2} \\approx 2.26 \\quad \\text{or} \\quad x = \\log_2\\frac{5-\\sqrt{21}}{2} \\approx -2.26',
          annotation: 'Note symmetry: the two solutions are negatives of each other (because $2^x + 2^{-x}$ is even).',
        },
      ],
      answer: 'x = \\pm\\log_2\\!\\left(\\dfrac{5+\\sqrt{21}}{2}\\right) \\approx \\pm 2.26',
    },
  ],

  calcBridge: {
    teaser: 'Solving $e^{kt} = N$ is the fundamental step in every separable differential equation with exponential solutions. The technique appears in: Newton\'s Law of Cooling ($T = T_e + Ce^{kt}$), population dynamics ($P = P_0 e^{rt}$), and RC circuits ($V = V_0 e^{-t/RC}$). In each case, isolating the exponential and taking $\\ln$ of both sides gives the time variable directly.',
    linkedLessons: ['exponential-functions', 'exponential-applications', 'log-properties'],
  },

  crossRefs: [
    { slug: 'log-properties', reason: 'The power rule (to bring exponents down) and condensing (to combine logs before exponentiating) are the most-used log properties in this lesson.' },
    { slug: 'natural-base-e-and-ln', reason: 'The cancel identities ln(e^x) = x and e^(ln x) = x, introduced there, are the core moves in solving exponential and log equations.' },
    { slug: 'exponential-applications', reason: 'Every real-world model in the next lesson reduces to one of the equation types solved here.' },
  ],

  checkpoints: [
    'What are the two master moves for solving exponential and logarithmic equations?',
    'Solve $4^x = 20$ exactly using logarithms.',
    'Explain why logarithmic equations can have extraneous solutions but exponential equations cannot.',
    'Solve $\\ln(x) + \\ln(x+1) = \\ln(6)$ and identify any extraneous solutions.',
    'Recognize that $e^{2x} - 3e^x + 2 = 0$ is quadratic in $e^x$ and find both solutions.',
  ],

  semantics: {
    symbols: [
      { symbol: 'b^{f(x)} = b^{g(x)} \\Rightarrow f(x) = g(x)', meaning: 'One-to-one property of exponentials: equal bases mean equal exponents' },
      { symbol: '\\log_b f(x) = \\log_b g(x) \\Rightarrow f(x) = g(x)', meaning: 'One-to-one property of logarithms: equal logs mean equal arguments' },
      { symbol: '\\text{extraneous solution}', meaning: 'An algebraically valid answer that fails the domain check of the original equation (makes a log argument ≤ 0)' },
    ],
    rulesOfThumb: [
      'Exponential equation: isolate the exponential, then take ln (or log) of both sides.',
      'Logarithmic equation: condense to a single log, then exponentiate both sides.',
      'Same base on both sides: use the one-to-one property to set exponents equal directly.',
      'Always check every answer in the original equation — extraneous solutions are common in log equations.',
      'Quadratic in disguise: if you see e^(2x) and e^x, let u = e^x and factor.',
    ],
  },

  spiral: {
    recoveryPoints: [
      { topic: 'Log properties (power rule, condensing)', where: 'Precalc-4, Lesson 3', why: 'The power rule is used in every exponential equation (to bring exponents down), and condensing is used in every log equation with multiple terms.' },
      { topic: 'Cancel identities ln(e^x) = x and e^(ln x) = x', where: 'Precalc-4, Lesson 4', why: 'These cancel identities are the mechanism by which taking ln undoes e^x and vice versa.' },
    ],
    futureLinks: [
      { topic: 'Separable differential equations', where: 'Calc 2: ODEs', why: 'Every separable ODE with exponential solutions requires solving e^(kt) = N — the same technique practiced here.' },
      { topic: 'Implicit differentiation and logarithmic differentiation', where: 'Calc 1: Derivatives', why: 'Logarithmic differentiation involves taking ln of both sides of an equation, then differentiating — the algebraic structure mirrors what you do here.' },
    ],
  },

  assessment: [
    {
      question: 'Solve $7^x = 50$ exactly.',
      answer: 'x = \\frac{\\ln 50}{\\ln 7} \\approx 2.01',
      difficulty: 'quick-fire',
    },
    {
      question: 'Solve $\\ln(x - 2) = 3$ exactly.',
      answer: 'x = e^3 + 2',
      difficulty: 'quick-fire',
    },
    {
      question: 'Solve $e^{2x} - 4e^x + 3 = 0$. State both solutions exactly.',
      answer: 'x = 0 \\text{ and } x = \\ln 3',
      difficulty: 'quick-fire',
    },
  ],

  mentalModel: [
    'Two master moves: take log of both sides (to solve exponential equations), or exponentiate both sides (to solve log equations).',
    'One-to-one property: equal bases → equal exponents; equal logs → equal arguments.',
    'Always isolate the exponential (or condense the logs) before applying the master move.',
    'Extraneous solutions are unique to log equations — always substitute answers back to check.',
    'Quadratic exponential: if you see b^(2x) and b^x together, let u = b^x and factor.',
  ],

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'To solve $3^x = 15$, the first step is:',
      options: ['Square both sides', 'Take ln of both sides', 'Divide both sides by 3', 'Set x = log₁₅(3)'],
      answer: 'Take ln of both sides',
      hints: ['The variable is in the exponent — logarithms are the tool to bring it down.', 'ln(3^x) = ln(15) gives x·ln(3) = ln(15) by the power rule.'],
      reviewSection: 'Intuition tab — master strategy',
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Solve $5^x = 5^{2x - 3}$ using the one-to-one property.',
      options: ['x = 3', 'x = -3', 'x = 3/2', 'x = 1'],
      answer: 'x = 3',
      hints: ['Same base on both sides: set exponents equal directly.', 'x = 2x - 3 → -x = -3 → x = 3.'],
      reviewSection: 'Math tab — solving exponential equations full toolkit',
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Solve $e^x = 9$ exactly.',
      options: ['x = 9/e', 'x = ln(9)', 'x = log(9)', 'x = 9e'],
      answer: 'x = ln(9)',
      hints: ['Take ln of both sides: ln(e^x) = ln(9).', 'Cancel: ln(e^x) = x. So x = ln(9).'],
      reviewSection: 'Examples tab — natural exponential equation',
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'To solve $\\ln(x) = 5$, exponentiate both sides to get:',
      options: ['x = 5e', 'x = e^5', 'x = 5/e', 'x = ln(5)'],
      answer: 'x = e^5',
      hints: ['Raise e to both sides: e^(ln x) = e^5.', 'Cancel: e^(ln x) = x. So x = e^5.'],
      reviewSection: 'Math tab — solving logarithmic equations full toolkit',
    },
    {
      id: 'q5',
      type: 'choice',
      text: 'Why must you check for extraneous solutions in logarithmic equations?',
      options: ['Because logarithms are not one-to-one', 'Because the algebra may produce values that make a log argument non-positive', 'Because ln is not defined for large values', 'Because exponents can be negative'],
      answer: 'Because the algebra may produce values that make a log argument non-positive',
      hints: ['Logarithms are only defined for positive arguments. Algebraic steps like squaring or multiplying can introduce values that violate this.', 'A solution that gives log(negative) or log(0) is extraneous and must be discarded.'],
      reviewSection: 'Intuition tab — extraneous solutions in log equations',
    },
    {
      id: 'q6',
      type: 'choice',
      text: 'Solve $\\log_4(x) + \\log_4(x - 3) = 1$. Which step comes first?',
      options: ['Exponentiate both sides with base 4', 'Use the product rule to condense the left side', 'Take ln of both sides', 'Set x + (x-3) = 4'],
      answer: 'Use the product rule to condense the left side',
      hints: ['Before exponentiating, you must get a single log on one side. The product rule condenses two logs into one.', 'log_4(x) + log_4(x-3) = log_4(x(x-3)). Then exponentiate.'],
      reviewSection: 'Math tab — solving logarithmic equations full toolkit',
    },
    {
      id: 'q7',
      type: 'choice',
      text: 'Solve $2e^{x+1} = 14$ exactly.',
      options: ['x = ln(7) - 1', 'x = ln(14) - 1', 'x = ln(7) + 1', 'x = (ln 14)/2'],
      answer: 'x = ln(7) - 1',
      hints: ['First isolate e^(x+1) by dividing both sides by 2: e^(x+1) = 7.', 'Take ln: x + 1 = ln(7). Subtract 1: x = ln(7) - 1.'],
      reviewSection: 'Examples tab — natural exponential equation',
    },
    {
      id: 'q8',
      type: 'choice',
      text: 'The equation $e^{2x} - 6e^x + 8 = 0$ has solutions:',
      options: ['x = ln(2) only', 'x = ln(4) only', 'x = ln(2) and x = ln(4)', 'No real solutions'],
      answer: 'x = ln(2) and x = ln(4)',
      hints: ['Let u = e^x. The equation becomes u² - 6u + 8 = (u-2)(u-4) = 0.', 'u = 2 → x = ln(2); u = 4 → x = ln(4). Both are valid since e^x > 0.'],
      reviewSection: 'Math tab — quadratic type exponential equations',
    },
    {
      id: 'q9',
      type: 'choice',
      text: 'Solve $\\log_2(x+3) + \\log_2(x-3) = 4$ and state the valid solution.',
      options: ['x = 5 and x = -5', 'x = 5 only', 'x = -5 only', 'No solution'],
      answer: 'x = 5 only',
      hints: ['Condense: log₂((x+3)(x-3)) = 4, so (x+3)(x-3) = 2⁴ = 16.', 'Solve x²-9 = 16 → x = ±5. Check: x = -5 gives log₂(-2), which is undefined. Reject.'],
      reviewSection: 'Examples tab — log equation with extraneous solution',
    },
    {
      id: 'q10',
      type: 'choice',
      text: 'Solve $5^{x+2} = 3^{2x-1}$ — which describes the correct approach?',
      options: ['Set x+2 = 2x-1 directly', 'Take ln of both sides and use the power rule, then solve for x', 'Take log base 5 of both sides only', 'Set 5 = 3 and solve'],
      answer: 'Take ln of both sides and use the power rule, then solve for x',
      hints: ['The bases (5 and 3) are different, so the one-to-one property does not apply directly.', 'Taking ln converts both sides: (x+2)ln5 = (2x-1)ln3. This is linear in x — collect x terms, factor, divide.'],
      reviewSection: 'Examples tab — different bases',
    },
  ],
}
