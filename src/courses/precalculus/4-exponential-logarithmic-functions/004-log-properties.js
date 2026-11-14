export default {
  id: 'precalc4-004',
  slug: 'log-properties',
  chapter: 'precalc-4',
  order: 4,
  title: 'Properties of Logarithms: Why Every Rule Follows from the Exponent Laws',
  subtitle: 'Log properties are not arbitrary rules to memorise — each one is just an exponent law in disguise',
  tags: ['log properties', 'product rule', 'quotient rule', 'power rule', 'change of base', 'expand logarithms', 'condense logarithms', 'logarithm rules'],
  aliases: 'log properties product quotient power rule change of base formula expand condense logarithms combine simplify',

  hook: {
    question: 'Why does $\\log(AB) = \\log A + \\log B$? This looks like a miracle until you remember that logarithms are exponents — and when you multiply powers of the same base, you add exponents. Every log property is that observation, dressed up in log notation.',
    realWorldContext: 'Log properties are why slide rules worked: multiplying two numbers was done by adding their logarithms, then reading off the antilog. Before electronic calculators, this was how engineers, navigators, and scientists performed complex multiplication in seconds. Today, log properties are used to linearise multiplicative models — taking the log of a power law $y = ax^b$ gives $\\ln y = \\ln a + b\\ln x$, a linear relationship that is easy to fit to data.',
    previewVisualizationId: 'LogPropertiesViz',
  },

  intuition: {
    prose: [
      '**Where you are in the story:** You have met exponential functions and their inverses, the logarithms. Now the question is: how do you actually work with logarithms in practice? The answer is a set of three rules that reduce any complicated log expression to a sum of simple ones — and every rule is just an exponent law translated into log language.',
      'Every log property comes from the corresponding exponent law. The product rule $\\log_b(MN) = \\log_b M + \\log_b N$ mirrors $b^m \\cdot b^n = b^{m+n}$. The quotient rule $\\log_b(M/N) = \\log_b M - \\log_b N$ mirrors $b^m / b^n = b^{m-n}$. The power rule $\\log_b(M^p) = p\\log_b M$ mirrors $(b^m)^p = b^{mp}$. Once you see this connection, the properties are not rules to memorise — they are consequences of something you already know.',
      'Expanding a logarithm means breaking it into a sum/difference of simpler logs using these properties. Condensing means running the properties in reverse to combine multiple logs into a single log. Both operations are the same rules — just different directions.',
      'The change of base formula $\\log_b x = \\frac{\\ln x}{\\ln b} = \\frac{\\log x}{\\log b}$ lets you compute any logarithm using only the ln or log button on a calculator. It also reveals a beautiful fact: all logarithm functions of the same shape are just vertical scalings of each other. $\\log_b x = \\frac{1}{\\ln b} \\cdot \\ln x$ — they are all multiples of $\\ln x$.',
      '**Where this is heading:** Log properties are the engine that makes solving exponential and logarithmic equations tractable. In the next two lessons you will use these rules constantly — especially the power rule (to bring exponents down) and the product/quotient rules (to condense multiple log terms before exponentiating). Later, in calculus, these same properties enable logarithmic differentiation.',
    ],
    callouts: [
      { type: 'sequencing', title: 'Precalc-4 arc — Lesson 3 of 6', body: '← Logarithms: The Inverse | **Properties of Logarithms** | The Natural Base e and ln →' },
      {
        type: 'theorem',
        title: 'The three log properties — and their exponent law twins',
        body: '\\log_b(MN) = \\log_b M + \\log_b N \\quad [b^m \\cdot b^n = b^{m+n}] \\\\ \\log_b\\frac{M}{N} = \\log_b M - \\log_b N \\quad [b^m / b^n = b^{m-n}] \\\\ \\log_b(M^p) = p\\,\\log_b M \\quad [(b^m)^p = b^{mp}]',
      },
      {
        type: 'theorem',
        title: 'Change of base formula',
        body: '\\log_b x = \\frac{\\log x}{\\log b} = \\frac{\\ln x}{\\ln b} \\\\ \\text{Works with any consistent base in numerator and denominator.} \\\\ \\text{Example: } \\log_5 17 = \\frac{\\ln 17}{\\ln 5} = \\frac{2.833}{1.609} \\approx 1.760',
      },
      {
        type: 'warning',
        title: 'The two most common log errors',
        body: '\\log_b(M + N) \\neq \\log_b M + \\log_b N \\quad \\text{(no sum rule!)} \\\\ \\frac{\\log_b M}{\\log_b N} \\neq \\log_b M - \\log_b N \\quad \\text{(quotient rule requires } \\log_b \\frac{M}{N}\\text{)} \\\\ \\text{These errors are extremely common — check every step.}',
      },
      {
        type: 'insight',
        title: 'Why all logs are proportional to each other',
        body: '\\log_b x = \\frac{\\ln x}{\\ln b} = \\underbrace{\\frac{1}{\\ln b}}_{\\text{constant}} \\cdot \\ln x \\\\ \\text{Every log function is just } \\ln x \\text{ scaled by a constant.} \\\\ \\text{Larger base } b \\Rightarrow \\text{smaller constant } \\frac{1}{\\ln b} \\Rightarrow \\text{slower growth.}',
      },
    ],
    visualizations: [
      {
        id: 'LogPropertiesViz',
        title: 'Log Properties as Area Decomposition',
        mathBridge: 'Step 1: Set $M = 3$ and $N = 4$ using the sliders, and observe the shaded area under $y = 1/t$ from $t = 1$ to $t = 12$ (which equals $\\ln 12$). Step 2: Toggle the split view to see the area divided at $t = M = 3$: the left piece is $\\ln 3$ and the right piece is $\\ln 4$. Together they equal $\\ln 12$, confirming $\\ln(3 \\cdot 4) = \\ln 3 + \\ln 4$. Step 3: Try different values of $M$ and $N$ and verify the areas always add correctly. The key lesson: the log product rule is literally about areas adding under a curve — it is not a coincidence or a rule to memorise, but a geometric truth.',
        caption: 'This is why the log product rule is true: areas add under integration, and ln is defined as an area.',
      },
    ],
  },

  math: {
    prose: [
      'Expanding logs fully means applying all three properties until no log contains a product, quotient, or power. The order is: (1) log of quotient → subtraction, (2) log of product → addition, (3) log of power → bring exponent out front. Always handle quotients before products to avoid sign errors.',
      'Condensing logs means reversing: (1) coefficients become exponents using the power rule, (2) sums become products using the product rule, (3) differences become quotients using the quotient rule. The goal is always a single logarithm.',
      'The change of base formula is most useful for computing numerical values and for calculus. In calculus, $\\log_b x = \\frac{\\ln x}{\\ln b}$ means $\\frac{d}{dx}\\log_b x = \\frac{1}{x\\ln b}$ — the derivative of any log is just $1/(x\\ln b)$, reducing to $1/x$ when $b = e$. This is why natural logs dominate in calculus.',
    ],
    callouts: [
      {
        type: 'proof-map',
        title: 'Expanding a logarithm — step by step',
        body: '\\log_b\\frac{x^3\\sqrt{y}}{z^2}: \\\\ 1.\\; = \\log_b(x^3\\sqrt{y}) - \\log_b z^2 \\quad\\text{(quotient)} \\\\ 2.\\; = \\log_b x^3 + \\log_b y^{1/2} - \\log_b z^2 \\quad\\text{(product)} \\\\ 3.\\; = 3\\log_b x + \\tfrac{1}{2}\\log_b y - 2\\log_b z \\quad\\text{(power)}',
      },
      {
        type: 'proof-map',
        title: 'Condensing logarithms — step by step',
        body: '3\\ln x + \\tfrac{1}{2}\\ln y - 2\\ln z: \\\\ 1.\\; = \\ln x^3 + \\ln y^{1/2} - \\ln z^2 \\quad\\text{(power rule reversal)} \\\\ 2.\\; = \\ln(x^3 y^{1/2}) - \\ln z^2 \\quad\\text{(product rule reversal)} \\\\ 3.\\; = \\ln\\frac{x^3\\sqrt{y}}{z^2} \\quad\\text{(quotient rule reversal)}',
      },
    ],
  },

  rigor: {
    title: 'Proving the product rule: $\\log_b(MN) = \\log_b M + \\log_b N$',
    visualizationId: 'LogPropertiesViz',
    proofSteps: [
      {
        expression: '\\text{Let } \\log_b M = p \\text{ and } \\log_b N = q.',
        annotation: 'Name the two log values. By definition, $b^p = M$ and $b^q = N$.',
      },
      {
        expression: 'MN = b^p \\cdot b^q = b^{p+q}',
        annotation: 'Multiply using the exponential form. Exponent law: same base, add exponents.',
      },
      {
        expression: '\\log_b(MN) = \\log_b(b^{p+q}) = p + q',
        annotation: 'Take $\\log_b$ of both sides. Cancellation identity: $\\log_b(b^{p+q}) = p+q$.',
      },
      {
        expression: '\\therefore \\log_b(MN) = p + q = \\log_b M + \\log_b N \\qquad \\blacksquare',
        annotation: 'Substitute back. The quotient rule and power rule follow by the same argument with $b^{p-q}$ and $b^{mp}$ respectively.',
      },
    ],
  },

  examples: [
    {
      id: 'ch4-003-ex1',
      title: 'Expanding fully',
      problem: '\\text{Expand completely: } \\log_4\\frac{\\sqrt{x}\\,y^3}{16z}',
      steps: [
        {
          expression: '= \\log_4(\\sqrt{x}\\,y^3) - \\log_4(16z)',
          annotation: 'Quotient rule first.',
          hint: 'The fraction inside the log becomes a subtraction: log(numerator) - log(denominator).',
        },
        {
          expression: '= \\log_4 x^{1/2} + \\log_4 y^3 - \\log_4 16 - \\log_4 z',
          annotation: 'Product rule on both parts.',
          hint: 'Apply the product rule to both the numerator part and the denominator part, distributing the minus sign to all denominator terms.',
        },
        {
          expression: '= \\frac{1}{2}\\log_4 x + 3\\log_4 y - 2 - \\log_4 z',
          annotation: 'Power rule, and $\\log_4 16 = \\log_4 4^2 = 2$.',
          hint: 'Use the power rule to bring each exponent (1/2, 3, 2) out front as a coefficient. Also evaluate log₄(16) = 2 exactly since 4² = 16.',
        },
      ],
      conclusion: 'Always simplify any logs that evaluate to integers — $\\log_4 16 = 2$ is exact and should not be left as a log.',
    },
    {
      id: 'ch4-003-ex2',
      title: 'Condensing to a single logarithm',
      problem: '2\\log x - \\frac{1}{3}\\log y + \\log z^2',
      steps: [
        {
          expression: '= \\log x^2 - \\log y^{1/3} + \\log z^2',
          annotation: 'Power rule: bring coefficients up as exponents.',
          hint: 'Each coefficient becomes an exponent: 2 becomes x², 1/3 becomes y^(1/3), and z² is already a power.',
        },
        {
          expression: '= \\log\\frac{x^2 z^2}{y^{1/3}}',
          annotation: 'Positive terms → numerator (product rule), negative terms → denominator (quotient rule).',
          hint: 'Combine: positive log terms multiply in the numerator, negative log terms divide in the denominator.',
        },
        {
          expression: '= \\log\\frac{x^2 z^2}{\\sqrt[3]{y}}',
          annotation: 'Write the fractional exponent as a radical for clean final form.',
          hint: 'y^(1/3) = ∛y by the definition of rational exponents. This is the standard clean form.',
        },
      ],
      conclusion: 'The sign in front of each log term determines numerator (positive) or denominator (negative) placement.',
    },
    {
      id: 'ch4-003-ex3',
      title: 'Change of base',
      problem: '\\text{Evaluate } \\log_7 200 \\text{ to 4 decimal places.}',
      steps: [
        {
          expression: '\\log_7 200 = \\frac{\\ln 200}{\\ln 7} = \\frac{5.2983}{1.9459} \\approx 2.7228',
          annotation: 'Change of base with natural log. Could equally use $\\log/\\log$.',
          hint: 'Apply the change of base formula: log_b(x) = ln(x)/ln(b). Compute both natural logs on your calculator.',
        },
        {
          expression: '\\text{Check: } 7^{2.7228} \\approx 200 \\checkmark',
          annotation: 'Verify by computing the exponential.',
          hint: 'Always verify: raise the base (7) to your answer (2.7228) and check it equals the original argument (200).',
        },
      ],
      conclusion: 'Change of base is the only way to compute logs of non-standard bases on a calculator. Always verify by checking $b^{\\text{answer}} \\approx x$.',
    },
  ],

  challenges: [
    {
      id: 'ch4-003-ch1',
      difficulty: 'medium',
      problem: '\\text{If } \\log_b 2 = 0.3869 \\text{ and } \\log_b 3 = 0.6131, \\text{ find } \\log_b 72 \\text{ without a calculator.}',
      hint: 'Factor 72 into powers of 2 and 3. Use log properties.',
      walkthrough: [
        {
          expression: '72 = 8 \\cdot 9 = 2^3 \\cdot 3^2',
          annotation: 'Factor 72.',
        },
        {
          expression: '\\log_b 72 = \\log_b(2^3 \\cdot 3^2) = 3\\log_b 2 + 2\\log_b 3',
          annotation: 'Product and power rules.',
        },
        {
          expression: '= 3(0.3869) + 2(0.6131) = 1.1607 + 1.2262 = 2.3869',
          annotation: 'Substitute known values.',
        },
      ],
      answer: '\\log_b 72 \\approx 2.3869',
    },
    {
      id: 'ch4-003-ch2',
      difficulty: 'hard',
      problem: '\\text{Prove the change of base formula: } \\log_b x = \\frac{\\log_a x}{\\log_a b}.',
      hint: 'Let $y = \\log_b x$, convert to exponential form, then take $\\log_a$ of both sides.',
      walkthrough: [
        {
          expression: 'y = \\log_b x \\iff b^y = x',
          annotation: 'Convert to exponential form.',
        },
        {
          expression: '\\log_a(b^y) = \\log_a x \\Rightarrow y\\log_a b = \\log_a x',
          annotation: 'Take $\\log_a$ of both sides. Power rule on the left.',
        },
        {
          expression: 'y = \\frac{\\log_a x}{\\log_a b} \\Rightarrow \\log_b x = \\frac{\\log_a x}{\\log_a b} \\qquad \\blacksquare',
          annotation: 'Solve for $y$. Works for any base $a > 0$, $a \\neq 1$.',
        },
      ],
      answer: '\\log_b x = \\frac{\\log_a x}{\\log_a b}',
    },
  ],

  calcBridge: {
    teaser: 'Log properties are the engine behind logarithmic differentiation in calculus. To differentiate $y = x^x$, take $\\ln$ of both sides: $\\ln y = x\\ln x$. Now differentiate implicitly using the product rule, then solve for $y\'$. Without log properties, functions like $y = \\frac{x^3(x+1)^4}{\\sqrt{x^2+1}}$ would require the product and quotient rules repeatedly. With log differentiation, one application of the properties turns it into a sum of simple derivatives.',
    linkedLessons: ['logarithms-intro', 'solving-exponential-log'],
  },

  crossRefs: [
    { slug: 'logarithms-intro', reason: 'Log properties follow directly from the inverse relationship between logs and exponentials established in the previous lesson.' },
    { slug: 'natural-base-e-and-ln', reason: 'All three properties apply to ln just as to any other base — the natural log is where they appear most in practice.' },
    { slug: 'solving-exponential-log', reason: 'The power rule (bringing exponents down) and condensing (joining multiple logs before exponentiating) are the two most-used skills in equation solving.' },
  ],

  checkpoints: [
    'State the product, quotient, and power rules for logarithms and identify the corresponding exponent law for each.',
    'Expand $\\log\\frac{a^2 b}{c^3}$ completely using the three log properties.',
    'Condense $4\\ln x - \\frac{1}{2}\\ln y + 3\\ln z$ into a single logarithm.',
    'What is $\\log_9 81$ and how does the power rule help you evaluate it?',
    'Use the change of base formula to evaluate $\\log_6 200$ to two decimal places.',
  ],

  semantics: {
    symbols: [
      { symbol: '\\log_b(MN) = \\log_b M + \\log_b N', meaning: 'Product rule: log of a product = sum of logs (mirrors b^m · b^n = b^(m+n))' },
      { symbol: '\\log_b(M/N) = \\log_b M - \\log_b N', meaning: 'Quotient rule: log of a quotient = difference of logs (mirrors b^m/b^n = b^(m-n))' },
      { symbol: '\\log_b(M^p) = p \\log_b M', meaning: 'Power rule: log of a power = exponent × log (mirrors (b^m)^p = b^(mp))' },
      { symbol: '\\log_b x = \\frac{\\ln x}{\\ln b}', meaning: 'Change of base: converts any log to natural log for calculator use' },
    ],
    rulesOfThumb: [
      'Expanding order: quotient → product → power (outside in).',
      'Condensing order: power → product → quotient (reverse).',
      'Positive log terms go in the numerator; negative log terms go in the denominator.',
      'log(A + B) ≠ log(A) + log(B) — there is no log sum rule.',
      'Every log function is just ln(x) scaled by 1/ln(b) — change of base makes this explicit.',
    ],
  },

  spiral: {
    recoveryPoints: [
      { topic: 'Exponent laws', where: 'Algebra review', why: 'Every log property is an exponent law in disguise — review am·an = am+n, am/an = am-n, (am)n = amn.' },
      { topic: 'Logarithm definition', where: 'Precalc-4, Lesson 2', why: 'The product rule proof starts from "let log_b(M) = p, so b^p = M" — you need the conversion between forms.' },
    ],
    futureLinks: [
      { topic: 'Logarithmic differentiation', where: 'Calc 1: Derivatives', why: 'To differentiate y = x^x or complicated products/quotients, take ln of both sides, expand with log properties, then differentiate.' },
      { topic: 'Integration techniques involving ln', where: 'Calc 1: Integration', why: '∫f\'(x)/f(x) dx = ln|f(x)| + C. The ability to recognize log structure in an integrand depends on knowing log properties.' },
    ],
  },

  assessment: [
    {
      question: 'Expand $\\ln(x^3 y^2)$ completely.',
      answer: '3\\ln x + 2\\ln y',
      difficulty: 'quick-fire',
    },
    {
      question: 'Condense $\\log 5 + 3\\log x$ into a single logarithm.',
      answer: '\\log(5x^3)',
      difficulty: 'quick-fire',
    },
    {
      question: 'Use change of base to evaluate $\\log_3 50$ to 3 decimal places.',
      answer: '\\approx 3.561',
      difficulty: 'quick-fire',
    },
  ],

  mentalModel: [
    'Every log rule is an exponent law in disguise — log just translates exponential multiplication into addition.',
    'Product inside the log = sum outside; quotient inside = difference outside; power inside = coefficient outside.',
    'Expanding: work from the outside structure inward (fraction → products → exponents).',
    'Condensing: work from the inside outward (coefficients become exponents, then combine).',
    'All logs are scaled versions of ln — change of base is just dividing by ln(b) to rescale.',
  ],

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which expression equals $\\log_b(MN)$?',
      options: ['log_b(M) · log_b(N)', 'log_b(M) + log_b(N)', 'log_b(M) - log_b(N)', 'log_b(M) / log_b(N)'],
      answer: 'log_b(M) + log_b(N)',
      hints: ['Product inside the log corresponds to addition outside.', 'This mirrors the exponent law b^m · b^n = b^(m+n).'],
      reviewSection: 'Intuition tab — three log properties',
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Expand $\\log_3(x^5)$.',
      options: ['5 · log_3(x)', 'log_3(5x)', 'log_3(x) + 5', '5 + log_3(x)'],
      answer: '5 · log_3(x)',
      hints: ['Power rule: log_b(M^p) = p · log_b(M).', 'The exponent 5 moves to become a coefficient in front of the log.'],
      reviewSection: 'Intuition tab — three log properties',
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of the following is a common error?',
      options: ['log_b(MN) = log_b(M) + log_b(N)', 'log_b(M/N) = log_b(M) - log_b(N)', 'log_b(M+N) = log_b(M) + log_b(N)', 'log_b(M^p) = p · log_b(M)'],
      answer: 'log_b(M+N) = log_b(M) + log_b(N)',
      hints: ['There is no "addition rule" for logarithms — only the product, quotient, and power rules exist.', 'log(A+B) cannot be simplified using any log property.'],
      reviewSection: 'Intuition tab — the two most common log errors',
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Expand $\\log_2\\frac{a}{b^3}$ completely.',
      options: ['log₂(a) + 3log₂(b)', 'log₂(a) - 3log₂(b)', '3log₂(a) - log₂(b)', 'log₂(a) · 3log₂(b)'],
      answer: 'log₂(a) - 3log₂(b)',
      hints: ['First use the quotient rule: log(a/b^3) = log(a) - log(b^3).', 'Then use the power rule: log(b^3) = 3·log(b).'],
      reviewSection: 'Math tab — expanding a logarithm step by step',
    },
    {
      id: 'q5',
      type: 'choice',
      text: 'Condense $2\\ln x + \\ln y$ into a single logarithm.',
      options: ['ln(2xy)', 'ln(x²y)', 'ln(x² + y)', '2ln(xy)'],
      answer: 'ln(x²y)',
      hints: ['First apply the power rule in reverse: 2·ln(x) = ln(x²).', 'Then apply the product rule: ln(x²) + ln(y) = ln(x²y).'],
      reviewSection: 'Math tab — condensing logarithms step by step',
    },
    {
      id: 'q6',
      type: 'choice',
      text: 'Use the change of base formula to express $\\log_5 17$ in terms of natural logs.',
      options: ['ln(5)/ln(17)', 'ln(17)/ln(5)', 'ln(17-5)', 'ln(17) · ln(5)'],
      answer: 'ln(17)/ln(5)',
      hints: ['Change of base: log_b(x) = ln(x)/ln(b).', 'Here b = 5 and x = 17, so log_5(17) = ln(17)/ln(5).'],
      reviewSection: 'Intuition tab — change of base formula',
    },
    {
      id: 'q7',
      type: 'choice',
      text: 'If $\\log_b 2 = 0.4$ and $\\log_b 5 = 0.8$, what is $\\log_b 10$?',
      options: ['1.2', '0.32', '2.0', '0.8'],
      answer: '1.2',
      hints: ['10 = 2 × 5, so log_b(10) = log_b(2) + log_b(5) by the product rule.', '0.4 + 0.8 = 1.2.'],
      reviewSection: 'Intuition tab — three log properties',
    },
    {
      id: 'q8',
      type: 'choice',
      text: 'Expand $\\ln\\sqrt{x}$ completely.',
      options: ['2ln(x)', '(1/2)ln(x)', 'ln(x) - 1/2', 'ln(x/2)'],
      answer: '(1/2)ln(x)',
      hints: ['Rewrite √x as x^(1/2).', 'Apply the power rule: ln(x^(1/2)) = (1/2)·ln(x).'],
      reviewSection: 'Intuition tab — three log properties',
    },
    {
      id: 'q9',
      type: 'choice',
      text: 'Which condensed form equals $3\\log x - \\log y$?',
      options: ['log(3x/y)', 'log(x³/y)', 'log(x³ - y)', 'log(3x - y)'],
      answer: 'log(x³/y)',
      hints: ['First use the power rule: 3·log(x) = log(x³).', 'Then the quotient rule: log(x³) - log(y) = log(x³/y).'],
      reviewSection: 'Math tab — condensing logarithms step by step',
    },
    {
      id: 'q10',
      type: 'choice',
      text: 'What is true about the relationship between $\\log_b x$ and $\\ln x$ for any base $b > 1$?',
      options: ['They are equal for all x', 'log_b(x) = ln(x) + ln(b)', 'log_b(x) = ln(x)/ln(b)', 'log_b(x) = ln(x) · ln(b)'],
      answer: 'log_b(x) = ln(x)/ln(b)',
      hints: ['This is the change of base formula with a = e.', 'Every logarithm is a scaled version of the natural log.'],
      reviewSection: 'Intuition tab — why all logs are proportional to each other',
    },
  ],
}
