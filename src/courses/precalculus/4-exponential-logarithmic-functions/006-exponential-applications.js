export default {
  id: 'precalc4-006',
  slug: 'exponential-applications',
  chapter: 'precalc-4',
  order: 6,
  title: 'Exponential Models: Growth, Decay, and Everything In Between',
  subtitle: 'One equation — $A = A_0 e^{kt}$ — models populations, radioactive decay, cooling, and more. The sign of $k$ decides everything.',
  tags: ['exponential growth', 'exponential decay', 'population growth', 'radioactive decay', 'half-life', 'doubling time', 'Newton law of cooling', 'logistic growth', 'carrying capacity', 'modeling'],
  aliases: 'exponential growth decay model population radioactive half-life doubling time Newton cooling logistic carrying capacity A=Pe^rt application',

  hook: {
    question: 'In 1950 the world population was 2.5 billion. In 2000 it was 6.1 billion. Assuming exponential growth, what would it be in 2050? And why does this model eventually break down?',
    realWorldContext: 'Exponential models describe the first phase of almost every growth or decay process. A bacteria colony, a chain reaction, a viral post, a rumour — all grow exponentially when resources are unlimited. But resources are never unlimited forever, which is why logistic models (which cap at a carrying capacity) better describe long-run behaviour. In manufacturing, exponential decay describes equipment degradation, signal attenuation in cables, and the discharge of a capacitor. In pharmacology, drug concentration in the bloodstream follows exponential decay between doses.',
    previewVisualizationId: 'GrowthDecayViz',
  },

  intuition: {
    prose: [
      'The general exponential model is $A(t) = A_0 e^{kt}$, where $A_0$ is the initial amount at $t=0$, $k$ is the growth rate constant, and $t$ is time. When $k > 0$, the quantity grows. When $k < 0$, it decays. The constant $k$ is not a percentage rate — it is the instantaneous relative rate of change, meaning $k = A\'(t)/A(t)$ at every instant.',
      'To find $k$ from data: you need two data points $(t_1, A_1)$ and $(t_2, A_2)$. Write $A_1 = A_0 e^{kt_1}$ and $A_2 = A_0 e^{kt_2}$. Divide the equations to eliminate $A_0$: $A_2/A_1 = e^{k(t_2-t_1)}$. Take $\\ln$ of both sides and solve for $k$. This is the standard procedure — eliminate the unknown you do not want first.',
      'Half-life ($T_{1/2}$) is the time for a decaying quantity to halve: $\\frac{1}{2} = e^{kT_{1/2}} \\Rightarrow T_{1/2} = -\\ln 2 / k$ (negative because $k < 0$ for decay). Doubling time ($T_d$) is analogous for growth: $2 = e^{kT_d} \\Rightarrow T_d = \\ln 2 / k$. Both depend only on $k$, not on $A_0$ — the starting amount does not change how fast the process happens.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'The universal exponential model',
        body: 'A(t) = A_0\\,e^{kt} \\\\ A_0 = \\text{initial amount} \\quad k > 0: \\text{growth} \\quad k < 0: \\text{decay} \\\\ T_{\\text{double}} = \\frac{\\ln 2}{k} \\quad T_{1/2} = \\frac{-\\ln 2}{k} = \\frac{\\ln 2}{|k|}',
      },
      {
        type: 'proof-map',
        title: 'Finding k from two data points',
        body: '1.\\; \\text{Write: } A_1 = A_0 e^{kt_1} \\text{ and } A_2 = A_0 e^{kt_2} \\\\ 2.\\; \\text{Divide: } \\frac{A_2}{A_1} = e^{k(t_2-t_1)} \\\\ 3.\\; \\text{Take ln: } k = \\frac{\\ln(A_2/A_1)}{t_2 - t_1} \\\\ 4.\\; \\text{Back-substitute to find } A_0 \\text{ if needed}',
      },
      {
        type: 'insight',
        title: "Newton's Law of Cooling — same structure",
        body: 'T(t) = T_e + (T_0 - T_e)e^{kt} \\quad k < 0 \\\\ T_e = \\text{ambient temperature (environment)} \\\\ T_0 = \\text{initial temperature of object} \\\\ \\text{As } t \\to \\infty: T \\to T_e \\text{ — approaches room temperature}',
      },
      {
        type: 'insight',
        title: 'Logistic growth — when resources are limited',
        body: 'P(t) = \\frac{L}{1 + Ce^{-kt}} \\quad L = \\text{carrying capacity} \\\\ \\text{Early: behaves like exponential} \\\\ \\text{Later: slows as } P \\to L \\text{ (S-shaped curve)} \\\\ \\text{Used for: population, disease spread, product adoption}',
      },
    ],
    visualizations: [
      {
        id: 'GrowthDecayViz',
        title: 'Growth and Decay Models — Adjust k and See',
        mathBridge: 'Use the rate slider to control $k$. Observe how the doubling time or half-life marker moves. Compare the model against actual world population data points.',
        caption: 'The same curve, two stories: positive $k$ means explosive growth, negative $k$ means relentless decay.',
      },
    ],
  },

  math: {
    prose: [
      'Radioactive decay is the canonical decay model. Carbon-14 has a half-life of 5730 years. From $T_{1/2} = \\ln 2 / |k|$, we get $k = -\\ln 2 / 5730 \\approx -0.0001209$ per year. A sample that is $A_0$ grams at $t=0$ will be $A_0 e^{-0.0001209 t}$ grams at time $t$. To find the age of a sample given its current amount, solve for $t$ using $\\ln$.',
      'Newton\'s Law of Cooling states that the rate of temperature change of an object is proportional to the difference between its temperature and the ambient temperature. The solution is $T(t) = T_e + (T_0 - T_e)e^{kt}$ where $k < 0$. Note that the exponential part starts at $(T_0 - T_e)$ and decays to zero, so $T(t)$ starts at $T_0$ and approaches $T_e$ — the object equilibrates with its environment.',
      'For logistic growth $P(t) = L/(1 + Ce^{-kt})$: the constant $C = (L - P_0)/P_0$ where $P_0$ is the initial population. At $t=0$, $P = L/(1+C) = P_0$ (verify this). The inflection point — where growth is fastest — occurs at $P = L/2$, exactly half the carrying capacity. This is when the S-curve transitions from accelerating to decelerating growth.',
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'Radioactive decay — carbon dating formula',
        body: 'A(t) = A_0 e^{kt} \\quad k = \\frac{-\\ln 2}{T_{1/2}} \\\\ \\text{C-14: } T_{1/2} = 5730 \\text{ yr} \\Rightarrow k \\approx -0.0001209 \\text{ yr}^{-1} \\\\ \\text{Age: } t = \\frac{\\ln(A/A_0)}{k} = \\frac{T_{1/2}}{\\ln 2}\\ln\\frac{A_0}{A}',
      },
      {
        type: 'theorem',
        title: 'Logistic model',
        body: 'P(t) = \\frac{L}{1 + Ce^{-kt}} \\quad C = \\frac{L-P_0}{P_0} \\\\ \\text{Inflection at } P = L/2 \\text{, time } t^* = \\frac{\\ln C}{k} \\\\ \\text{Range: } (0, L) \\text{ — never reaches the carrying capacity}',
      },
      {
        type: 'insight',
        title: 'Rule of 70 — quick mental estimate',
        body: 'T_{1/2} \\approx \\frac{70}{|k|\\%} \\quad T_d \\approx \\frac{70}{k\\%} \\\\ \\text{(Rule of 72 uses 72; 70 works better for continuous models)} \\\\ \\text{Example: 7\\% continuous growth} \\Rightarrow \\text{doubles in } \\approx 10 \\text{ years}',
      },
    ],
  },

  rigor: {
    title: 'Deriving the carbon dating age formula from first principles',
    visualizationId: 'GrowthDecayViz',
    proofSteps: [
      {
        expression: 'A(t) = A_0 e^{kt}, \\quad T_{1/2} = 5730 \\text{ yr}',
        annotation: 'Start with the general decay model and the known half-life of C-14.',
      },
      {
        expression: '\\frac{A_0}{2} = A_0 e^{k \\cdot 5730} \\Rightarrow \\frac{1}{2} = e^{5730k}',
        annotation: 'At $t = T_{1/2}$, the amount is half the initial.',
      },
      {
        expression: '\\ln\\frac{1}{2} = 5730k \\Rightarrow k = \\frac{-\\ln 2}{5730} \\approx -1.209 \\times 10^{-4} \\text{ yr}^{-1}',
        annotation: 'Solve for $k$. This is exact.',
      },
      {
        expression: 'A = A_0 e^{kt} \\Rightarrow \\frac{A}{A_0} = e^{kt} \\Rightarrow \\ln\\frac{A}{A_0} = kt',
        annotation: 'To find age $t$ from measured ratio $A/A_0$: take ln.',
      },
      {
        expression: 't = \\frac{\\ln(A/A_0)}{k} = \\frac{T_{1/2}}{\\ln 2} \\cdot \\ln\\frac{A_0}{A} = \\frac{5730}{\\ln 2}\\ln\\frac{A_0}{A} \\qquad \\blacksquare',
        annotation: 'The carbon dating formula. Measure the current fraction $A/A_0$ of C-14 remaining, and this gives the age in years.',
      },
    ],
  },

  examples: [
    {
      id: 'ch4-005-ex1',
      title: 'Population growth — finding k and predicting',
      problem: '\\text{A city had population 250,000 in 2000 and 310,000 in 2010. Assuming exponential growth, predict the 2025 population.}',
      steps: [
        {
          expression: 'k = \\frac{\\ln(310000/250000)}{2010-2000} = \\frac{\\ln(1.24)}{10} \\approx \\frac{0.2151}{10} \\approx 0.02151 \\text{ yr}^{-1}',
          annotation: 'Find $k$ from the two data points.',
        },
        {
          expression: 'A(t) = 250000\\,e^{0.02151 t} \\quad (t = \\text{years after 2000})',
          annotation: 'Write the model. Use $A_0 = 250000$ (year 2000 as reference).',
        },
        {
          expression: 'A(25) = 250000\\,e^{0.02151 \\times 25} = 250000\\,e^{0.5378} \\approx 250000(1.712) \\approx 428{,}000',
          annotation: '$t=25$ for year 2025.',
        },
      ],
      conclusion: 'Always set a clear $t=0$ reference. Keep $k$ in exact form ($\\ln(310/250)/10$) until the final calculation to avoid rounding errors.',
    },
    {
      id: 'ch4-005-ex2',
      title: 'Radioactive decay — carbon dating',
      problem: '\\text{A fossil contains 35\\% of its original C-14. Estimate its age.}',
      steps: [
        {
          expression: 't = \\frac{5730}{\\ln 2} \\cdot \\ln\\frac{A_0}{A} = \\frac{5730}{0.6931} \\cdot \\ln\\frac{1}{0.35}',
          annotation: 'Apply the carbon dating formula. $A/A_0 = 0.35$, so $A_0/A = 1/0.35$.',
        },
        {
          expression: '= 8267 \\cdot \\ln(2.857) = 8267 \\cdot 1.0498 \\approx 8679 \\text{ years}',
          annotation: 'Calculate. The fossil is approximately 8,700 years old.',
        },
      ],
      conclusion: 'Carbon dating is only reliable for samples up to ~50,000 years (about 9 half-lives). Beyond that, too little C-14 remains to measure accurately.',
    },
    {
      id: 'ch4-005-ex3',
      title: "Newton's Law of Cooling",
      problem: '\\text{Coffee at 90°C is placed in a 20°C room. After 10 min it is 70°C. When will it reach 40°C?}',
      steps: [
        {
          expression: 'T(t) = 20 + 70e^{kt} \\quad [T_0=90, T_e=20, \\text{ so } T_0-T_e=70]',
          annotation: 'Set up the model.',
        },
        {
          expression: '70 = 20 + 70e^{10k} \\Rightarrow 50 = 70e^{10k} \\Rightarrow k = \\frac{\\ln(5/7)}{10} \\approx -0.03365',
          annotation: 'Use the data point $(10, 70)$ to find $k$.',
        },
        {
          expression: '40 = 20 + 70e^{kt} \\Rightarrow 20 = 70e^{kt} \\Rightarrow t = \\frac{\\ln(2/7)}{k} = \\frac{\\ln(2/7)}{\\ln(5/7)/10} \\approx \\frac{-1.2528}{-0.03365} \\approx 37.2 \\text{ min}',
          annotation: 'Solve for $t$ when $T=40$.',
        },
      ],
      conclusion: 'The coffee cools to 40°C in about 37 minutes. Note that it approaches 20°C (room temperature) asymptotically — it theoretically never reaches exactly 20°C.',
    },
  ],

  challenges: [
    {
      id: 'ch4-005-ch1',
      difficulty: 'medium',
      problem: '\\text{A drug has a half-life of 4 hours in the bloodstream. A patient takes a 200 mg dose. How long until less than 10 mg remains?}',
      hint: 'Find $k$ from the half-life, then solve $10 = 200e^{kt}$ for $t$.',
      walkthrough: [
        {
          expression: 'k = -\\ln 2 / 4 \\approx -0.1733 \\text{ hr}^{-1}',
          annotation: 'Find the decay constant from the half-life.',
        },
        {
          expression: '10 = 200e^{-0.1733t} \\Rightarrow 0.05 = e^{-0.1733t} \\Rightarrow t = \\frac{\\ln 0.05}{-0.1733} \\approx \\frac{-2.996}{-0.1733} \\approx 17.3 \\text{ hr}',
          annotation: 'Solve for $t$.',
        },
      ],
      answer: 't \\approx 17.3 \\text{ hours (just over 4 half-lives)}',
    },
    {
      id: 'ch4-005-ch2',
      difficulty: 'hard',
      problem: '\\text{A lake can support at most 10,000 fish (carrying capacity). Currently there are 2,000 fish and the population is growing at } k = 0.3 \\text{ per year. Write the logistic model and find the population after 5 years.}',
      hint: 'Find $C = (L - P_0)/P_0$ first, then apply the logistic formula.',
      walkthrough: [
        {
          expression: 'C = \\frac{10000 - 2000}{2000} = 4',
          annotation: 'Compute $C$ from the initial condition.',
        },
        {
          expression: 'P(t) = \\frac{10000}{1 + 4e^{-0.3t}}',
          annotation: 'Logistic model.',
        },
        {
          expression: 'P(5) = \\frac{10000}{1 + 4e^{-1.5}} = \\frac{10000}{1 + 4(0.2231)} = \\frac{10000}{1.8924} \\approx 5284 \\text{ fish}',
          annotation: 'After 5 years — more than doubled but well below carrying capacity.',
        },
      ],
      answer: 'P(t) = \\dfrac{10000}{1+4e^{-0.3t}}; \\quad P(5) \\approx 5284',
    },
  ],

  calcBridge: {
    teaser: 'The exponential model $A = A_0 e^{kt}$ is the solution to the simplest differential equation: $\\frac{dA}{dt} = kA$ (rate of change is proportional to current amount). This is the first separable ODE you solve in Calculus 2. The logistic model $P\' = kP(1 - P/L)$ is the second most common — its solution is the S-curve. Every model in this lesson is a differential equation solution waiting to be recognised.',
    linkedLessons: ['exponential-functions', 'solving-exponential-log', 'logarithm-relationships'],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Exponential growth: A = A₀·eᵏᵗ. What does the constant k represent?',
      options: [
        'The amount that grows each time period',
        'The continuous growth RATE — k > 0 means growth, k < 0 means decay. The rate of change dA/dt = kA, meaning the amount growing at each instant is proportional to the current amount; k is the proportionality constant (e.g., k = 0.03 means 3% continuous growth rate)',
        'The time constant — how many years until the value doubles',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Radioactive decay: A = A₀·e^(-0.05t). The half-life is found by solving e^(-0.05t) = 1/2. Why take ln of both sides?',
      options: [
        'Because e^x and ln(x) cancel: ln(e^(-0.05t)) = -0.05t, solving to t = -ln(0.5)/0.05 = ln(2)/0.05',
        'To convert the exponential to a polynomial for easier computation',
        'ln is used only because the base is e; for other bases you would use log₂',
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Compound interest: A = P(1 + r/n)^(nt). As n → ∞ (compounding continuously), this approaches A = Pe^(rt). Why does e appear?',
      options: [
        'e appears as a coincidence of the limit definition of e = lim(1+1/n)ⁿ as n→∞',
        'lim(n→∞)(1 + r/n)^(nt) = lim(n→∞)[(1 + r/n)^(n/r)]^(rt) → e^(rt); the expression (1 + r/n)^(n/r) matches the definition of e as n→∞. Continuous compounding naturally produces the base e',
        'e is used for financial calculations because it gives the largest possible return',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'The logistic model P(t) = L/(1 + ((L-P₀)/P₀)·e^(-kt)) has an S-shaped curve. What happens as t → ∞?',
      options: [
        'P → ∞ — exponential growth eventually overwhelms the logistic term',
        'P → L (the carrying capacity) — as t → ∞, the term e^(-kt) → 0 for k > 0, making the denominator → 1, so P → L/1 = L. The logistic model captures bounded growth: fast at first, then slowing as the population approaches the environment\'s limit',
        'P → 0 — eventually the population collapses due to resource exhaustion',
      ],
      correct: 1,
    },
  ],
}
