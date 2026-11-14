export default {
  id: 'precalc4-003',
  slug: 'logarithms-intro',
  chapter: 'precalc-4',
  order: 3,
  title: 'Logarithms: The Inverse of the Exponential',
  subtitle: 'A logarithm answers one question: "what exponent did we use?" — understanding this makes every log property obvious',
  tags: ['logarithm', 'log', 'natural log', 'ln', 'common log', 'log base', 'graphing logarithms', 'inverse function', 'domain', 'transformations', 'logarithm definition'],
  aliases: 'logarithm log base natural log ln common log base 10 graph domain range transformations inverse exponential',

  hook: {
    question: 'If $2^x = 8$, you can see by inspection that $x = 3$. But if $2^x = 10$, what is $x$? There is no clean answer — yet the question is completely well-posed. Logarithms were invented precisely to answer it: $x = \\log_2 10 \\approx 3.32$.',
    realWorldContext: 'Logarithms compress enormous ranges into manageable numbers. The Richter scale for earthquakes, decibels for sound, pH for acidity, and stellar magnitude for brightness — all use logarithmic scales because the underlying phenomena span factors of millions. A magnitude-7 earthquake releases roughly 32 times the energy of a magnitude-6 earthquake. Logarithms make these relationships linear and intuitive. In CS, $\\log_2 n$ appears in binary search, merge sort, and tree height — anywhere you repeatedly halve a problem.',
    previewVisualizationId: 'LogGraphViz',
  },

  intuition: {
    prose: [
      '**Where you are in the story:** In the previous lesson you met exponential functions $f(x) = b^x$ and saw how they model explosive growth and decay. But those models all contain an unknown in the exponent — and you cannot solve for an exponent using algebra alone. Logarithms are the inverse operation invented for exactly that purpose.',
      'The logarithm is defined as the inverse of the exponential. $\\log_b x = y$ means exactly the same thing as $b^y = x$. Reading it: "the logarithm base $b$ of $x$ is $y$" — meaning "$b$ raised to the power $y$ gives $x$." The logarithm asks: what exponent do we need?',
      'Because it is the inverse of $b^x$, the graph of $y = \\log_b x$ is the reflection of $y = b^x$ over the line $y = x$. Everything flips: the horizontal asymptote $y = 0$ of the exponential becomes a vertical asymptote $x = 0$ of the logarithm. The $y$-intercept $(0, 1)$ of the exponential becomes the $x$-intercept $(1, 0)$ of the logarithm. The domain of the exponential ($-\\infty, \\infty$) becomes the range of the logarithm — and vice versa.',
      'The domain of $\\log_b x$ is $(0, \\infty)$ — you can only take the log of a positive number. This is not arbitrary: $b^y$ is always positive for any $b > 0$, so the output of the exponential (which becomes the input of the logarithm) is always positive. $\\log_b 0$ and $\\log_b(-5)$ are undefined over the reals.',
      '**Where this is heading:** Once you understand the log as an inverse, the log properties in the next lesson become obvious — they are just exponent laws translated into log notation. And in the lesson after that, the natural log $\\ln$ emerges as the special case that makes all of calculus clean.',
    ],
    callouts: [
      { type: 'sequencing', title: 'Precalc-4 arc — Lesson 2 of 6', body: '← Exponential Functions | **Logarithms: The Inverse** | Properties of Logarithms →' },
      {
        type: 'definition',
        title: 'The logarithm — two equivalent forms',
        body: '\\log_b x = y \\iff b^y = x \\\\ \\text{Conditions: } b > 0, \\; b \\neq 1, \\; x > 0 \\\\ \\text{Read: "log base } b \\text{ of } x \\text{ equals } y"',
      },
      {
        type: 'definition',
        title: 'Special bases you must know',
        body: '\\log x = \\log_{10} x \\quad \\text{(common log — base 10, calculator "log")} \\\\ \\ln x = \\log_e x \\quad \\text{(natural log — base } e \\approx 2.718\\text{, calculator "ln")} \\\\ \\log_2 x \\quad \\text{(binary log — ubiquitous in CS and information theory)}',
      },
      {
        type: 'insight',
        title: 'The inverse relationship — domain and range swap',
        body: 'y = b^x: \\; \\text{domain } (-\\infty,\\infty), \\; \\text{range } (0,\\infty), \\; \\text{passes through } (0,1) \\\\ y = \\log_b x: \\; \\text{domain } (0,\\infty), \\; \\text{range } (-\\infty,\\infty), \\; \\text{passes through } (1,0) \\\\ \\text{Reflection: swap every } (x,y) \\text{ pair.}',
      },
      {
        type: 'theorem',
        title: 'Key log values to know cold',
        body: '\\log_b 1 = 0 \\quad \\text{(because } b^0=1\\text{)} \\\\ \\log_b b = 1 \\quad \\text{(because } b^1=b\\text{)} \\\\ \\log_b b^x = x \\quad \\text{(inverse cancels)} \\\\ b^{\\log_b x} = x \\quad \\text{(inverse cancels the other way)}',
      },
    ],
    visualizations: [
      {
        id: 'LogGraphViz',
        title: 'Logarithm as Inverse — Reflection Over y = x',
        mathBridge: 'Step 1: Toggle both curves on — $y = b^x$ and $y = \\log_b x$ — and notice they are perfect mirror images across the line $y = x$. Every point $(a, b)$ on the exponential corresponds to $(b, a)$ on the logarithm. Step 2: Click on a point on the exponential and watch its reflected partner appear on the log curve. Step 3: Drag the base slider from $b = 2$ down toward $b = 0.5$ and observe how the growth exponential and growth log both transform into their decay counterparts simultaneously. The key lesson: domain and range literally swap — the horizontal asymptote of the exponential becomes the vertical asymptote of the log.',
        caption: 'Every feature of the log graph is a mirror image of the exponential — once you see this, you never need to memorise log properties separately.',
      },
      {
        id: 'LogExpReciprocalViz',
        title: 'Exponential and Log as Inverse Partners',
        mathBridge: 'Step 1: Pick a point on $y = e^x$, say $(1, e)$. Step 2: Reflect across $y = x$ to find the paired point $(e, 1)$ on $y = \\ln x$. Step 3: Verify: $e^1 = e$ and $\\ln(e) = 1$ — the input and output have swapped. The key lesson: before you ever meet derivatives, this geometric pairing tells you why $\\ln(e^x) = x$ and $e^{\\ln x} = x$ — those cancel identities are just the picture of inverse reflection stated algebraically.',
        caption: 'Track mirrored points across y=x to reinforce why logs answer "what exponent?"',
      },
    ],
  },

  math: {
    prose: [
      'Transformations of $y = \\log_b x$ follow the same master template as all functions. The general form is $f(x) = a\\log_b(x - h) + k$, where $a$ is a vertical stretch/reflection, $h$ is a horizontal shift that also moves the vertical asymptote from $x=0$ to $x=h$, and $k$ is a vertical shift.',
      'The critical domain check: for $\\log_b(x - h)$ to be defined, we need $x - h > 0$, meaning $x > h$. For $\\log_b(2x + 3)$, set $2x + 3 > 0$, giving $x > -3/2$. Always find the domain before anything else. The vertical asymptote is at the boundary of the domain.',
      'The natural logarithm $\\ln x$ and common logarithm $\\log x$ have the same shape — just different scales on the $y$-axis. Since $e \\approx 2.718$, the natural log grows slightly slower than $\\log_3 x$ but faster than $\\log_{10} x$. All logarithm graphs with base $b > 1$ have the same shape: increasing, concave down, passing through $(1,0)$, with a vertical asymptote at $x = 0$.',
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'General log transformation: $f(x) = a\\log_b(x-h)+k$',
        body: 'a: \\text{vertical stretch; reflection over x-axis if } a < 0 \\\\ h: \\text{horizontal shift; vertical asymptote moves to } x = h \\\\ k: \\text{vertical shift} \\\\ \\text{Domain: } (h, \\infty) \\text{ if } a > 0, \\text{ same if } a < 0 \\\\ \\text{Key point: } (h+1, k) \\text{ — because } \\log_b(1) = 0',
      },
      {
        type: 'warning',
        title: 'Domain is the first thing to check',
        body: '\\log_b(\\text{expression}) \\Rightarrow \\text{set expression} > 0 \\text{ and solve.} \\\\ \\ln(x^2 - 4): \\; x^2 - 4 > 0 \\Rightarrow x < -2 \\text{ or } x > 2 \\\\ \\text{Never skip this — logs of negative numbers are undefined over } \\mathbb{R}.',
      },
      {
        type: 'insight',
        title: 'Comparing log bases — faster vs slower growth',
        body: 'b_1 > b_2 > 1 \\Rightarrow \\log_{b_1} x < \\log_{b_2} x \\text{ for } x > 1 \\\\ \\text{Larger base} = \\text{slower growth} \\\\ \\log_{10} 100 = 2 < \\log_2 100 \\approx 6.64 \\\\ \\text{Binary log grows fastest; common log grows slowest.}',
      },
    ],
    visualizations: [
      {
        id: 'LogGraphViz',
        title: 'Log Transformations — All Four Parameters Live',
        mathBridge: 'Step 1: Start with $f(x) = \\log_b x$ (all parameters at default). Increase $h$ and watch the curve slide right, dragging the vertical asymptote with it — the domain shifts to $(h, \\infty)$. Step 2: Set $k$ to a positive value and notice the curve lifts up without changing the asymptote location. Step 3: Set $a < 0$ and see the curve reflect over the horizontal, now falling instead of rising. The key lesson: the vertical asymptote is glued to the domain boundary, and every transformation has a predictable geometric effect.',
        caption: 'The domain is always everything to the right of the vertical asymptote (or left, if $a < 0$ causes reflection issues).',
      },
      {
        id: 'LogExpReciprocalViz',
        title: 'Why Inverse Reflection Matters for Calculus Later',
        mathBridge: 'Step 1: Observe that the tangent slope of $e^x$ at a point $(a, e^a)$ is $e^a$ (the derivative equals the function). Step 2: The reflected point on $\\ln x$ is $(e^a, a)$, and the tangent slope there is $1/e^a$ — the reciprocal. Step 3: This reciprocal-slope relationship is the geometric reason why $\\frac{d}{dx}\\ln x = 1/x$. The key lesson: inverse graphs reflect across $y=x$, and that reflection later turns into reciprocal tangent slopes in calculus.',
        caption: 'Use this now for inverse-graph intuition; revisit in derivatives for slope reciprocity.',
      },
    ],
  },

  rigor: {
    title: 'Proving $\\log_b(b^x) = x$ and $b^{\\log_b x} = x$ — the cancellation identities',
    visualizationId: 'LogGraphViz',
    proofSteps: [
      {
        expression: '\\text{Let } f(x) = b^x \\text{ and } g(x) = \\log_b x.',
        annotation: 'We want to show $f$ and $g$ are true inverses — each undoes the other.',
      },
      {
        expression: 'g(f(x)) = \\log_b(b^x)',
        annotation: 'Apply $g$ after $f$.',
      },
      {
        expression: '= x \\quad \\text{by definition: } \\log_b(b^x) = y \\text{ where } b^y = b^x, \\text{ so } y = x.',
        annotation: 'The log asks "what exponent gives $b^x$?" The answer is $x$.',
      },
      {
        expression: 'f(g(x)) = b^{\\log_b x}',
        annotation: 'Apply $f$ after $g$.',
      },
      {
        expression: '\\text{Let } y = \\log_b x, \\text{ so } b^y = x. \\text{ Then } b^{\\log_b x} = b^y = x. \\qquad \\blacksquare',
        annotation: 'Substituting the definition of log directly gives the result. Both cancellation identities follow from the definition alone.',
      },
    ],
  },

  examples: [
    {
      id: 'ch4-002-ex1',
      title: 'Converting between log and exponential form',
      problem: '\\text{Convert: (a) } \\log_5 125 = 3 \\text{ to exponential. (b) } 4^{-2} = \\frac{1}{16} \\text{ to log.}',
      steps: [
        {
          expression: '(a)\\; \\log_5 125 = 3 \\iff 5^3 = 125 \\checkmark',
          annotation: '$\\log_b x = y \\iff b^y = x$. Base stays base, exponent and log value swap positions.',
          hint: 'Identify the three pieces: base = 5, log value = 3, argument = 125. Then write base^(log value) = argument.',
        },
        {
          expression: '(b)\\; 4^{-2} = \\frac{1}{16} \\iff \\log_4 \\frac{1}{16} = -2 \\checkmark',
          annotation: 'The exponent $-2$ becomes the log value. Verify: $4^{-2} = 1/4^2 = 1/16$ ✓',
          hint: 'Identify base = 4, exponent = -2, result = 1/16. Then write log_(base)(result) = exponent.',
        },
      ],
      conclusion: 'Converting between forms is mechanical once you fix the pattern: base stays base, exponent and log value trade places.',
    },
    {
      id: 'ch4-002-ex2',
      title: 'Evaluating logs without a calculator',
      problem: '\\text{Evaluate: (a) } \\log_3 81 \\quad \\text{(b) } \\log_4 \\frac{1}{64} \\quad \\text{(c) } \\ln e^7 \\quad \\text{(d) } \\log_5 1',
      steps: [
        {
          expression: '(a)\\; \\log_3 81 = \\log_3 3^4 = 4',
          annotation: 'Write 81 as a power of 3: $81 = 3^4$. Then $\\log_3 3^4 = 4$.',
          hint: 'Ask: "3 to what power equals 81?" Factor 81 = 3 · 3 · 3 · 3 = 3^4.',
        },
        {
          expression: '(b)\\; \\log_4 \\frac{1}{64} = \\log_4 4^{-3} = -3',
          annotation: '$64 = 4^3$, so $1/64 = 4^{-3}$. Log gives the exponent: $-3$.',
          hint: 'First find 64 as a power of 4: $4^3 = 64$. Then $1/64 = 4^{-3}$, and the log reads off the exponent $-3$.',
        },
        {
          expression: '(c)\\; \\ln e^7 = 7',
          annotation: 'Direct application of $\\ln e^x = x$. The cancellation identity.',
          hint: 'This is the cancel identity: $\\ln(e^{\\text{anything}}) = $ that thing. No calculation needed.',
        },
        {
          expression: '(d)\\; \\log_5 1 = 0',
          annotation: '$5^0 = 1$ for any base. $\\log_b 1 = 0$ always.',
          hint: 'Ask: "5 to what power equals 1?" Any number to the power 0 is 1, so the answer is 0.',
        },
      ],
      conclusion: 'The strategy: write the argument as a power of the base, then read off the exponent. This always works for "nice" arguments.',
    },
    {
      id: 'ch4-002-ex3',
      title: 'Graphing with transformations — full analysis',
      problem: 'f(x) = -2\\ln(x+3) + 1. \\text{ Find domain, asymptote, x-intercept, and sketch.}',
      steps: [
        {
          expression: '\\text{Domain: } x + 3 > 0 \\Rightarrow x > -3. \\quad \\text{Domain: } (-3, \\infty)',
          annotation: 'The argument of ln must be positive.',
          hint: 'Set the expression inside the log greater than zero and solve. The solution is the domain.',
        },
        {
          expression: '\\text{Vertical asymptote: } x = -3 \\quad (\\text{left boundary of domain})',
          annotation: 'Asymptote is at the value that makes the argument zero.',
          hint: 'The vertical asymptote is always at the value of $x$ that would make the log argument equal zero — the left edge of the domain.',
        },
        {
          expression: 'x\\text{-intercept: } 0 = -2\\ln(x+3)+1 \\Rightarrow \\ln(x+3) = \\frac{1}{2} \\Rightarrow x+3 = e^{1/2} \\Rightarrow x = \\sqrt{e}-3 \\approx -1.35',
          annotation: 'Set $f(x) = 0$ and solve. Convert from log to exponential form.',
          hint: 'Set f(x) = 0, isolate the ln term, then exponentiate both sides to switch from log to exponential form.',
        },
        {
          expression: 'y\\text{-intercept: } f(0) = -2\\ln(3)+1 \\approx -2(1.099)+1 \\approx -1.20',
          annotation: 'Substitute $x = 0$.',
          hint: 'Substitute x = 0 directly. Check that 0 is in the domain first (0 > -3, so yes).',
        },
        {
          expression: '\\text{Transformations: reflect (}a=-2<0\\text{), stretch by 2, shift left 3, up 1.}',
          annotation: 'The negative $a$ means the graph opens downward — as $x \\to \\infty$, $f(x) \\to -\\infty$.',
          hint: 'Read off a = -2 (reflect + stretch), h = -3 (left shift because x - (-3) = x + 3), k = 1 (up shift).',
        },
      ],
      conclusion: 'Full analysis order: (1) domain, (2) asymptote, (3) intercepts, (4) describe transformations, (5) sketch.',
    },
  ],

  challenges: [
    {
      id: 'ch4-002-ch1',
      difficulty: 'medium',
      problem: '\\text{Find the domain of } f(x) = \\log_3(x^2 - 5x + 4).',
      hint: 'Factor the quadratic inside the log. The argument must be strictly positive.',
      walkthrough: [
        {
          expression: 'x^2 - 5x + 4 = (x-1)(x-4) > 0',
          annotation: 'Factor. Need the product to be positive.',
        },
        {
          expression: '\\text{Sign chart: positive when } x < 1 \\text{ or } x > 4.',
          annotation: 'Product of two factors is positive when both positive or both negative. Both positive: $x>4$. Both negative: $x<1$.',
        },
        {
          expression: '\\text{Domain: } (-\\infty, 1) \\cup (4, \\infty)',
          annotation: 'Two separate intervals — the log is undefined between the roots where the quadratic is negative.',
        },
      ],
      answer: '(-\\infty, 1) \\cup (4, \\infty)',
    },
    {
      id: 'ch4-002-ch2',
      difficulty: 'hard',
      problem: '\\text{Prove: } \\log_{1/b} x = -\\log_b x \\text{ for all valid } x.',
      hint: 'Use the definition. Let $\\log_{1/b} x = y$ and convert to exponential form.',
      walkthrough: [
        {
          expression: '\\log_{1/b} x = y \\iff \\left(\\frac{1}{b}\\right)^y = x \\iff b^{-y} = x',
          annotation: '$(1/b)^y = b^{-y}$ by negative exponent rule.',
        },
        {
          expression: 'b^{-y} = x \\iff \\log_b x = -y',
          annotation: 'Convert back to log form.',
        },
        {
          expression: '\\therefore \\log_{1/b} x = y = -\\log_b x \\qquad \\blacksquare',
          annotation: 'This explains why $\\log_{1/2} x = -\\log_2 x$ — a decay base gives the negative of the corresponding growth base log.',
        },
      ],
      answer: '\\log_{1/b} x = -\\log_b x',
    },
  ],

  calcBridge: {
    teaser: 'The natural log is the most important function in calculus after $e^x$ itself. Its derivative is $\\frac{d}{dx}\\ln x = \\frac{1}{x}$ — the one antiderivative the power rule cannot provide ($\\int x^{-1}\\,dx$). This is why $\\ln|x| + C$ appears so often in integration. Every rational function integration problem that ends up with a log is using this formula.',
    linkedLessons: ['log-properties', 'natural-base-e-and-ln'],
  },

  crossRefs: [
    { slug: 'exponential-functions', reason: 'Logarithms are the inverse of exponentials — you must understand the exponential before the logarithm makes sense.' },
    { slug: 'log-properties', reason: 'The product, quotient, and power rules for logs follow directly from the inverse relationship established here.' },
    { slug: 'natural-base-e-and-ln', reason: 'The natural log ln is the special case with base e — the most important logarithm in calculus.' },
    { slug: 'solving-exponential-log', reason: 'The "take a log of both sides" technique for solving equations is an application of the inverse relationship defined here.' },
  ],

  checkpoints: [
    'State the definition of $\\log_b x = y$ in terms of exponential form.',
    'Why is $\\log_b(-3)$ undefined for any real base $b > 0$?',
    'What are the domain and range of $y = \\log_b x$, and why do they differ from $y = b^x$?',
    'Given $f(x) = \\ln(x - 5) + 2$, what is the vertical asymptote and domain?',
    'Evaluate $\\log_4 64$ without a calculator and explain your reasoning.',
  ],

  semantics: {
    symbols: [
      { symbol: '\\log_b x', meaning: 'Logarithm base b of x — the exponent y such that b^y = x; asks "what exponent does b need?"' },
      { symbol: '\\log x', meaning: 'Common logarithm — base 10 (the "log" button on most calculators)' },
      { symbol: '\\ln x', meaning: 'Natural logarithm — base e ≈ 2.718; the inverse of e^x' },
      { symbol: '\\log_2 x', meaning: 'Binary logarithm — base 2; ubiquitous in computer science (tree height, search complexity)' },
    ],
    rulesOfThumb: [
      'log_b(x) = y means b^y = x — always convert to this form when stuck.',
      'Domain of any logarithm: the argument must be strictly positive.',
      'The vertical asymptote of log_b(x - h) + k is always at x = h.',
      'log_b(1) = 0 and log_b(b) = 1 for any valid base — memorize these.',
      'Larger base = slower growth for x > 1; log_2 grows fastest, log_10 slowest.',
    ],
  },

  spiral: {
    recoveryPoints: [
      { topic: 'Inverse functions', where: 'Precalc-1: Functions', why: 'The logarithm is the inverse of the exponential. Review function inverses, domain/range swapping, and the reflection across y = x.' },
      { topic: 'Exponential functions', where: 'Precalc-4, Lesson 1', why: 'Every property of the log graph is the mirror image of the exponential graph — the previous lesson is the foundation.' },
    ],
    futureLinks: [
      { topic: 'Derivative of ln(x)', where: 'Calc 1: Derivatives', why: 'd/dx[ln x] = 1/x — the most important antiderivative that the power rule cannot provide; derives from the inverse relationship here.' },
      { topic: 'Integration by substitution with ln', where: 'Calc 1: Integration', why: 'Integrals of the form ∫f\'(x)/f(x) dx = ln|f(x)| + C use the log function from this lesson directly.' },
    ],
  },

  assessment: [
    {
      question: 'Convert $\\log_2 32 = 5$ to exponential form.',
      answer: '2^5 = 32',
      difficulty: 'quick-fire',
    },
    {
      question: 'What is the domain of $f(x) = \\ln(x - 4)$?',
      answer: '(4, \\infty)',
      difficulty: 'quick-fire',
    },
    {
      question: 'Evaluate $\\log_6 1$ and $\\log_6 6$ without a calculator.',
      answer: '\\log_6 1 = 0 \\text{ and } \\log_6 6 = 1',
      difficulty: 'quick-fire',
    },
  ],

  mentalModel: [
    'A logarithm answers exactly one question: "to what power must the base be raised to get this number?"',
    'log and exponential are inverses — they undo each other, just like addition and subtraction.',
    'Domain of any log is always positive numbers only — the argument must be > 0.',
    'The graph of log_b(x) is the mirror image of b^x reflected across the line y = x.',
    'Vertical asymptote of log lives at the domain boundary — wherever the argument would equal zero.',
  ],

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: '$\\log_b x = y$ is equivalent to which exponential statement?',
      options: ['y^b = x', 'b^y = x', 'b^x = y', 'x^b = y'],
      answer: 'b^y = x',
      hints: ['The base of the log stays the base of the power.', 'The log value y becomes the exponent, and x stays as the result.'],
      reviewSection: 'Intuition tab — log definition',
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Evaluate $\\log_5 125$.',
      options: ['2', '3', '5', '25'],
      answer: '3',
      hints: ['Ask: 5 to what power equals 125?', '5^1 = 5, 5^2 = 25, 5^3 = 125.'],
      reviewSection: 'Examples tab — evaluating logs without a calculator',
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'What is the domain of $f(x) = \\log_3(x - 2)$?',
      options: ['(-∞, 2)', '(2, ∞)', '(-∞, ∞)', '(0, ∞)'],
      answer: '(2, ∞)',
      hints: ['Set the argument greater than zero: x - 2 > 0.', 'Solving x - 2 > 0 gives x > 2, so the domain is (2, ∞).'],
      reviewSection: 'Math tab — domain is the first thing to check',
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'The graph of $y = \\log_b x$ has which feature at $x = 0$?',
      options: ['A y-intercept of 1', 'A y-intercept of 0', 'A vertical asymptote', 'A horizontal asymptote'],
      answer: 'A vertical asymptote',
      hints: ['The log is undefined at x = 0. What does the graph do near a point where the function is undefined?', 'As x approaches 0 from the right, log_b(x) → -∞. That is a vertical asymptote.'],
      reviewSection: 'Intuition tab — the inverse relationship',
    },
    {
      id: 'q5',
      type: 'choice',
      text: 'The graph of $y = \\log_b x$ always passes through which point?',
      options: ['(0, 1)', '(1, 0)', '(0, 0)', '(b, 1)'],
      answer: '(1, 0)',
      hints: ['Evaluate at x = 1: log_b(1) = ? Recall log_b(1) = 0 for any base.', 'b^0 = 1, so log_b(1) = 0. The point is (1, 0).'],
      reviewSection: 'Intuition tab — key log values',
    },
    {
      id: 'q6',
      type: 'choice',
      text: 'Which statement is true about $\\log_{10} 100$ and $\\log_2 100$?',
      options: ['They are equal', 'log₁₀ 100 > log₂ 100', 'log₁₀ 100 < log₂ 100', 'Neither is defined'],
      answer: 'log₁₀ 100 < log₂ 100',
      hints: ['Compute log₁₀(100) = 2. Now estimate log₂(100): 2^6 = 64, 2^7 = 128, so log₂(100) is between 6 and 7.', 'Larger base means slower growth — log₁₀ gives smaller values than log₂ for the same argument > 1.'],
      reviewSection: 'Math tab — comparing log bases',
    },
    {
      id: 'q7',
      type: 'choice',
      text: 'For $f(x) = \\log_2(x + 5) - 3$, what is the vertical asymptote?',
      options: ['x = 5', 'x = -5', 'x = -3', 'y = -3'],
      answer: 'x = -5',
      hints: ['Set the argument equal to zero: x + 5 = 0. That gives the asymptote location.', 'The asymptote is the vertical line x = h, where h is the horizontal shift.'],
      reviewSection: 'Math tab — general log transformation',
    },
    {
      id: 'q8',
      type: 'choice',
      text: 'Evaluate $\\ln e^{-4}$.',
      options: ['-4', '4', '-1/4', 'e^(-4)'],
      answer: '-4',
      hints: ['Apply the cancel identity: ln(e^x) = x for any x.', 'ln(e^(-4)) = -4 directly.'],
      reviewSection: 'Intuition tab — key log values',
    },
    {
      id: 'q9',
      type: 'choice',
      text: 'Which is the reflection of $y = 3^x$ over the line $y = x$?',
      options: ['y = 3^(-x)', 'y = log₃(x)', 'y = -3^x', 'y = x/3'],
      answer: 'y = log₃(x)',
      hints: ['Reflecting over y = x gives the inverse function. What is the inverse of the exponential?', 'The inverse of b^x is log_b(x). Here b = 3.'],
      reviewSection: 'Intuition tab — the inverse relationship',
    },
    {
      id: 'q10',
      type: 'choice',
      text: 'What is the range of $y = \\log_b x$ for any valid base $b$?',
      options: ['(0, ∞)', '(-∞, 0)', '(-∞, ∞)', '(1, ∞)'],
      answer: '(-∞, ∞)',
      hints: ['The range of the log equals the domain of the exponential (they swap as inverses).', 'The exponential b^x has domain (-∞, ∞), so the log has range (-∞, ∞).'],
      reviewSection: 'Intuition tab — the inverse relationship',
    },
  ],
}
