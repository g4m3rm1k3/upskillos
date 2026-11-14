export default {
  id: "precalc4-001",
  slug: "exponential-functions",
  chapter: "precalc-4",
  order: 1,
  title: "Exponential Functions: When the Exponent Is the Variable",
  subtitle:
    "The difference between $x^2$ and $2^x$ is everything — one grows polynomially, the other eventually overtakes any polynomial",
  tags: [
    "exponential functions",
    "exponential growth",
    "exponential decay",
    "base",
    "natural base e",
    "compound interest",
    "graphing exponentials",
    "transformations",
  ],
  aliases:
    "exponential function graph base growth decay compound interest continuous e natural base transformations horizontal asymptote",

  hook: {
    question:
      "A population of bacteria doubles every hour. After 24 hours starting from 1 bacterium, how many are there? The answer — 16,777,216 — is why exponential growth is called explosive. But what makes the function $f(t) = 2^t$ so fundamentally different from $f(t) = t^2$?",
    realWorldContext:
      "Exponential functions model anything that grows or decays at a rate proportional to its current size: compound interest, radioactive decay, viral spread, cooling of a hot object, charging of a capacitor. In manufacturing, the learning curve — the observation that production cost drops by a fixed percentage each time cumulative output doubles — is an exponential relationship. Every one of these models uses the same family of functions.",
    previewVisualizationId: "ExponentialGraphViz",
  },

  intuition: {
    prose: [
      "**Where you are in the story:** You are coming from Precalc-3 (Trigonometry), where functions were defined by ratios of sides in triangles and wrapped around the unit circle. Now the story shifts to a completely different kind of function — one where the variable lives in the exponent, not the base. That single change transforms the entire shape of the curve and its behavior.",
      "In $f(x) = b^x$, the variable $x$ is in the exponent and $b$ is a constant called the base. This is the opposite of power functions like $x^b$ where the variable is the base. The distinction matters enormously: $x^2$ grows like a parabola, but $2^x$ eventually overtakes any polynomial, no matter how high the degree.",
      "The base $b$ determines everything about the shape. When $b > 1$, the function grows — each unit increase in $x$ multiplies the output by $b$. This is multiplicative growth, which is why it accelerates so dramatically. When $0 < b < 1$, the function decays — each unit increase in $x$ multiplies the output by a fraction less than 1.",
      "Every exponential function $f(x) = b^x$ passes through $(0, 1)$ because $b^0 = 1$ for any valid base. The $x$-axis is a horizontal asymptote: the function approaches but never touches it. For growth functions, as $x \\to -\\infty$; for decay functions, as $x \\to +\\infty$.",
      '**Where this is heading:** Next you will meet $e$ and $\\ln$ — where the choice of base $e \\approx 2.71828$ turns out to be the one that makes all calculus simplest. You will also meet logarithms: the operation that "undoes" exponentiation, and the key to solving any equation where the unknown is trapped in an exponent.',
    ],
    callouts: [
      {
        type: "sequencing",
        title: "Precalc-4 arc — Lesson 1 of 6",
        body: "← Precalc-3: Trigonometry | **Exponential Functions** | Logarithms: The Inverse →",
      },
      {
        type: "definition",
        title: "Exponential function",
        body: "f(x) = b^x \\quad \\text{where } b > 0, \\; b \\neq 1, \\; b \\in \\mathbb{R} \\\\ \\text{Domain: } (-\\infty, \\infty) \\qquad \\text{Range: } (0, \\infty) \\\\ \\text{Always passes through } (0,1). \\text{ Horizontal asymptote: } y = 0.",
      },
      {
        type: "insight",
        title: "Growth vs decay — the base tells you which",
        body: "b > 1: \\text{ exponential GROWTH — function increases} \\\\ 0 < b < 1: \\text{ exponential DECAY — function decreases} \\\\ \\text{Note: } f(x) = \\left(\\tfrac{1}{2}\\right)^x = 2^{-x} \\text{ — decay is just growth reflected.}",
      },
      {
        type: "warning",
        title: "What makes a valid base",
        body: "b > 0 \\text{ — negative bases give complex numbers for fractional exponents} \\\\ b \\neq 1 \\text{ — base 1 gives the constant function } f(x)=1 \\text{, not exponential} \\\\ b \\neq 0 \\text{ — base 0 gives } 0^x = 0 \\text{ for all } x > 0 \\text{, undefined at 0}",
      },
    ],
    visualizations: [
      {
        id: "ExponentialGraphViz",
        title: "Exponential Functions — Live Base and Transformation Control",
        mathBridge:
          "Step 1: Set the base $b$ to a value greater than 1 (e.g., $b = 2$) and observe the growth curve passing through $(0,1)$. Step 2: Drag $b$ below 1 (e.g., $b = 0.5$) and watch the curve flip into a decay shape — the same point $(0,1)$ remains fixed, but the curve now falls instead of rising. Step 3: Adjust the transformation parameters $a$, $h$, $k$ in $f(x) = a \\cdot b^{x-h} + k$ one at a time, noting how $k$ moves the horizontal asymptote, $h$ slides the curve left/right, and $a$ stretches or reflects it. The key lesson: the base controls growth vs decay, and every transformation preserves the fundamental exponential shape.",
        caption:
          "Every transformation has a geometric meaning. The horizontal asymptote shifts with $k$; the base controls steepness.",
      },
    ],
  },

  math: {
    prose: [
      "Transformations of exponential functions follow the same master formula as all functions: $f(x) = a \\cdot b^{x-h} + k$. Here $a$ is a vertical stretch/reflection, $h$ is a horizontal shift, and $k$ is a vertical shift that also moves the horizontal asymptote from $y=0$ to $y=k$. When $a < 0$, the function reflects over the $x$-axis and the range becomes $(-\\infty, k)$.",
      "The natural base $e \\approx 2.71828$ is the most important base in calculus. It is defined as $e = \\lim_{n \\to \\infty}\\left(1 + \\frac{1}{n}\\right)^n$, which emerges naturally from compound interest. The function $f(x) = e^x$ is its own derivative — the only function with this property — which is why it dominates in calculus, differential equations, and physics.",
      "Compound interest is the direct application of exponential functions to finance. If principal $P$ grows at annual rate $r$, compounded $n$ times per year for $t$ years: $A = P\\left(1 + \\frac{r}{n}\\right)^{nt}$. As $n \\to \\infty$ (continuous compounding), this becomes $A = Pe^{rt}$. The difference between monthly and continuous compounding is small but real.",
    ],
    callouts: [
      {
        type: "theorem",
        title: "General exponential transformation",
        body: "f(x) = a \\cdot b^{x-h} + k \\\\ a: \\text{ vertical stretch } (|a|>1) \\text{ or compression } (|a|<1); \\text{ reflection if } a<0 \\\\ h: \\text{ horizontal shift (right if } h>0\\text{)} \\\\ k: \\text{ vertical shift; horizontal asymptote becomes } y=k",
      },
      {
        type: "definition",
        title: "The natural base $e$",
        body: "e = \\lim_{n\\to\\infty}\\left(1+\\frac{1}{n}\\right)^n \\approx 2.71828\\ldots \\\\ f(x) = e^x: \\text{ derivative is itself — } \\frac{d}{dx}e^x = e^x \\\\ \\text{Used in: continuous growth, calculus, probability, physics}",
      },
      {
        type: "theorem",
        title: "Compound interest formulas",
        body: "A = P\\left(1+\\frac{r}{n}\\right)^{nt} \\quad \\text{(compounded } n \\text{ times/year)} \\\\ A = Pe^{rt} \\quad \\text{(continuous compounding)} \\\\ P = \\text{principal},\\; r = \\text{annual rate},\\; t = \\text{years}",
      },
      {
        type: "insight",
        title: "Doubling time and half-life",
        body: "A(t) = A_0 \\cdot 2^{t/T_d} \\quad (T_d = \\text{doubling time}) \\\\ A(t) = A_0 \\cdot \\left(\\tfrac{1}{2}\\right)^{t/T_h} \\quad (T_h = \\text{half-life}) \\\\ \\text{Rule of 72: doubling time} \\approx 72/r\\% \\text{ (e.g. 6\\% → doubles in ~12 years)}",
      },
    ],
    visualizations: [
      {
        id: "GrowthDecayViz",
        title: "Compound Interest & Exponential Growth/Decay",
        mathBridge:
          "Step 1: Set principal $P = 1000$, rate $r = 0.05$, and compounding to monthly ($n = 12$). Read the amount at $t = 10$ years. Step 2: Switch to continuous compounding and observe how the curve sits just above the monthly curve — the gap is real but small. Step 3: Drag the time slider to $t = 20$ and $t = 30$, watching how the gap between monthly and continuous grows over time. The key lesson: continuous compounding is the theoretical maximum for a given rate, and the exponential shape — not the compounding frequency — accounts for most of the growth.",
        caption:
          "The gap between monthly and continuous compounding is visible but small. The real power is the exponential shape itself.",
      },
    ],
  },

  rigor: {
    title:
      "Why $e = \\lim_{n\\to\\infty}\\left(1+\\frac{1}{n}\\right)^n$ emerges from continuous compounding",
    visualizationId: "GrowthDecayViz",
    proofSteps: [
      {
        expression:
          "\\text{Start: } \\$1 \\text{ at annual rate } 100\\%, \\text{ compounded } n \\text{ times per year for 1 year.}",
        annotation:
          "We use 100% rate and $1 principal to keep the algebra clean. The result generalises to any rate and principal.",
      },
      {
        expression: "A(n) = 1 \\cdot \\left(1 + \\frac{1}{n}\\right)^n",
        annotation: "Compound interest formula with $P=1$, $r=1$, $t=1$.",
      },
      {
        expression:
          "n=1: \\$2.00 \\quad n=12: \\$2.613 \\quad n=365: \\$2.7146 \\quad n=8760: \\$2.7181",
        annotation:
          "As $n$ increases (more frequent compounding), the amount grows — but slower and slower. It is approaching a limit.",
      },
      {
        expression:
          "\\lim_{n\\to\\infty}\\left(1+\\frac{1}{n}\\right)^n = e \\approx 2.71828\\ldots",
        annotation:
          "The limit exists and is irrational. This is the definition of $e$ — it is the amount $\\$1$ grows to at 100% continuous compounding for 1 year.",
      },
      {
        expression: "A = Pe^{rt} \\qquad \\blacksquare",
        annotation:
          "For general $P$, $r$, and $t$: substitute $n = m/r$ and let $m \\to \\infty$. The same limit gives $e^{rt}$ in the exponent.",
      },
    ],
  },

  examples: [
    {
      id: "ch4-001-ex1",
      title: "Reading a graph and identifying transformations",
      problem:
        "f(x) = -2 \\cdot 3^{x+1} + 4. \\text{ Identify all transformations, domain, range, and asymptote.}",
      steps: [
        {
          expression:
            "\\text{Base function: } g(x) = 3^x \\text{ (growth, base 3)}",
          annotation: "Always start by identifying the parent function.",
          hint: "Ignore the $a$, $h$, $k$ parameters for now. The parent is just $b^x$ with your base — here $3^x$.",
        },
        {
          expression:
            "h = -1: \\text{ shift left 1} \\quad k = 4: \\text{ shift up 4} \\quad a = -2: \\text{ reflect over x-axis, stretch by 2}",
          annotation:
            "Read off each parameter from $f(x) = a \\cdot b^{x-h} + k$. Note: $x+1 = x-(-1)$ so $h = -1$.",
          hint: "Rewrite $x+1$ as $x - (-1)$ to match the template $x - h$, making $h = -1$ (a left shift, not right).",
        },
        {
          expression:
            "\\text{Asymptote: } y = k = 4 \\qquad \\text{Domain: } (-\\infty, \\infty)",
          annotation: "The vertical shift moves the asymptote.",
          hint: "The horizontal asymptote always equals $k$ — the vertical shift moves the floor (or ceiling) of the function.",
        },
        {
          expression:
            "\\text{Range: } (-\\infty, 4) \\quad \\text{because } a = -2 < 0 \\text{ (reflected, so approaches 4 from below)}",
          annotation:
            "Negative $a$ flips the range. Without the reflection, range would be $(4, \\infty)$.",
          hint: "When $a < 0$ the graph is flipped: it goes downward from the asymptote, so the range is everything below $y = k$, not above.",
        },
      ],
      conclusion:
        "The key point $(0,1)$ of $3^x$ maps to: shift $x$ by $-1$ gives $(-1,1)$; stretch/reflect gives $(-1,-2)$; shift up 4 gives $(-1, 2)$.",
    },
    {
      id: "ch4-001-ex2",
      title: "Compound interest — finding the amount",
      problem:
        "\\$5000 \\text{ is invested at 4.5\\% annual interest. Find the amount after 10 years (a) compounded monthly, (b) compounded continuously.}",
      steps: [
        {
          expression:
            "(a)\\; A = 5000\\left(1+\\frac{0.045}{12}\\right)^{12 \\times 10} = 5000(1.00375)^{120} \\approx \\$7841.10",
          annotation: "$n=12$ (monthly), $r=0.045$, $t=10$.",
          hint: "Plug directly into $A = P(1 + r/n)^{nt}$. Convert the percentage rate to a decimal: 4.5% = 0.045.",
        },
        {
          expression:
            "(b)\\; A = 5000e^{0.045 \\times 10} = 5000e^{0.45} \\approx 5000(1.5683) \\approx \\$7841.56",
          annotation:
            "Continuous compounding. Notice: only $\\$0.46$ more than monthly — the difference is tiny at moderate rates.",
          hint: "Plug into $A = Pe^{rt}$. Compute $e^{0.45}$ on your calculator — it equals approximately 1.5683.",
        },
      ],
      conclusion:
        "Continuous compounding always gives the maximum possible amount for a given rate. The gap shrinks as rates decrease.",
    },
    {
      id: "ch4-001-ex3",
      title: "Doubling time",
      problem:
        "\\text{An investment grows continuously at 6\\%. How long to double?}",
      steps: [
        {
          expression: "2P = Pe^{0.06t} \\Rightarrow 2 = e^{0.06t}",
          annotation: "Set $A = 2P$ (doubled). Divide both sides by $P$.",
          hint: "The starting amount $P$ cancels — the doubling time does not depend on how much you start with.",
        },
        {
          expression:
            "\\ln 2 = 0.06t \\Rightarrow t = \\frac{\\ln 2}{0.06} \\approx \\frac{0.6931}{0.06} \\approx 11.55 \\text{ years}",
          annotation:
            "Take the natural log of both sides. Rule of 72 approximation: $72/6 = 12$ years — close!",
          hint: 'Taking $\\ln$ of both sides "brings down" the exponent: $\\ln(e^{0.06t}) = 0.06t$. Then divide by 0.06.',
        },
      ],
      conclusion:
        "Doubling time for continuous growth at rate $r$ is always $t = \\ln 2 / r$. The Rule of 72 ($\\approx 72/r\\%$) is a quick mental estimate.",
    },
  ],

  challenges: [
    {
      id: "ch4-001-ch1",
      difficulty: "medium",
      problem:
        "\\text{An account compounds quarterly at 5\\%. How long until \\$3000 grows to \\$5000?}",
      hint: "Set up the compound interest formula, divide both sides by $P$, then take the logarithm of both sides.",
      walkthrough: [
        {
          expression:
            "5000 = 3000\\left(1 + \\frac{0.05}{4}\\right)^{4t} \\Rightarrow \\frac{5}{3} = (1.0125)^{4t}",
          annotation: "Set up and simplify.",
        },
        {
          expression:
            "\\ln\\frac{5}{3} = 4t \\ln(1.0125) \\Rightarrow t = \\frac{\\ln(5/3)}{4\\ln(1.0125)} \\approx \\frac{0.5108}{4(0.01242)} \\approx 10.28 \\text{ years}",
          annotation:
            "Take ln of both sides, use log power rule, solve for $t$.",
        },
      ],
      answer: "t \\approx 10.28 \\text{ years}",
    },
    {
      id: "ch4-001-ch2",
      difficulty: "hard",
      problem:
        "\\text{Show that if a quantity grows continuously at rate } r\\text{, it increases by } (e^r - 1) \\times 100\\% \\text{ per year. What is the effective annual rate for 5\\% continuous compounding?}",
      hint: "Compare $A = Pe^{r \\cdot 1}$ to $A = P(1 + r_{\\text{eff}})$ for $t = 1$ year.",
      walkthrough: [
        {
          expression:
            "Pe^r = P(1 + r_{\\text{eff}}) \\Rightarrow r_{\\text{eff}} = e^r - 1",
          annotation:
            "Equate one year of continuous and annual growth. Solve for the effective rate.",
        },
        {
          expression:
            "r = 0.05: \\; r_{\\text{eff}} = e^{0.05} - 1 \\approx 1.05127 - 1 = 0.05127 = 5.127\\%",
          annotation:
            "The effective annual rate is 5.127% — slightly higher than the stated 5% continuous rate.",
        },
      ],
      answer:
        "r_{\\text{eff}} = e^r - 1 \\approx 5.127\\% \\text{ for } r=5\\%",
    },
  ],

  discovery: {
    title: "Why Continuous Compounding Is the Limit of Discrete Compounding",
    persona:
      'I\'m a financial analyst in 1683, working for the Bank of England. My job is to calculate compound interest for loans and investments. I know how to compound annually, monthly, or even daily. But I keep hearing whispers of "continuous compounding" — interest that compounds every instant. Is this even possible? And if so, what would it look like?',
    steps: [
      {
        phase: "need",
        title: "Annual compounding: the baseline",
        content: `I start with £1000 at 5% annual interest. Compounded annually means interest is added once per year:

$$A = 1000(1 + 0.05)^t = 1000(1.05)^t$$

After 1 year: £1050.00
After 2 years: £1102.50
After 10 years: £1628.89

This is straightforward. But what if I compound more frequently?`,
      },
      {
        phase: "need",
        title: "Monthly compounding: more frequent, more money",
        content: `Now I compound monthly. The annual rate of 5% becomes a monthly rate of 5%/12 ≈ 0.4167%. Interest is added 12 times per year:

$$A = 1000\\left(1 + \\frac{0.05}{12}\\right)^{12t} = 1000(1.004167)^{12t}$$

After 1 year: £1051.16
After 2 years: £1104.54
After 10 years: £1630.47

More money than annual compounding! The more frequently I compound, the more money I get. But how far can this go?`,
      },
      {
        phase: "need",
        title: "Daily compounding: even more frequent",
        content: `What if I compound daily? 365 times per year:

$$A = 1000\\left(1 + \\frac{0.05}{365}\\right)^{365t}$$

After 1 year: £1051.27
After 2 years: £1104.71
After 10 years: £1630.61

Still more money. But I can go further. What about hourly compounding? Or by the minute? Or by the second?

The pattern is clear: **more frequent compounding = more money**. But there must be a limit. What happens if I compound infinitely often — continuously?`,
      },
      {
        phase: "discovery",
        title: "Simplify: set the rate to 100% for 1 year",
        content: `The compound interest formula is:

$$A = P\\left(1 + \\frac{r}{n}\\right)^{nt}$$

where n is the number of compounding periods per year.

The algebra gets easier if I set P = 1, r = 1 (100%), and t = 1 (one year). Then:

$$A = \\left(1 + \\frac{1}{n}\\right)^n$$

This is the amount after 1 year when £1 grows at 100%, compounded n times per year. Much simpler!

**Now the real question: what happens as n gets infinitely large?**

I don't know the answer yet. So let me compute it for actual values of n and see if I can spot a pattern.`,
      },
      {
        phase: "discovery",
        title: "Build the table: compute (1 + 1/n)^n for increasing n",
        content: `Let me calculate the expression $(1 + \\frac{1}{n})^n$ for larger and larger values of n:

| n | 1 + 1/n | (1 + 1/n)^n |
|---|---|---|
| 1 | 2 | 2.0 |
| 2 | 1.5 | 2.25 |
| 4 | 1.25 | 2.441406 |
| 10 | 1.1 | 2.593742 |
| 100 | 1.01 | 2.704814 |
| 1,000 | 1.001 | 2.716924 |
| 10,000 | 1.0001 | 2.718146 |
| 100,000 | 1.00001 | 2.718268 |
| 1,000,000 | 1.000001 | 2.718281 |

**The values are converging!** They're oscillating around some number between 2.71 and 2.72.

Each time I increase n by 10×, the new digits stabilize:
- After n = 100: **2.70**...
- After n = 1,000: **2.71**...
- After n = 10,000: **2.7181**...
- After n = 1,000,000: **2.718281**...

The convergence is slow, but unmistakable. As n → ∞, this expression is approaching some fixed number.`,
      },
      {
        phase: "discovery",
        title: "Discover what the limit must be",
        content: `I've computed $(1 + \\frac{1}{n})^n$ for larger and larger n, and the values keep getting closer to the same number.

Since the values are converging (not jumping around, not oscillating wildly, not growing without bound), they must converge to **some limit**.

Let me call this limit by a name. Mathematicians have agreed to call this special number **e**, after Euler:

$$\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e$$

From my calculations, I can estimate: **e ≈ 2.71828...**

This is not a rational number (not a fraction of integers). In fact, e is **irrational** — its decimal expansion goes on forever without repeating. It's like π or √2.

**Why is this number important?** Because it appears naturally in any process of continuous growth. I'm about to see how.`,
      },
      {
        phase: "discovery",
        title: "Use the limit to find continuous compounding",
        content: `I started with:

$$A = P\\left(1 + \\frac{r}{n}\\right)^{nt}$$

I want to find the limit as n → ∞. Let me make a substitution to connect this to my newly discovered limit.

Let $m = \\frac{n}{r}$, so $n = mr$. Then:

$$\\left(1 + \\frac{r}{n}\\right)^{nt} = \\left(1 + \\frac{r}{mr}\\right)^{mr \\cdot t} = \\left(1 + \\frac{1}{m}\\right)^{mrt}$$

I can rewrite this as:

$$\\left(1 + \\frac{1}{m}\\right)^{mrt} = \\left[ \\left(1 + \\frac{1}{m}\\right)^m \\right]^{rt}$$

Now, as n → ∞, what happens to m? Since $m = \\frac{n}{r}$ and n → ∞, we have m → ∞.

But I know what happens when m → ∞:

$$\\lim_{m \\to \\infty} \\left(1 + \\frac{1}{m}\\right)^m = e$$

Therefore:

$$\\lim_{n \\to \\infty} \\left[ \\left(1 + \\frac{1}{m}\\right)^m \\right]^{rt} = e^{rt}$$

**The result:** when compounding becomes infinitely frequent, the compound interest formula becomes:

$$A = P e^{rt}$$

This is the limit. This is continuous compounding.`,
      },
      {
        phase: "discovery",
        title: "Test it: does the formula work?",
        content: `Let me verify with my data. £1000 at 5% for 1 year, continuously compounded:

$$A = 1000 \\cdot e^{0.05 \\cdot 1} = 1000 \\cdot e^{0.05}$$

I need to compute $e^{0.05}$. Using e ≈ 2.718281:

$$e^{0.05} \\approx 1.051271$$

So:

$$A \\approx 1000 \\times 1.051271 = £1051.27$$

Compare to my earlier calculations:
- Annual (n=1): £1050.00
- Monthly (n=12): £1051.16
- Daily (n=365): £1051.27
- Continuous (n→∞): £1051.27

The continuous amount exactly matches daily compounding! The formula works. 

**What's the intuition?** As I compound more frequently, the total grows. But each step of growth gives smaller increments (because each short period has smaller interest). The limit — the point where the process becomes perfectly smooth — is this exponential formula with base e.`,
      },
      {
        phase: "formalization",
        title: "Define e formally: the limit we discovered",
        content: `What I've discovered is a fundamental mathematical constant. Here is the formal definition:

**Euler's number (e)** is defined as:

$$e = \\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n$$

This limit can also be written equivalently as:

$$e = \\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^{n+1}$$

or

$$e = \\lim_{x \\to 0} (1 + x)^{1/x}$$

All three definitions converge to the same value:

$$e \\approx 2.718281828459...$$

**Key properties of e:**
- e is **irrational** — its decimal expansion never repeats
- e is **transcendental** — it's not the root of any polynomial with integer coefficients (like π)
- e is the base of the natural logarithm
- e is uniquely the base where the exponential function equals its own derivative

The number e is named after **Leonhard Euler**, an 18th-century mathematician. But it first appeared in banking calculations — exactly where we found it.`,
      },
      {
        phase: "formalization",
        title: "State the continuous compounding formula",
        content: `From the limit $\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e$, I derived:

**Continuous Compounding Formula:**

$$A = P e^{rt}$$

Where:
- P = principal (initial amount)
- r = annual interest rate (as a decimal, e.g., 0.05 for 5%)
- t = time in years
- e ≈ 2.71828...
- A = amount after time t

**Why this is the limit of discrete compounding:**

For any number of compounding periods per year n:

$$A_n = P\\left(1 + \\frac{r}{n}\\right)^{nt}$$

As n increases, $A_n$ grows monotonically and approaches $Pe^{rt}$ from below:

$$\\lim_{n \\to \\infty} P\\left(1 + \\frac{r}{n}\\right)^{nt} = P e^{rt}$$

Continuous compounding gives the maximum possible return for a given interest rate.`,
      },
      {
        phase: "formalization",
        title: "Connect back to the original discovery",
        content: `We started with a simple question: "What's the maximum amount I can earn if interest compounds infinitely often?"

The answer required discovering a new mathematical constant. That constant, e, appears because:

$$\\text{e is the unique value such that} \\quad \\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e$$

This isn't arbitrary. This limit emerges naturally whenever:
- A quantity grows continuously at a constant rate
- A small percentage is applied repeatedly over many intervals
- A smooth process is modeled as the limit of discrete steps

**The lesson:** Continuous processes in mathematics converge to exponential functions with base e. This is why e appears everywhere — in finance, physics, biology, and statistics. It's the mathematical heart of continuous change.`,
      },
    ],
    resolution: `**The discovery: e emerges from continuous compounding**

Starting from compound interest, we discovered that:

$$\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e \\approx 2.718281...$$

**The four-step process:**

1. **Simplify:** Set P = 1, r = 1, t = 1 to get $(1 + 1/n)^n$
2. **Compute numerically:** Build a table for n = 1, 2, 10, 100, 1000, 1,000,000, ...
3. **Observe convergence:** The values stabilize around 2.71828...
4. **Name the limit:** Call it e — Euler's number

**The payoff: continuous compounding formula**

$$A = P e^{rt}$$

This is *not* an arbitrary formula. It's the mathematical expression of the limit we discovered.

**Why this matters:** e appears when continuous growth emerges as the limit of discrete compounding. This same phenomenon appears in population dynamics (births per generation), radioactive decay (decays per unit time), and heat flow (temperature change per moment).

The constant e is universal because it captures the mathematical essence of continuous change.`,
  },

  story: {
    title: "The Exponential Explosion",
    subtitle:
      "How a simple question about compound interest led to the most important number in mathematics",
    acts: [
      {
        label: "Act I",
        title: "The Banker's Dilemma",
        content: `It's 1683 in London. Edward Lloyd's coffee house on Lombard Street has become the unofficial center of England's financial world. Merchants, ship captains, and bankers gather here to discuss trade, insurance, and loans.

You are a young banker named Jacob. Your job is simple: calculate compound interest on loans. A merchant borrows £1000 at 5% annual interest. How much does he owe after 1 year?

The formula is straightforward: £1000 × 1.05 = £1050.

But the merchant asks: "What if interest is compounded monthly?" Now you must calculate: £1000 × (1 + 0.05/12)^12 ≈ £1051.16

The merchant smiles. "And what about daily compounding?" £1000 × (1 + 0.05/365)^365 ≈ £1051.27

You see the pattern. More frequent compounding means more money. But how far can this go? What if interest compounded every hour? Every minute? Every second?

You ask yourself: what is the limit as compounding becomes infinitely frequent? Is there a maximum amount of money this loan can generate?`,
      },
      {
        label: "Act II",
        title: "The Mathematician's Quest",
        content: `Word of your question spreads. It reaches the ears of Edmund Halley — the astronomer who will later calculate the orbit of Halley's Comet. Halley brings it to his friend Isaac Newton.

Newton, working on his Principia Mathematica, recognizes this as a problem of limits. He knows that:

$$\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n$$

exists. He calls this limit "e" — the first letter of "exponential."

But your banking problem is more complex. You have:

$$\\lim_{n \\to \\infty} \\left(1 + \\frac{r}{n}\\right)^{nt}$$

Newton shows you how to solve this. Let m = n/r. Then:

$$\\left(1 + \\frac{r}{n}\\right)^{nt} = \\left(1 + \\frac{1}{m}\\right)^{r \\cdot m \\cdot t}$$

As n → ∞, m → ∞. So:

$$\\lim_{m \\to \\infty} \\left(1 + \\frac{1}{m}\\right)^{r m t} = \\left[ \\lim_{m \\to \\infty} \\left(1 + \\frac{1}{m}\\right)^m \\right]^{rt} = e^{rt}$$

Your continuous compounding formula is: A = P e^(rt)

The number e, born from compound interest, will become the most important constant in mathematics.`,
      },
      {
        label: "Act III",
        title: "The Universal Constant",
        content: `Over the next century, e appears everywhere:

**Finance:** Continuous compounding A = Pe^(rt)

**Physics:** Radioactive decay N = N₀e^(-λt)

**Biology:** Population growth P = P₀e^(kt)

**Engineering:** Capacitor discharge V = V₀e^(-t/RC)

**Statistics:** Normal distribution f(x) = (1/√(2πσ²))e^(-x²/(2σ²))

What connects all these? They all describe continuous change — quantities that grow or decay at a rate proportional to their current value.

Your simple banking question revealed the fundamental pattern of the universe: exponential change. And e is its mathematical language.

The number you discovered in 1683 London will be engraved on Euler's tombstone 100 years later, alongside the most famous equation in mathematics:

e^(iπ) + 1 = 0`,
      },
      {
        label: "Act IV",
        title: "The Modern Lesson",
        content: `Today, we take e for granted. But remember: it emerged from a practical problem in finance.

When you see e in an equation, think of continuous compounding. Think of interest being added at every infinitesimal instant. Think of the limit of discrete processes becoming smooth.

e is not just a number — it's the bridge between the discrete and the continuous, between counting and measuring, between algebra and calculus.

Your question about compound interest didn't just change banking. It changed mathematics forever.`,
      },
      {
        label: "Act V",
        title: "The Exponential Mindset",
        content: `Exponential thinking is counterintuitive. We evolved to think linearly — if something grows by 10 units each year, we expect steady, predictable increase.

But exponential growth starts slow, then explodes. A penny doubled every day becomes $10 million in a month. A virus with R₀ = 2.5 spreads slowly at first, then overwhelms hospitals.

The same mathematics that governs compound interest governs pandemics, climate change, and technological progress.

When you see exponential functions, remember: they model the world where "the rate of change is proportional to the current value." This simple rule generates the most powerful patterns in nature.

Your banking calculation revealed this universal truth. The exponential function isn't just about money — it's about how the world changes.`,
      },
    ],
    resolution: `**The story of e began with compound interest:**

- **1683:** A banker asks: "What's the limit of more frequent compounding?"
- **Mathematics:** The limit is P e^(rt) — continuous compounding
- **Discovery:** e emerges as the natural base for exponential functions
- **Legacy:** e appears in finance, physics, biology, statistics — everywhere continuous change occurs

**The exponential mindset:** When you see e in an equation, think of continuous compounding. Think of the limit where discrete becomes continuous. Think of how small changes, applied frequently, create enormous effects.

**Your question changed the world:** What started as a banking calculation became the foundation of modern mathematics and science.`,
  },

  calcBridge: {
    teaser:
      "The function $f(x) = e^x$ is its own derivative: $\\frac{d}{dx}e^x = e^x$. This makes it the central function of differential equations — any equation of the form $y' = ky$ has solution $y = Ce^{kx}$. The compound interest formula $A = Pe^{rt}$ is the solution to the differential equation $\\frac{dA}{dt} = rA$ (growth proportional to amount). Every continuous growth/decay problem in calculus is this equation.",
    linkedLessons: ["logarithms-intro", "solving-exponential-log"],
  },

  crossRefs: [
    {
      slug: "logarithms-intro",
      reason:
        "Logarithms are the inverse operation of exponentiation — needed to solve any equation where the unknown is in the exponent.",
    },
    {
      slug: "log-properties",
      reason:
        "Log properties let you manipulate and simplify exponential expressions and equations.",
    },
    {
      slug: "solving-exponential-log",
      reason:
        "The solving techniques in that lesson all start from the exponential model introduced here.",
    },
    {
      slug: "exponential-applications",
      reason:
        "Real-world exponential models (growth, decay, finance) all use $A = A_0 e^{kt}$ built on this foundation.",
    },
  ],

  checkpoints: [
    "Can you explain why $b = 1$ is excluded as a valid base for an exponential function?",
    "Given $f(x) = 3 \\cdot 2^{x-1} - 5$, what is the horizontal asymptote and range?",
    "Why does $f(x) = b^x$ always pass through $(0, 1)$, regardless of the base?",
    "What is the difference between compounding monthly and compounding continuously, and which gives more money?",
    "State the Rule of 72 and use it to estimate how long it takes $\\$1000$ to double at 8% annual rate.",
  ],

  semantics: {
    symbols: [
      {
        symbol: "b",
        meaning:
          "The base of the exponential — a positive constant not equal to 1; controls growth (b > 1) or decay (0 < b < 1)",
      },
      {
        symbol: "e",
        meaning:
          "Euler's number ≈ 2.71828; the natural base; defined as lim(1+1/n)^n as n→∞",
      },
      {
        symbol: "A = Pe^{rt}",
        meaning:
          "Continuous compound interest formula: P = principal, r = annual rate, t = years",
      },
      {
        symbol: "T_d = \\ln 2 / r",
        meaning: "Doubling time for continuous growth at rate r",
      },
      {
        symbol: "T_h = \\ln 2 / |k|",
        meaning: "Half-life for continuous decay with rate constant k < 0",
      },
    ],
    rulesOfThumb: [
      "Base > 1 means growth; 0 < base < 1 means decay.",
      "Every exponential passes through (0, 1) because b^0 = 1.",
      "The horizontal asymptote is y = k (the vertical shift).",
      "To solve for time in exponential growth/decay, take ln of both sides.",
      "Rule of 72: doubling time ≈ 72 ÷ (interest rate as a percent).",
    ],
  },

  spiral: {
    recoveryPoints: [
      {
        topic: "Exponent rules",
        where: "Algebra review",
        why: "All exponential properties rest on the laws a^m · a^n = a^(m+n), (a^m)^n = a^(mn), etc.",
      },
      {
        topic: "Function transformations",
        where: "Precalc-1: Functions",
        why: "The template f(x) = a·b^(x-h)+k uses the same transformation framework as all function families.",
      },
    ],
    futureLinks: [
      {
        topic: "Derivative of e^x",
        where: "Calc 1: Derivatives",
        why: "d/dx[e^x] = e^x — the self-derivative property introduced here becomes the cornerstone of differential calculus.",
      },
      {
        topic: "Separable differential equations",
        where: "Calc 2: ODEs",
        why: "Every equation of the form dy/dt = ky has solution y = Ce^(kt), which is the exponential model from this lesson.",
      },
    ],
  },

  assessment: [
    {
      question: "Evaluate $f(3)$ for $f(x) = 2 \\cdot 5^x$.",
      answer: "250",
      difficulty: "quick-fire",
    },
    {
      question: "What is the horizontal asymptote of $g(x) = 4^x - 7$?",
      answer: "y = -7",
      difficulty: "quick-fire",
    },
    {
      question:
        "$\\$2000$ is invested at 3% compounded continuously. What is the amount after 5 years?",
      answer: "2000e^{0.15} \\approx \\$2323.37",
      difficulty: "quick-fire",
    },
  ],

  mentalModel: [
    "Exponential = variable in the exponent; power function = variable in the base. One difference, completely different behavior.",
    "Base > 1 means multiply by b each step: growth accelerates without bound.",
    "Base between 0 and 1 means multiply by a fraction each step: decay approaches zero but never reaches it.",
    "The horizontal asymptote is the value the function approaches but never crosses.",
    "e^(rt) is the universal language of continuous change — the same formula governs money, populations, radioactivity, and heat.",
  ],

  quiz: [
    {
      id: "q1",
      type: "choice",
      text: "Which of the following is an exponential function?",
      options: ["f(x) = x^3", "f(x) = 3^x", "f(x) = 3x", "f(x) = x^x"],
      answer: "f(x) = 3^x",
      hints: [
        "Look for a function where the variable is in the exponent and the base is a constant.",
        "x^x has variable in both base and exponent — that is not a standard exponential function.",
      ],
      reviewSection: "Intuition tab — growth vs decay",
    },
    {
      id: "q2",
      type: "choice",
      text: "For $f(x) = b^x$, which condition on $b$ guarantees exponential growth (not decay)?",
      options: ["b > 0", "b > 1", "0 < b < 1", "b ≠ 1"],
      answer: "b > 1",
      hints: [
        "When b > 1, multiplying by b repeatedly gives larger and larger values.",
        "When 0 < b < 1, multiplying by b repeatedly gives smaller and smaller values.",
      ],
      reviewSection: "Intuition tab — growth vs decay",
    },
    {
      id: "q3",
      type: "choice",
      text: "Every exponential function $f(x) = b^x$ passes through which point?",
      options: ["(1, 0)", "(0, 1)", "(1, b)", "(0, b)"],
      answer: "(0, 1)",
      hints: [
        "Evaluate f(0): any base raised to the power 0 equals 1.",
        "b^0 = 1 for any valid b, so f(0) = 1 always.",
      ],
      reviewSection: "Intuition tab — growth vs decay",
    },
    {
      id: "q4",
      type: "choice",
      text: "What is the horizontal asymptote of $f(x) = 2^x + 5$?",
      options: ["y = 0", "y = 2", "y = 5", "y = -5"],
      answer: "y = 5",
      hints: [
        "The +5 shifts the entire graph up by 5, including the asymptote.",
        "The base asymptote of b^x is y = 0. The vertical shift k moves it to y = k.",
      ],
      reviewSection: "Math tab — general exponential transformation",
    },
    {
      id: "q5",
      type: "choice",
      text: "In $f(x) = 3 \\cdot 2^{x-4} + 1$, what is the value of $h$?",
      options: ["h = -4", "h = 4", "h = 3", "h = 1"],
      answer: "h = 4",
      hints: [
        "Match to the template f(x) = a · b^(x-h) + k. The expression in the exponent is x - h.",
        "x - 4 matches x - h when h = 4 (not -4).",
      ],
      reviewSection: "Math tab — general exponential transformation",
    },
    {
      id: "q6",
      type: "choice",
      text: "$\\$1000$ is invested at 6% compounded continuously. After 10 years the amount is closest to:",
      options: ["$1600", "$1791", "$1822", "$2000"],
      answer: "$1822",
      hints: [
        "Use A = Pe^(rt) with P = 1000, r = 0.06, t = 10.",
        "Compute e^(0.6) ≈ 1.8221, then multiply by 1000.",
      ],
      reviewSection: "Math tab — compound interest formulas",
    },
    {
      id: "q7",
      type: "choice",
      text: "The doubling time for a continuously growing quantity at rate $r$ is:",
      options: ["t = r / ln 2", "t = ln 2 / r", "t = 2 / r", "t = ln r / 2"],
      answer: "t = ln 2 / r",
      hints: [
        "Set 2A₀ = A₀e^(rt), cancel A₀ to get 2 = e^(rt), then take ln.",
        "ln(2) = rt gives t = ln(2)/r.",
      ],
      reviewSection: "Math tab — doubling time and half-life",
    },
    {
      id: "q8",
      type: "choice",
      text: "For $f(x) = -3 \\cdot 4^x + 2$, what is the range?",
      options: ["(2, ∞)", "(-∞, ∞)", "(-∞, 2)", "(0, ∞)"],
      answer: "(-∞, 2)",
      hints: [
        "The a = -3 < 0 reflects the graph. The k = 2 sets the asymptote at y = 2.",
        "With reflection (a < 0), the function goes downward from the asymptote, giving range (-∞, k).",
      ],
      reviewSection: "Intuition tab — growth vs decay",
    },
    {
      id: "q9",
      type: "choice",
      text: "Which expression represents the effective annual rate for continuous compounding at rate $r$?",
      options: ["r", "e^r", "e^r - 1", "e^r + 1"],
      answer: "e^r - 1",
      hints: [
        "Compare A = Pe^r (continuous for 1 year) to A = P(1 + r_eff). Solve for r_eff.",
        "Pe^r = P(1 + r_eff) gives r_eff = e^r - 1.",
      ],
      reviewSection: "Examples tab — compound interest",
    },
    {
      id: "q10",
      type: "choice",
      text: "Using the Rule of 72, approximately how many years does it take money to double at 9% annual interest?",
      options: ["6 years", "8 years", "9 years", "12 years"],
      answer: "8 years",
      hints: [
        "Rule of 72: doubling time ≈ 72 ÷ (rate as a percent).",
        "72 ÷ 9 = 8 years.",
      ],
      reviewSection: "Math tab — doubling time and half-life",
    },
  ],
};
