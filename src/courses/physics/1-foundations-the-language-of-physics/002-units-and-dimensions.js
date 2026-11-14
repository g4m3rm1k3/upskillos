export default {
  id: 'p0-002',
  slug: 'units-and-dimensions',
  chapter: 'p0',
  order: 1,
  title: 'Units and Dimensions',
  subtitle: 'The grammar of physics equations — why 9.8 without "m/s²" is meaningless, and how units expose algebra errors.',
  tags: ['SI units', 'dimensions', 'dimensional analysis', 'unit conversion', 'significant figures', 'meters', 'kilograms', 'seconds'],

  hook: {
    question:
      `In 1999, NASA lost the Mars Climate Orbiter a 327 million spacecraft — because one engineering team reported thruster force in pound-force seconds, and another team's software expected newton-seconds. Nobody caught it. The spacecraft entered the Martian atmosphere at the wrong angle and burned up. A $327 million mistake caused by a unit mismatch. How does something this simple destroy a spacecraft — and how do you make sure it never happens to you?`,
    realWorldContext:
      `Units are not administrative overhead. They are physical reality encoded in mathematics. Every number in physics is incomplete without a unit — "9.8" means nothing; "9.8 m/s²" is a specific claim about the universe. Dimensional analysis — tracking units through every calculation — is the single fastest way to find algebra errors, check whether an equation could possibly be right, and convert between measurement systems. Engineers, physicists, chemists, and pharmacists all use it daily. You will use it in every chapter of this course.`,
    previewVisualizationId: 'SVGDiagram',
    previewVisualizationProps: { type: 'dimensions-equation' },
  },

  intuition: {
    prose: [
      `**Every number in physics has a physical type — its dimension.** The dimension of a quantity tells you *what kind of thing it is*: a length, a time, a mass, a speed. The unit tells you *how big your measuring stick is*: meters vs feet, seconds vs hours. You can change units freely — 1 meter = 100 centimeters — but you cannot change dimension: a length is always a length, never a time. When an equation adds a length to a time, something has gone catastrophically wrong.`,

      `**The SI system — the universal language of physics.** The International System of Units (SI) defines seven base units from which every other unit is built. In mechanics, you need exactly three: the **meter** [m] for length, the **kilogram** [kg] for mass, and the **second** [s] for time. Every mechanics quantity — velocity, force, energy, pressure — is a combination of these three. Velocity: [m/s]. Acceleration: [m/s²]. Force: [kg·m/s²] (which we call a Newton). Energy: [kg·m²/s²] (which we call a Joule). Learning these combinations is not memorization — it is understanding what the quantity *is*.`,

      `**Dimensional analysis: the most powerful error-checking tool in physics.** Here is the central rule: **both sides of every equation must have the same dimension**. If the left side is a length [m] and the right side comes out to [m/s], the equation is wrong — period. No amount of numerical cleverness can fix a dimensional mismatch. This means you can check any equation you derive, without knowing the answer, just by tracking units. It is a complete, automatic error-detector.`,

      `**Unit conversion: multiply by 1, cleverly.** Converting between units is just multiplication by a cleverly written "1". 1 minute = 60 seconds, so (1 min / 60 s) = 1. Multiply any quantity by this fraction and you change the label without changing the physical value. 60 km/h × (1000 m / 1 km) × (1 h / 3600 s) = 16.67 m/s. Every unit except the one you want cancels — like factors in algebra. Set it up so the unit you are removing appears in the denominator of the conversion factor, and the unit you want appears in the numerator. Then cancel.`,

      `**Order of magnitude: knowing when to care about precision.** Not all problems need 6 decimal places. A rough estimate within a factor of 10 is often enough to check feasibility, catch blunders, or choose a method. The mass of a car is "about 1,000 kg" — whether it is 980 kg or 1,100 kg rarely matters in a first calculation. This is called an **order of magnitude** estimate. Galileo, Fermi, and Einstein all used them constantly. A physicist who insists on 5 significant figures for a rough estimate wastes time; one who ignores units entirely destroys spacecraft.`,
    ],
    callouts: [
      {
        type: 'sequencing',
        title: 'Lesson 2 of 8 — Chapter 0: Orientation',
        body:
          `**Previous (Lesson 1):** What physics is — the model-building cycle, Galileo, free fall.\\n**This lesson:** Units, dimensions, SI system, dimensional analysis, conversion.\\n**Next (Lesson 3):** Variables and functions — what x(t) really means.\\n**Why it matters:** Every equation in every future lesson carries units. Catch errors here.`,
      },
      {
        type: 'definition',
        title: 'The three SI base units of mechanics',
        body:
          `\\text{Length: meter [m] — distance from one point to another}\\\\\\text{Mass: kilogram [kg] — amount of matter}\\\\\\text{Time: second [s] — duration of an interval}\\\\\\text{Everything else is built from these three.}`,
      },
      {
        type: 'definition',
        title: 'Dimension vs Unit',
        body:
          `\\text{Dimension = the physical type of a quantity (length, mass, time, ...)}\\\\\\text{Unit = the scale used to measure it (m, cm, ft, km, ...)}\\\\\\text{Example: velocity has dimension [L/T]; unit is m/s or km/h.}`,
      },
      {
        type: 'theorem',
        title: 'Principle of Dimensional Homogeneity',
        body:
          `\\text{Every term in a valid physics equation must have the same dimension.}\\\\\\text{You can only add or subtract quantities of the same dimension.}\\\\\\text{If dimensions don't match, the equation is wrong.}`,
      },
      {
        type: 'insight',
        title: 'Derived units — combinations of base units',
        body:
          `\\text{Velocity: [m/s] = [L T}^{-1}\\text{]}\\\\\\text{Acceleration: [m/s}^2\\text{] = [L T}^{-2}\\text{]}\\\\\\text{Force (Newton): [kg·m/s}^2\\text{] = [M L T}^{-2}\\text{]}\\\\\\text{Energy (Joule): [kg·m}^2\\text{/s}^2\\text{] = [M L}^2 \\text{ T}^{-2}\\text{]}`,
      },
      {
        type: 'warning',
        title: 'The NASA Mars Orbiter lesson',
        body:
          `Never mix unit systems within a calculation. Always label every number with its unit. If a number arrives from outside your calculation (from a table, another engineer, a sensor), verify its unit explicitly before using it.`,
      },
    ],
    visualizations: [
      {
        id: 'UnitValidator',
        title: 'Build a dimensionally valid equation — click to compose',
        mathBridge:
          'Choose a target dimension on the left (e.g. [L] for length). Then click dimension tokens on the right to build the right-hand side. The checker tells you whether your combination is physically valid. Try: [L] = [L]/[T] × [T] — that is displacement = velocity × time. Try: [L] = [L] alone. Try adding [M] to [L] — notice that\'s rejected. You cannot add apples to oranges, and you cannot add meters to kilograms.',
        caption: 'Dimensional analysis is the first sanity check on every physics equation.',
      },
      {
        id: 'SVGDiagram',
        props: { type: 'dimensions-equation' },
        title: 'Dimensional check of the SUVAT equations',
        mathBridge:
          `Before reading the diagram, pick one SUVAT term — say "½at²" — and ask: what dimension is it? a has dimension [L/T²] and t² has dimension [T²], so a×t² has dimension [L]. The diagram shows every term being checked this way. Notice: every single term has dimension [L] (length). They can all be added together — the equation is dimensionally valid.`,
        caption: 'Every term in Δx = v₀t + ½at² has dimension [m] — the equation passes the dimensional test.',
      },
      {
        id: 'PythonNotebook',
        title: 'Unit conversion with Python — and catching errors with dimensional analysis',
        mathBridge:
          `Run each cell. Stage 1 shows how unit conversion is just multiplication by 1. Stage 2 shows how to track units through a calculation. Stage 3 shows a deliberate unit error — observe how the result makes no physical sense.`,
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Stage 1 — Unit Conversion (multiply by 1)',
              prose: `Converting between units means multiplying by a fraction equal to 1. The value doesn't change; the label does.`,
              instructions: 'Run. Then change speed_kmh to other values.',
              code: [
                '# Converting km/h to m/s',
                'speed_kmh = 100  # km/h',
                '',
                '# Multiply by (1000 m / 1 km) and (1 h / 3600 s)',
                'speed_ms = speed_kmh * (1000 / 1) * (1 / 3600)',
                '',
                'print(f"{speed_kmh} km/h = {speed_ms:.4f} m/s")',
                'print(f"Check: 100 km/h ≈ 27.78 m/s ✓")',
                '',
                '# A useful fact: 1 m/s = 3.6 km/h',
                'print(f"\\nConversion factor: 1 m/s = {1*3600/1000:.1f} km/h")',
              ].join('\n'),
              output: '',
              status: 'idle',
            },
            {
              id: 2,
              cellTitle: 'Stage 2 — Track Units Through a Calculation',
              prose: `Use x = ½at². Track the units at every step to confirm the result is in meters.`,
              instructions: 'Run. Change a and t to see how units automatically validate the equation.',
              code: [
                '# x = ½ a t²',
                'a = 9.8   # m/s²',
                't = 3.0   # s',
                '',
                '# Step by step with units',
                't_squared = t**2         # s²',
                'a_times_t2 = a * t_squared  # (m/s²) × s² = m',
                'x = 0.5 * a_times_t2     # m',
                '',
                'print(f"t² = {t_squared} s²")',
                'print(f"a × t² = {a} m/s² × {t_squared} s² = {a_times_t2} m")',
                'print(f"x = ½ × {a_times_t2} m = {x} m")',
                'print(f"\\nUnits: (m/s²)(s²) = m ✓ — dimension [L]")',
              ].join('\n'),
              output: '',
              status: 'idle',
            },
            {
              id: 3,
              cellTitle: 'Stage 3 — Spotting a Unit Error',
              prose: `A unit error produces a result that looks like a number but means nothing. Let's see one.`,
              instructions: 'Run. The "distance" result is in kg·m/s — not meters. This is physically nonsense.',
              code: [
                '# WRONG: accidentally using F=ma result instead of acceleration',
                'mass = 5.0    # kg',
                'a = 9.8       # m/s²',
                't = 3.0       # s',
                '',
                '# A confused student uses F instead of a',
                'F = mass * a  # kg·m/s²  (this is a force, not acceleration!)',
                'wrong_distance = 0.5 * F * t**2',
                '',
                'print(f"F = {F} kg·m/s²")',
                'print(f"WRONG x = ½ × F × t² = {wrong_distance}")',
                'print(f"Units: (kg·m/s²)(s²) = kg·m  ← NOT meters!")',
                'print(f"\\nThe number looks fine. The units reveal the error.")',
                '',
                '# Correct version:',
                'correct_distance = 0.5 * a * t**2',
                'print(f"\\nCorrect x = ½ × a × t² = {correct_distance} m ✓")',
              ].join('\n'),
              output: '',
              status: 'idle',
            },
            {
              id: 11,
              challengeType: 'write',
              challengeNumber: 1,
              challengeTitle: 'Challenge — Convert 60 mph to m/s',
              difficulty: 'medium',
              prompt:
                `Convert 60 miles per hour to meters per second. Store the result in speed_ms. Use: 1 mile = 1609.34 m, 1 hour = 3600 s.`,
              instructions:
                `1. Start from 60 mph as a number.\n2. Multiply by (1609.34 m / 1 mile) to get m/h.\n3. Multiply by (1 h / 3600 s) to get m/s.`,
              code: [
                '# Convert 60 mph to m/s',
                'speed_mph = 60  # miles/hour',
                '',
                '# Your calculation here:',
                'speed_ms = ',
                '',
                'print(f"60 mph = {speed_ms:.4f} m/s")',
              ].join('\n'),
              output: '',
              status: 'idle',
              testCode: [
                'expected = 60 * 1609.34 / 3600',
                'if abs(speed_ms - expected) > 0.1:',
                '    raise ValueError(f"Expected ≈{expected:.4f} m/s, got {speed_ms}")',
                'res = f"SUCCESS: 60 mph = {speed_ms:.4f} m/s ≈ 26.82 m/s"',
                'res',
              ].join('\n'),
              hint: 'speed_ms = 60 * 1609.34 / 3600',
            },
          ],
        },
      },
    ],
  },

  math: {
    prose: [
      `**Dimensional analysis as algebra.** Dimensions behave exactly like algebraic variables: they multiply, divide, cancel. Write every unit as a fraction and cancel like terms. 60 km/h = 60 × (km/h). To convert: multiply by (1000 m / 1 km) and (1 h / 3600 s). km cancels with km; h cancels with h. Result: 60 × 1000/3600 m/s = 16.67 m/s.`,
      `**Checking a formula: does ½at² have dimension [m]?** Step 1: Write the dimensions. [a] = m/s² and [t²] = s². Step 2: Multiply. [a·t²] = (m/s²)(s²) = m·s²/s² = m. The s² cancels. Result: [½at²] = m. ✓ It has dimension length — exactly what we need for a displacement.`,
      `**Significant figures — how many digits are justified.** Every measurement has uncertainty. The number of *significant figures* (sig figs) encodes how precise the measurement is. 9.8 m/s² has 2 sig figs. 9.80 m/s² has 3. 9.800 m/s² has 4. When multiplying or dividing, the result can have no more sig figs than the least precise input. 9.8 × 3.0 = 29 (2 sig figs), not 29.4000. When adding or subtracting, align decimal places: 9.80 + 0.3 = 10.1 (limited by 0.3).`,
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'Unit conversion algorithm',
        body:
          `\\text{Multiply by } \\frac{\\text{(new unit)}}{\\text{(old unit)}} = 1 \\text{ so old unit cancels.}\\\\\\text{Example: } 100\\,\\frac{\\text{km}}{\\text{h}} \\times \\frac{1000\\,\\text{m}}{1\\,\\text{km}} \\times \\frac{1\\,\\text{h}}{3600\\,\\text{s}} = \\frac{100\\,000}{3600}\\,\\frac{\\text{m}}{\\text{s}} \\approx 27.8\\,\\text{m/s}`,
      },
      {
        type: 'insight',
        title: 'The dimension-check shortcut',
        body:
          `\\text{In } x = v_0 t + \\tfrac{1}{2}at^2:\\\\ {[v_0 t]} = \\frac{\\text{m}}{\\text{s}} \\cdot \\text{s} = \\text{m} \\quad\\checkmark\\\\ {[\\tfrac{1}{2}at^2]} = \\frac{\\text{m}}{\\text{s}^2} \\cdot \\text{s}^2 = \\text{m} \\quad\\checkmark\\\\\\text{Both terms are [m] — they can be added. The equation is dimensionally valid.}`,
      },
      {
        type: 'definition',
        title: 'Significant figures rules',
        body:
          `\\text{× or ÷: answer has as many sig figs as the input with the fewest.}\\\\\\text{+ or −: answer has the same decimal place as the least precise input.}\\\\\\text{Exact numbers (like the "2" in } \\tfrac{1}{2}at^2\\text{) have unlimited sig figs.}`,
      },
      {
        type: 'mnemonic',
        title: 'SI prefixes to know cold',
        body:
          `\\text{kilo- (k): } \\times 10^3 \\quad \\text{mega- (M): } \\times 10^6 \\quad \\text{giga- (G): } \\times 10^9\\\\\\text{centi- (c): } \\times 10^{-2} \\quad \\text{milli- (m): } \\times 10^{-3} \\quad \\text{micro- (μ): } \\times 10^{-6}`,
      },
    ],
    visualizations: [
      {
        id: 'SVGDiagram',
        props: { type: 'unit-conversion-chain' },
        title: 'Unit conversion chain — km/h to m/s step by step',
        mathBridge:
          'Follow the chain: start with 100 km/h. Multiply by the first fraction (1000 m / 1 km) — km cancels km, leaving 100,000 m/h. Multiply by the second fraction (1 h / 3600 s) — h cancels h, leaving 27.78 m/s. At each step only one unit changes. This is the "multiply by 1" algorithm — the physical speed never changes, only its label.',
        caption: 'Unit conversion = multiplying by fractions equal to 1 until the unwanted unit cancels.',
      },
      {
        id: 'SVGDiagram',
        props: { type: 'sig-figs-rules' },
        title: 'Significant figures — when digits are meaningful',
        mathBridge:
          'The top row shows multiplication: 9.8 × 3.147 = 30.8406, but since 9.8 has only 2 sig figs the answer rounds to 31 (2 sig figs). The bottom row shows addition: 9.80 + 0.3 = 10.1, limited by the least precise decimal place (0.3 has one decimal place). Notice: extra digits after the precision limit are not wrong, just meaningless — they claim certainty you do not have.',
        caption: 'Sig figs rule: × or ÷ → match fewest sig figs; + or − → match least precise decimal place.',
      },
    ],
  },

  rigor: {
    prose: [
      `**Dimensional analysis as a theorem-checker.** More formally: if $Q$ has dimension $[L^a M^b T^c]$, then any equation $Q = f(...)$ requires every term of $f$ to also have dimension $[L^a M^b T^c]$. This is a theorem — it follows from the requirement that physics laws be independent of the choice of unit scale. Changing from meters to feet multiplies every length by a constant $k$. For an equation to hold in both unit systems, every term must contain the same power of length — otherwise the equation breaks when you change units.`,
      `**The Buckingham Pi theorem — dimensional analysis for the serious.** Given a physical problem with $n$ variables and $k$ independent dimensions, you can form $n - k$ dimensionless groups (called $\\Pi$ groups). The physics of the problem can always be expressed as a relationship among these groups. This is used in fluid mechanics, heat transfer, and engineering design to predict behavior of full-scale systems from small-scale experiments.`,
    ],
    callouts: [
      {
        type: 'insight',
        title: 'Why dimensional analysis works — the deep reason',
        body:
          `\\text{Physics laws must be } \\textit{independent of the choice of unit system.}\\\\\\text{Switching from m to cm multiplies every [L] by 100.}\\\\\\text{For an equation to survive this, both sides must scale the same way.}\\\\\\text{This forces both sides to have the same dimension.}`,
      },
      {
        type: 'definition',
        title: 'Dimensionless numbers — when dimension disappears',
        body:
          `\\text{A pure number (like } \\pi \\text{, or a ratio of lengths) has no dimension.}\\\\\\text{Example: } \\theta \\text{ in radians = arc/radius = [m]/[m] = dimensionless.}\\\\\\text{Functions like } \\sin, \\cos, \\ln, e^x \\text{ only take dimensionless inputs.}\\\\\\text{Writing } \\sin(5\\text{ m}) \\text{ is meaningless — } 5\\text{ m} \\text{ is not dimensionless.}`,
      },
    ],
    proofSteps: [
      {
        expression: `\\text{Claim: } [\\Delta x] = [v_0 t + \\tfrac{1}{2}at^2] \\text{ requires all terms to be [L]}`,
        annotation: `We want to verify the SUVAT equation x = v₀t + ½at² is dimensionally consistent.`,
      },
      {
        expression: `[v_0] = \\text{m/s} = \\text{L T}^{-1}`,
        annotation: `v₀ is a velocity — dimension length per time.`,
      },
      {
        expression: `[v_0 t] = \\text{L T}^{-1} \\cdot \\text{T} = \\text{L} \\quad \\checkmark`,
        annotation: `v₀ × t: T cancels T⁻¹. Result: dimension L.`,
      },
      {
        expression: `[a] = \\text{m/s}^2 = \\text{L T}^{-2}`,
        annotation: `a is acceleration — dimension length per time squared.`,
      },
      {
        expression: `[at^2] = \\text{L T}^{-2} \\cdot \\text{T}^2 = \\text{L} \\quad \\checkmark`,
        annotation: `a × t²: T² cancels T⁻². Result: dimension L.`,
      },
      {
        expression: `[\\Delta x] = [v_0 t] + [\\tfrac{1}{2}at^2] = \\text{L} + \\text{L} = \\text{L} \\quad \\checkmark`,
        annotation: `All three terms have dimension L. The equation is dimensionally homogeneous.`,
      },
    ],
    title: 'Proving Δx = v₀t + ½at² passes the dimensional test',
    visualizations: [
      {
        id: 'SVGDiagram',
        props: { type: 'buckingham-pi' },
        title: 'Buckingham Pi — deriving the pendulum period from dimensions alone',
        mathBridge:
          'The diagram shows the three variables (T, L, g), their dimensions, and the exponent equations you must solve. Notice: 3 variables minus 2 independent dimensions (length, time) = 1 dimensionless group. That one group forces T = C·√(L/g). The constant C = 2π requires solving the differential equation — dimensional analysis gives the shape but not the number.',
        caption: 'With 3 variables and 2 dimensions, Buckingham Pi guarantees one dimensionless group — which immediately gives the form of the pendulum formula.',
      },
      {
        id: 'SVGDiagram',
        props: { type: 'dimension-table' },
        title: 'Dimension table for all mechanics quantities',
        mathBridge:
          'Read each row: the quantity name, its SI unit, and its dimension in terms of [M], [L], [T]. Notice that energy (Joule) and torque (N·m) have the same dimension [M·L²·T⁻²] — but they are physically different things. Dimensional analysis alone cannot distinguish them. This is why it is a necessary check, not a sufficient proof.',
        caption: 'Every mechanics quantity has a dimension expressible in M, L, T. Matching dimensions is necessary but not sufficient for an equation to be correct.',
      },
    ],
  },

  examples: [
    {
      id: 'p0-002-ex1',
      title: 'Convert 90 km/h to m/s',
      problem: `\\text{A car travels at 90 km/h. What is this speed in m/s?}`,
      steps: [
        {
          expression: `90\\,\\frac{\\text{km}}{\\text{h}} \\times \\frac{1000\\,\\text{m}}{1\\,\\text{km}} \\times \\frac{1\\,\\text{h}}{3600\\,\\text{s}}`,
          annotation: `Write the starting value. Multiply by two conversion fractions — each equals 1.`,
        },
        {
          expression: `= \\frac{90 \\times 1000}{3600}\\,\\frac{\\text{m}}{\\text{s}}`,
          annotation: `km cancels km. h cancels h. Combine numerators and denominators.`,
        },
        {
          expression: `= \\frac{90\\,000}{3600}\\,\\text{m/s} = 25\\,\\text{m/s}`,
          annotation: `90,000 ÷ 3600 = 25. The car travels at 25 m/s.`,
        },
      ],
      conclusion: `90 km/h = 25 m/s. Quick check: 90/3.6 = 25. The factor 3.6 converts km/h → m/s.`,
    },
    {
      id: 'p0-002-ex2',
      title: 'Dimensional check of the kinetic energy formula',
      problem:
        `\\text{The kinetic energy formula is } KE = \\tfrac{1}{2}mv^2. \\text{ Verify it has dimension [energy] = [kg·m²/s²].}`,
      steps: [
        {
          expression: `[m] = \\text{kg} \\qquad [v^2] = (\\text{m/s})^2 = \\text{m}^2/\\text{s}^2`,
          annotation: `Write the dimension of each variable.`,
        },
        {
          expression: `[mv^2] = \\text{kg} \\cdot \\frac{\\text{m}^2}{\\text{s}^2} = \\text{kg}\\cdot\\text{m}^2\\cdot\\text{s}^{-2}`,
          annotation: `Multiply dimensions: kg × m²/s².`,
        },
        {
          expression: `[KE] = [\\tfrac{1}{2}mv^2] = \\text{kg}\\cdot\\text{m}^2/\\text{s}^2 = \\text{J (Joule)} \\quad \\checkmark`,
          annotation: `The ½ is dimensionless. The result has dimension [M·L²·T⁻²], which is the Joule. Correct.`,
        },
      ],
      conclusion: `KE = ½mv² passes the dimensional test. Its unit is kg·m²/s², which we define as the Joule (J).`,
    },
    {
      id: 'p0-002-ex3',
      title: 'Catching an error with dimensional analysis',
      problem:
        `\\text{A student writes: } t = \\sqrt{\\frac{x}{a}} \\text{ for the fall time from height } x. \\text{ Is this dimensionally correct?}`,
      steps: [
        {
          expression: `[x/a] = \\frac{\\text{m}}{\\text{m/s}^2} = \\frac{\\text{m} \\cdot \\text{s}^2}{\\text{m}} = \\text{s}^2`,
          annotation: `Compute the dimension of x/a. Meters cancel; s² remains.`,
        },
        {
          expression: `[\\sqrt{x/a}] = \\sqrt{\\text{s}^2} = \\text{s}`,
          annotation: `Square root of s² is s.`,
        },
        {
          expression: `[t] = \\text{s} \\quad \\checkmark`,
          annotation: `The left side is [s]. The right side is [s]. The equation passes the dimensional test.`,
        },
      ],
      conclusion:
        `The formula t = √(x/a) is dimensionally correct. (The exact formula from x = ½at² is t = √(2x/a); the student dropped the factor of 2, which is a numerical error — but not a dimensional error.)`,
    },
    {
      id: 'p0-002-ex4',
      title: 'Order of magnitude estimate — the height of Mount Everest in SI units',
      problem:
        `\\text{Estimate the height of Mount Everest in meters without looking it up. Then check by converting from feet (29,032 ft, since 1 ft = 0.3048 m).}`,
      steps: [
        {
          expression: `\\text{Estimate: "about 9,000 m" (order of magnitude: } 10^4\\text{ m)}`,
          annotation:
            `Mount Everest is famous for being ~29,000 feet. Feet × 0.3 ≈ meters: 29,000 × 0.3 = 8,700 m. Estimating "about 9,000 m" is a reasonable order-of-magnitude guess.`,
        },
        {
          expression: `29{,}032\\,\\text{ft} \\times \\frac{0.3048\\,\\text{m}}{1\\,\\text{ft}} = 8{,}849\\,\\text{m}`,
          annotation: `Exact conversion. ft cancels ft. Result: 8,849 m.`,
        },
        {
          expression: `\\text{Error: } \\frac{9000 - 8849}{8849} \\approx 1.7\\%`,
          annotation: `Our estimate was only 1.7% high. Order-of-magnitude thinking gives useful answers fast.`,
        },
      ],
      conclusion: `Mount Everest is 8,849 m (≈ 8.85 km) above sea level. Our estimate of ~9 km was excellent.`,
    },
  ],

  challenges: [
    {
      id: 'p0-002-ch1',
      difficulty: 'easy',
      problem: `\\text{Convert 15 m/s to km/h.}`,
      hint: `Multiply by (1 km / 1000 m) × (3600 s / 1 h). The km/h factor is ×3.6.`,
      walkthrough: [
        {
          expression: `15\\,\\frac{\\text{m}}{\\text{s}} \\times \\frac{1\\,\\text{km}}{1000\\,\\text{m}} \\times \\frac{3600\\,\\text{s}}{1\\,\\text{h}}`,
          annotation: `Set up conversion. m cancels m. s cancels s.`,
        },
        {
          expression: `= 15 \\times \\frac{3600}{1000}\\,\\frac{\\text{km}}{\\text{h}} = 15 \\times 3.6 = 54\\,\\text{km/h}`,
          annotation: `15 × 3.6 = 54.`,
        },
      ],
      answer: `54 km/h`,
    },
    {
      id: 'p0-002-ch2',
      difficulty: 'medium',
      problem:
        `\\text{A formula claims: } F = \\frac{mv}{t^2}. \\text{ What dimension does F have under this formula? Is it the same as force [kg·m/s²]? If not, the formula is wrong.}`,
      hint: `Compute [mv/t²] = [kg · m/s / s²] = [kg · m / s³]. Compare to [kg · m / s²].`,
      walkthrough: [
        {
          expression: `[mv/t^2] = \\frac{\\text{kg} \\cdot \\text{m/s}}{\\text{s}^2} = \\frac{\\text{kg}\\cdot\\text{m}}{\\text{s}^3}`,
          annotation: `Compute dimension of mv/t².`,
        },
        {
          expression: `[F] = \\text{kg}\\cdot\\text{m/s}^2 \\neq \\text{kg}\\cdot\\text{m/s}^3`,
          annotation: `Force has [s²] in denominator; this formula gives [s³]. The dimensions do not match.`,
        },
      ],
      answer:
        `The formula F = mv/t² has dimension [kg·m/s³], not [kg·m/s²]. It is dimensionally wrong — the formula cannot be correct.`,
    },
    {
      id: 'p0-002-ch3',
      difficulty: 'hard',
      problem:
        `\\text{You are told: "The period of a pendulum depends only on its length } L \\text{ and the gravitational acceleration } g\\text{." Using dimensional analysis alone, derive the form of the period } T\\text{.}`,
      hint:
        `T has dimension [s]. L has dimension [m]. g has dimension [m/s²]. Find a and b such that [L^a · g^b] = [s]. Set up equations for exponents of m and s.`,
      walkthrough: [
        {
          expression: `[T] = [L^a g^b] = \\text{m}^a \\cdot \\left(\\frac{\\text{m}}{\\text{s}^2}\\right)^b = \\text{m}^{a+b} \\cdot \\text{s}^{-2b}`,
          annotation: `Write the dimension equation in terms of unknowns a and b.`,
        },
        {
          expression: `\\text{Need [s}^1\\text{]:}\\quad -2b = 1 \\Rightarrow b = -\\tfrac{1}{2}`,
          annotation: `Match the exponent of s: −2b = 1, so b = −½.`,
        },
        {
          expression: `\\text{Need [m}^0\\text{]:}\\quad a + b = 0 \\Rightarrow a = \\tfrac{1}{2}`,
          annotation: `Match the exponent of m: a + b = 0, so a = +½.`,
        },
        {
          expression: `T = C \\sqrt{\\frac{L}{g}}`,
          annotation:
            `The period must be proportional to √(L/g). The constant C = 2π (which dimensional analysis cannot determine — you need physics for that).`,
        },
      ],
      answer:
        `T = C√(L/g). Dimensional analysis gives the form; experiment determines C = 2π. Full answer: T = 2π√(L/g).`,
    },
  ],

  semantics: {
    core: [
      { symbol: '[L]', meaning: 'dimension of length — meters, centimeters, kilometers all have this dimension' },
      { symbol: '[M]', meaning: 'dimension of mass — kilograms, grams all have this dimension' },
      { symbol: '[T]', meaning: 'dimension of time — seconds, minutes all have this dimension' },
      { symbol: '[L T^{-1}]', meaning: 'dimension of velocity — length divided by time' },
      { symbol: '[L T^{-2}]', meaning: 'dimension of acceleration — length divided by time squared' },
      { symbol: '[M L T^{-2}]', meaning: 'dimension of force (= Newton) — mass × acceleration' },
      { symbol: '[M L^2 T^{-2}]', meaning: 'dimension of energy (= Joule) — force × length' },
      {
        symbol: '\\text{dimensional homogeneity}',
        meaning:
          `every term in a valid equation has the same dimension; if they differ, the equation is wrong`,
      },
    ],
    rulesOfThumb: [
      `Always write units next to every number. Never write a bare "9.8" — write "9.8 m/s²".`,
      `To convert: multiply by fractions equal to 1 so the unwanted unit cancels.`,
      `Before trusting any formula, check its dimensions — 30 seconds, catches most errors.`,
      `Functions like sin, cos, ln take dimensionless inputs only — if an argument has units, something is wrong.`,
      `When unsure whether two quantities can be added, check if they have the same dimension first.`,
      `Sig figs for multiplication: answer matches fewest sig figs of inputs.`,
    ],
  },

  spiral: {
    recoveryPoints: [
      {
        lessonId: 'p0-001',
        label: 'Lesson 1 — What is Physics?',
        note:
          `If the idea of "checking equations" feels abstract, re-read Lesson 1 on models. Dimensional analysis is just checking that your model speaks correct physical grammar.`,
      },
    ],
    futureLinks: [
      {
        lessonId: 'p1-ch2-001',
        label: 'Ch. 2, Lesson 1 — Kinematics: Definitions',
        note:
          `Every kinematic quantity (position, velocity, acceleration) has a SI unit. Ch. 2 uses m/s, m/s², and m throughout — the units from this lesson.`,
      },
      {
        lessonId: 'p1-ch4-002',
        label: "Ch. 4 — Newton's Second Law",
        note:
          `F = ma. The dimension of force is [M·L·T⁻²] = kg·m/s² = Newton. This lesson gives you the tools to verify F = ma dimensionally — and to spot any wrong version of it.`,
      },
    ],
  },

  assessment: {
    questions: [
      {
        id: 'p0-002-assess-1',
        type: 'input',
        text: `Convert 72 km/h to m/s. Give your answer as a decimal.`,
        answer: '20',
        hint: `72 ÷ 3.6 = 20. Or: 72 × 1000/3600.`,
      },
      {
        id: 'p0-002-assess-2',
        type: 'choice',
        text: `Which dimension does the product "mass × velocity²" have?`,
        options: ['[M·L·T⁻¹]', '[M·L²·T⁻²]', '[M·L²·T⁻¹]', '[M·L·T⁻²]'],
        answer: '[M·L²·T⁻²]',
        hint: `[M] × [L/T]² = [M·L²/T²] = [M·L²·T⁻²]. This is energy.`,
      },
      {
        id: 'p0-002-assess-3',
        type: 'choice',
        text: `A student writes F = mv²/x. What is the dimension of this expression?`,
        options: ['[M·L·T⁻²]', '[M·L⁻¹·T⁻²]', '[M·L·T⁻¹]', '[M·L²·T⁻²]'],
        answer: '[M·L·T⁻²]',
        hint: `[mv²/x] = kg·(m/s)²/m = kg·m/s². This IS force dimension — the formula passes dimensionally.`,
      },
    ],
  },

  mentalModel: [
    `Every number in physics needs a unit — "9.8" alone is meaningless`,
    `SI mechanics: meter [m], kilogram [kg], second [s] — everything else is built from these`,
    `Dimensional homogeneity: both sides of any equation must have the same dimension`,
    `Unit conversion = multiply by 1, written as (new unit / old unit) so old unit cancels`,
    `Dimensional analysis catches formula errors in ~30 seconds — always check before computing`,
    `Functions (sin, ln, exp) take dimensionless inputs only`,
    `Significant figures: multiplication/division → match fewest sig figs; addition/subtraction → match least precise decimal place`,
  ],

  formulas: [
    {
      id: 'p0-002-f1',
      latex: '[L],\\;[M],\\;[T]',
      description: 'The three base dimensions of mechanics: Length, Mass, Time. Every mechanics quantity is built from these.',
      variables: { '[L]': 'dimension of length (unit: meter)', '[M]': 'dimension of mass (unit: kilogram)', '[T]': 'dimension of time (unit: second)' },
    },
    {
      id: 'p0-002-f2',
      latex: '\\text{speed in m/s} = \\frac{\\text{speed in km/h}}{3.6}',
      description: 'Quick conversion factor: divide km/h by 3.6 to get m/s.',
      variables: {},
    },
    {
      id: 'p0-002-f3',
      latex: '[v] = \\text{L T}^{-1},\\quad [a] = \\text{L T}^{-2},\\quad [F] = \\text{M L T}^{-2},\\quad [E] = \\text{M L}^2\\text{T}^{-2}',
      description: 'Dimensions of the four most important derived mechanics quantities: velocity, acceleration, force, energy.',
      variables: { v: 'velocity', a: 'acceleration', F: 'force (Newton = kg·m/s²)', E: 'energy (Joule = kg·m²/s²)' },
    },
    {
      id: 'p0-002-f4',
      latex: 'T = C\\sqrt{\\frac{L}{g}}',
      description: 'Pendulum period derived from dimensional analysis (Buckingham Pi). The constant C = 2π requires solving the differential equation.',
      variables: { T: 'period (s)', L: 'pendulum length (m)', g: 'gravitational acceleration (m/s²)', C: 'dimensionless constant = 2π' },
    },
  ],

  notebooks: {
    python: {
      type: 'python',
      cells: [
        {
          cellTitle: 'Unit Conversion — Multiply by 1',
          type: 'code',
          language: 'python',
          prose: [
            `Unit conversion is multiplication by a fraction equal to 1. The physical value is unchanged; only the label changes. This cell builds a reusable converter that shows the cancellation explicitly.`,
          ],
          code: `# Unit conversion: multiply by conversion factors
# Each factor equals 1 — it changes the label, not the value

def convert(value, from_unit, to_unit, factor):
    """Multiply value by factor to change from_unit to to_unit."""
    result = value * factor
    print(f"{value} {from_unit}  ×  ({factor} {to_unit}/{from_unit})")
    print(f"  = {result:.6g} {to_unit}")
    return result

print("=== Speed conversions ===")
# km/h → m/s:  ×(1000 m / 1 km) × (1 h / 3600 s) = ×(1/3.6)
convert(100, "km/h", "m/s", 1000/3600)
print()
convert(27.78, "m/s", "km/h", 3600/1000)

print("\\n=== Distance conversions ===")
convert(5.0, "miles", "km",   1.60934)
convert(8.05, "km",   "miles", 1/1.60934)

print("\\n=== Key fact: 1 m/s = 3.6 km/h ===")
print(f"3600/1000 = {3600/1000}")`,
        },
        {
          cellTitle: 'Tracking Units Through a Calculation',
          type: 'code',
          language: 'python',
          prose: [
            `Each step of a physics calculation carries units through it. Writing the unit at every step lets you spot errors before the final number. Here we compute fall distance x = ½gt² and verify the result is in meters.`,
          ],
          code: `import numpy as np
import matplotlib.pyplot as plt

g = 9.8    # m/s²
t = np.linspace(0, 5, 200)   # s

# x = ½ g t²
# [x] = (m/s²)(s²) = m  ✓
x = 0.5 * g * t**2

fig, axes = plt.subplots(1, 2, figsize=(12, 4))

axes[0].plot(t, x, color='#2563eb', linewidth=2)
axes[0].set_xlabel('Time t  [s]')
axes[0].set_ylabel('Distance x  [m]')
axes[0].set_title('x = ½gt²  —  units: (m/s²)(s²) = m  ✓')
axes[0].grid(True, alpha=0.3)

# Plot x vs t² to confirm linearity
axes[1].plot(t**2, x, color='#16a34a', linewidth=2)
axes[1].set_xlabel('t²  [s²]')
axes[1].set_ylabel('x  [m]')
axes[1].set_title('x vs t² is a straight line — slope = ½g')
axes[1].grid(True, alpha=0.3)

slope = 0.5 * g
axes[1].annotate(f'slope = ½g = {slope} m/s²', xy=(12, 0.5*g*12),
                 xytext=(5, 30), fontsize=10, color='#16a34a',
                 arrowprops=dict(arrowstyle='->', color='#16a34a'))
plt.tight_layout()
plt.show()

print("Dimensional check:")
print(f"  [g] = m/s²,  [t²] = s²")
print(f"  [g × t²] = (m/s²)(s²) = m  ✓")
print(f"  x = ½ × {g} × {5.0:.1f}² = {0.5*g*25:.2f} m at t = 5 s")`,
        },
        {
          cellTitle: 'The NASA Mars Orbiter — Reproducing the Mistake',
          type: 'code',
          language: 'python',
          prose: [
            `In 1999 one engineering team sent thruster impulse data in **pound-force seconds** (lbf·s); the navigation software expected **newton-seconds** (N·s). Nobody applied the conversion factor. Let's reproduce the error and see exactly how it destroyed a $327M spacecraft.`,
          ],
          code: `# The Mars Climate Orbiter unit error — 1999
# Lockheed Martin software output: lbf·s (pound-force seconds)
# JPL navigation software expected: N·s (newton-seconds)
# Conversion factor needed: 1 lbf = 4.44822 N

lbf_to_N = 4.44822   # N per lbf

# Simulated thruster impulse reported by Lockheed Martin
impulse_lbf_s = 4.45   # lbf·s  (a typical small maneuver)

# What JPL software received (treated as N·s by mistake):
impulse_wrong = impulse_lbf_s   # software assumed N·s, no conversion applied

# What JPL software SHOULD have received:
impulse_correct = impulse_lbf_s * lbf_to_N  # actual N·s

print("=== Mars Climate Orbiter unit error ===")
print(f"Impulse sent by Lockheed:   {impulse_lbf_s} lbf·s")
print(f"JPL read it as:             {impulse_wrong:.2f} N·s  ← WRONG (4.4× too small)")
print(f"Correct value should be:    {impulse_correct:.2f} N·s")
print(f"Error factor:               {impulse_correct/impulse_wrong:.4f}×")
print()

# Over 10 months, small errors accumulate
# The spacecraft arrived at Mars ~170 km too close to the surface
# Atmosphere caused structural failure during orbital insertion

months = 9.5
daily_impulse_lbf_s = 4.45   # simplified
cumulative_error_factor = (impulse_correct/impulse_wrong)**months
print(f"After {months} months of accumulated error:")
print(f"  Position error factor: ~{cumulative_error_factor:.1f}×")
print(f"  Spacecraft entered atmosphere at wrong angle → burned up")
print()
print("Lesson: ALWAYS check units when receiving data from external sources.")
print(f"The fix was one line: impulse_N_s = impulse_lbf_s * {lbf_to_N}")`,
        },
        {
          cellTitle: 'Significant Figures and Order of Magnitude',
          type: 'code',
          language: 'python',
          prose: [
            `Significant figures encode measurement precision. Order of magnitude estimates give quick feasibility checks. This cell shows both: how to round to sig figs, and how Fermi estimation works.`,
          ],
          code: `import math

def sig_figs(value, n):
    """Round value to n significant figures."""
    if value == 0:
        return 0
    d = math.ceil(math.log10(abs(value)))
    return round(value, n - d)

print("=== Significant figures in arithmetic ===")
a = 9.8    # 2 sig figs
b = 3.147  # 4 sig figs
product = a * b
print(f"{a} (2 sf) × {b} (4 sf) = {product:.4f}")
print(f"  → rounded to 2 sf: {sig_figs(product, 2)}")
print(f"  Rule: multiplication → use fewest sig figs (2 here)")
print()

c = 9.80   # 3 sig figs
d = 0.3    # 1 sig fig
total = c + d
print(f"{c} + {d} = {total}")
print(f"  → limited by 0.3 (1 decimal place): {total:.1f}")
print(f"  Rule: addition → match least precise decimal place")
print()

print("=== Order of magnitude estimates ===")
estimates = {
    "Human hair diameter": (7e-5, "m"),
    "Stadium width":       (2e2,  "m"),
    "Earth radius":        (6.4e6,"m"),
    "Speed of light":      (3e8,  "m/s"),
    "Avogadro's number":   (6e23, "mol⁻¹"),
}
for name, (val, unit) in estimates.items():
    exp = math.floor(math.log10(val))
    print(f"  {name:25s}: ~10^{exp:+d} {unit}")

print()
print("Order of magnitude = the exponent of 10 when written in scientific notation.")
print("Useful for quick sanity checks — if an answer is 10× too big, spot it instantly.")`,
        },
        {
          cellTitle: 'Buckingham Pi — Dimensional Derivation of the Pendulum',
          type: 'code',
          language: 'python',
          prose: [
            `Dimensional analysis can derive the *form* of a physical law before any experiment. The Buckingham Pi theorem says: n variables, k independent dimensions → n−k dimensionless groups. For the pendulum (T, L, g: n=3, k=2) we get one Pi group, so T = C·√(L/g). This cell checks it numerically.`,
          ],
          code: `import numpy as np
import matplotlib.pyplot as plt

# Pendulum: T = 2π √(L/g)
# Dimensional analysis gives T = C √(L/g) — can't give C = 2π without physics
# But it predicts the FORM.

g = 9.8   # m/s²
L = np.linspace(0.1, 4.0, 200)  # m

T = 2 * np.pi * np.sqrt(L / g)  # full formula

# Dimensional analysis prediction: T ∝ √L (holding g fixed)
# Plot T vs √L — should be linear
sqrt_L = np.sqrt(L)

fig, axes = plt.subplots(1, 2, figsize=(12, 4))

axes[0].plot(L, T, color='#7c3aed', linewidth=2)
axes[0].set_xlabel('Pendulum length L  [m]')
axes[0].set_ylabel('Period T  [s]')
axes[0].set_title('T = 2π √(L/g)  —  confirmed by dimensional analysis')
axes[0].grid(True, alpha=0.3)

axes[1].plot(sqrt_L, T, color='#dc2626', linewidth=2)
axes[1].set_xlabel('√L  [m^{1/2}]')
axes[1].set_ylabel('T  [s]')
axes[1].set_title('T vs √L is linear — slope = 2π/√g')
axes[1].grid(True, alpha=0.3)

slope = 2 * np.pi / np.sqrt(g)
axes[1].annotate(f'slope = 2π/√g = {slope:.3f} s/m^{{1/2}}',
                 xy=(1.0, slope*1.0), xytext=(0.4, 5),
                 fontsize=10, color='#dc2626',
                 arrowprops=dict(arrowstyle='->', color='#dc2626'))
plt.tight_layout()
plt.show()

print("Dimensional analysis result: T = C √(L/g)")
print(f"Exact physics gives C = 2π ≈ {2*np.pi:.4f}")
print(f"Slope of T vs √L = 2π/√g = {slope:.4f} s/m^(1/2)")
print()
print("The form (√L/g) was derivable from dimensions alone.")
print("Only the constant 2π required solving the differential equation.")`,
        },
        {
          cellTitle: 'Challenge — Convert and Verify the Orbiter Impulse',
          type: 'code',
          language: 'python',
          code: `# Challenge: Unit conversion and dimensional verification
# ─────────────────────────────────────────────────────────
# The Mars Climate Orbiter carried 400 kg of fuel.
# Its main thruster produced a force of 640 N.
# Mission duration before insertion: 9.5 months.
#
# Task 1: Convert 9.5 months to seconds.
#         Use: 1 month = 30.44 days, 1 day = 86400 s
#
# Task 2: Compute the thruster's total impulse J = F × t
#         in units of N·s. Confirm dimensions: [N][s] = [kg·m/s²][s] = [kg·m/s]
#
# Task 3: Convert that impulse to lbf·s (1 lbf = 4.44822 N)
#         This is the value Lockheed's software would have sent.
#         The JPL software used it without converting — as if it were already N·s.
#         Compute the error in final momentum (kg·m/s) if the JPL software
#         applied no conversion.

months = 9.5

# Task 1
duration_s = # YOUR CODE HERE

# Task 2
F_N = 640   # N  (only used occasionally, but useful for scale)
J_Ns = # YOUR CODE HERE  (F × duration_s)

# Task 3
lbf_per_N = 1 / 4.44822
J_lbfs = # YOUR CODE HERE  (convert J_Ns to lbf·s)
J_wrong = # YOUR CODE HERE  (what JPL received thinking it was N·s)
momentum_error = # YOUR CODE HERE  (difference in kg·m/s)

print(f"Duration: {duration_s:.2e} s")
print(f"Total impulse: {J_Ns:.2e} N·s")
print(f"In lbf·s: {J_lbfs:.2e} lbf·s")
print(f"JPL momentum error: {momentum_error:.2e} kg·m/s")`,
          prose: [],
        },
      ],
    },
    matlab: {
      type: 'matlab',
      cells: [
        {
          cellTitle: 'Unit Conversion in MATLAB',
          type: 'code',
          language: 'matlab',
          prose: [
            'MATLAB handles unit conversion the same way as Python: multiply by the right factor. The key difference is MATLAB\'s .* element-wise operator and its preference for row/column vectors. This cell converts speeds and distances.',
          ],
          code: `%% Unit conversions — multiply by conversion factors
% km/h → m/s
speed_kmh = [60, 90, 100, 120];  % km/h
speed_ms  = speed_kmh * (1000/3600);  % × (1000 m/km) × (1 h/3600 s)

fprintf('Speed conversions:\\n');
for i = 1:length(speed_kmh)
    fprintf('  %3d km/h = %6.4f m/s\\n', speed_kmh(i), speed_ms(i));
end

%% Distance conversion: feet → meters
ft_to_m = 0.3048;
heights_ft = [5280, 29032, 1000];  % ft  (1 mile, Everest, round number)
heights_m  = heights_ft .* ft_to_m;

fprintf('\\nHeight conversions:\\n');
labels = {'1 mile (5280 ft)', 'Mt Everest (29032 ft)', '1000 ft'};
for i = 1:3
    fprintf('  %-22s = %8.1f m\\n', labels{i}, heights_m(i));
end

%% The 1 m/s = 3.6 km/h relationship
fprintf('\\nConversion factor: 1 m/s = %.1f km/h\\n', 3600/1000);`,
        },
        {
          cellTitle: 'Dimensional Checking — SUVAT in MATLAB',
          type: 'code',
          language: 'matlab',
          prose: [
            `MATLAB doesn't track units automatically, but you can embed dimensional verification as comments alongside every line. This is the professional habit — always write the unit after each variable assignment so a reviewer can check at a glance.`,
          ],
          code: `%% Dimensional check of x = v0*t + 0.5*a*t^2
% Each line annotated with its dimension

g  = 9.8;   % m/s²   [L T^-2]
v0 = 0;     % m/s    [L T^-1]
t  = 0:0.1:5;  % s   [T]

% v0*t: [L T^-1][T] = [L] = m  ✓
term1 = v0 .* t;   % m

% 0.5*g*t^2: [L T^-2][T^2] = [L] = m  ✓
term2 = 0.5 .* g .* t.^2;  % m

x = term1 + term2;  % m + m = m  ✓

figure;
subplot(1,2,1);
plot(t, x, 'b-', 'LineWidth', 2);
xlabel('Time t [s]');
ylabel('Distance x [m]');
title('x = ½gt² — dimensions verified');
grid on;

subplot(1,2,2);
plot(t.^2, x, 'g-', 'LineWidth', 2);
xlabel('t² [s²]');
ylabel('x [m]');
title('x vs t² linear — slope = ½g');
grid on;

fprintf('x at t=5s: %.2f m\\n', 0.5*g*25);
fprintf('Dimensional check: [g][t^2] = (m/s^2)(s^2) = m  OK\\n');`,
        },
        {
          cellTitle: 'Significant Figures and Pendulum — Buckingham Pi Check',
          type: 'code',
          language: 'matlab',
          prose: [
            `MATLAB's \`format\` command controls display precision. Here we check Buckingham Pi numerically: plot T vs L and T vs √L to confirm the dimensional prediction T ∝ √(L/g).`,
          ],
          code: `%% Pendulum: T = 2π√(L/g)  — Buckingham Pi confirms T ∝ √L

g = 9.8;   % m/s²
L = linspace(0.1, 4.0, 200);   % m

T = 2*pi*sqrt(L/g);   % s — full formula

figure;
subplot(1,2,1);
plot(L, T, 'm-', 'LineWidth', 2);
xlabel('L [m]');  ylabel('T [s]');
title('Pendulum period vs length');
grid on;

subplot(1,2,2);
plot(sqrt(L), T, 'r-', 'LineWidth', 2);
xlabel('\\surdL  [m^{1/2}]');  ylabel('T [s]');
title('T vs \\surdL — linear as Buckingham Pi predicts');
grid on;
% slope should be 2π/√g
slope = 2*pi/sqrt(g);
text(0.5, slope*0.5+0.2, sprintf('slope = 2\\pi/\\surdg = %.3f', slope), ...
     'Color','r','FontSize',10);

%% Significant figures example
a_2sf = 9.8;    % 2 sig figs
t_4sf = 3.147;  % 4 sig figs
product = a_2sf * t_4sf;

fprintf('\\nSig figs example:\\n');
fprintf('  %.1f × %.3f = %.4f\\n', a_2sf, t_4sf, product);
fprintf('  Rounded to 2 sf: %.0f\\n', round(product, 2, 'significant'));
fprintf('  Rule: multiply/divide → answer has fewest input sig figs\\n');`,
        },
        {
          cellTitle: 'Challenge — Dimensional Analysis of Drag Force',
          type: 'code',
          language: 'matlab',
          code: `%% Challenge: dimensional analysis of drag force
% ─────────────────────────────────────────────────────────
% The drag force on a sphere depends on:
%   - fluid density  ρ  [kg/m³]  = [M L^-3]
%   - sphere velocity v  [m/s]   = [L T^-1]
%   - sphere radius   r  [m]     = [L]
%   - fluid viscosity μ  [kg/(m·s)] = [M L^-1 T^-1]
%
% Task 1: From dimensions alone, find exponents a,b,c,d such that
%         F_drag = C ρ^a v^b r^c μ^d has dimension [M L T^-2] (force)
%         Hint: try Stokes drag: a=1, b=1, c=1, d=1 → F = C μ v r
%         Verify this has the right dimension.
%
% Task 2: In MATLAB, compute the Stokes drag on a sphere of radius 1mm
%         falling in water (μ = 1e-3 kg/(m·s)) at 1 cm/s.
%         C = 6π for a sphere.

% Task 1 verification
mu   = 1e-3;   % kg/(m·s)
v    = 0.01;   % m/s
r    = 1e-3;   % m

% [μ v r] = [kg/(m·s)] [m/s] [m] = kg·m/s² = N  → force ✓
% YOUR CODE: compute F_stokes = 6*pi * mu * v * r
F_stokes = % YOUR CODE HERE

fprintf('Stokes drag: F = 6π × %.4f × %.4f × %.4f\\n', mu, v, r);
fprintf('F_stokes = %.4e N\\n', F_stokes);
fprintf('Dimensional check: [kg/(m·s)][m/s][m] = kg·m/s² = N  OK\\n');`,
          prose: [],
        },
      ],
    },
  },

  misconceptions: [
    {
      id: 'p0-002-misc1',
      misconception: `"Changing units changes the physical value — 100 km/h is faster than 27.78 m/s."`,
      reality: `These are identical speeds. Converting units is multiplying by 1 — the physical quantity (how fast the car moves) is unchanged. The number changes; the reality does not. 100 km/h and 27.78 m/s describe the same motion.`,
      whyItHappens: `Students confuse the number with the physical quantity. A bigger number looks like more, but it just reflects a smaller unit.`,
    },
    {
      id: 'p0-002-misc2',
      misconception: `"Dimensional analysis only works for simple formulas — for complex equations it's too hard to apply."`,
      reality: `Dimensional analysis works for every equation without exception. For complex expressions, apply it term by term: find the dimension of each product, then verify they all match. It requires more steps, not different logic. It is hardest when you skip it.`,
      whyItHappens: `Students apply it on simple examples and assume it becomes impractical later. In fact, it becomes more valuable as equations grow complex, because the chance of error grows.`,
    },
    {
      id: 'p0-002-misc3',
      misconception: `"Writing more decimal places makes my answer more accurate."`,
      reality: `Accuracy is limited by the precision of your inputs. Writing 9.8 m/s² × 3.0² s = 44.1000000 m does not make the result more accurate — the 9.8 only has 2 sig figs, so the result has 2 sig figs: 44 m. Extra digits are false precision — they imply measurement certainty you do not have.`,
      whyItHappens: `Calculators display 8-10 digits. Students copy all digits without asking whether they are meaningful.`,
    },
    {
      id: 'p0-002-misc4',
      misconception: `"A formula that passes dimensional analysis is correct."`,
      reality: `Dimensional analysis is a necessary check, not a sufficient one. F = mv/t (wrong) and F = ma (correct) both pass the dimensional test if we consider only [M L T⁻²]. Dimensional analysis can eliminate wrong formulas, but it cannot confirm right ones. A dimensionally valid formula can still have wrong constants, wrong signs, or wrong functional form.`,
      whyItHappens: `Students over-trust the check after seeing it catch errors. It is a filter, not a proof.`,
    },
  ],

  transferPrompts: [
    {
      id: 'p0-002-tp1',
      prompt: `A pharmacist prepares a dose of 500 mg for a patient weighing 70 kg. The drug's dosing guideline is 7 mg/kg. Check whether the dose is correct using dimensional analysis — write out the units explicitly at every step.`,
      targetConcept: 'Unit conversion, dimensional homogeneity',
      hint: `[mg/kg × kg = mg]. Compute the recommended dose and compare to 500 mg.`,
    },
    {
      id: 'p0-002-tp2',
      prompt: `An engineering specification lists a pressure of 145 psi (pounds per square inch). Convert this to Pascals (Pa = kg/(m·s²) = N/m²). Given: 1 lbf = 4.44822 N, 1 inch = 0.0254 m. Show unit cancellation at every step.`,
      targetConcept: 'Multi-step unit conversion with area units',
      hint: `1 psi = 1 lbf/in². Convert lbf→N and in²→m² separately, then combine.`,
    },
    {
      id: 'p0-002-tp3',
      prompt: `A wind turbine's power output P depends on air density ρ [kg/m³], rotor area A [m²], and wind speed v [m/s]. Using dimensional analysis, find the simplest formula P = C·ρ^a · A^b · v^c that has dimension of power [W = kg·m²/s³].`,
      targetConcept: 'Buckingham Pi, deriving formula form from dimensions',
      hint: `Set up [kg·m²/s³] = [kg/m³]^a [m²]^b [m/s]^c and solve for a, b, c by matching exponents of kg, m, s.`,
    },
  ],

  debugging: [
    {
      id: 'p0-002-dbg1',
      title: 'Forgetting to convert intermediate quantities',
      scenario: `A student computes the distance a train travels in 45 minutes at 90 km/h using x = v·t, getting x = 90 × 45 = 4050. The answer should be about 67.5 km.`,
      error: `The student multiplied km/h by minutes without converting time to hours (or speed to km/min). The product 90 km/h × 45 min has units km·min/h — not km.`,
      fix: `Convert time to hours first: t = 45/60 = 0.75 h. Then x = 90 km/h × 0.75 h = 67.5 km. OR convert speed to km/min: 90/60 = 1.5 km/min, then x = 1.5 × 45 = 67.5 km. Either works — just be consistent.`,
      prevention: `Write the unit after every number and check cancellation before computing. "km/h × min" should immediately flag that h and min don't cancel.`,
    },
    {
      id: 'p0-002-dbg2',
      title: 'Mixing SI and imperial units mid-calculation',
      scenario: `A student calculates potential energy PE = mgh using m = 150 lb, g = 9.8 m/s², h = 10 m. The result is 14,700 — but the unit is lb·m²/s², not Joules.`,
      error: `150 lb is a weight in imperial units (force), not a mass in kg. The formula requires mass in kg. The student mixed unit systems.`,
      fix: `Convert 150 lb to kg: 150 × 0.453592 = 68.04 kg. Then PE = 68.04 × 9.8 × 10 = 6,668 J.`,
      prevention: `At the start of every problem, check that all values are in SI. If any number came from a table or external source, convert it first, before substituting.`,
    },
  ],

  mastery: {
    targetLevel: `You can convert between any SI and non-SI units using the "multiply by 1" method, showing unit cancellation. You can dimensional-check any physics formula in under 60 seconds by tracing units through each term. You can identify unit errors as the source of physically nonsensical results.`,
    checklistItems: [
      `Convert speed, distance, and time between SI and common units (km/h ↔ m/s, ft ↔ m, min ↔ s) without looking up the method`,
      `State the three SI base units of mechanics and their abbreviations from memory`,
      `Write the dimension of velocity, acceleration, force, and energy in terms of [M], [L], [T]`,
      `Check any two-term equation for dimensional homogeneity by tracing units through each term`,
      `Identify why writing \`sin(5 m)\` is physically meaningless (non-dimensionless argument)`,
      `Apply significant figure rules correctly for both multiplication and addition`,
      `Use dimensional analysis to derive the form of an unknown formula (e.g. pendulum period)`,
    ],
    commonStruggles: [
      `Confusing dimension (physical type) with unit (measurement scale) — dimension is [L], unit is "meters"`,
      `Forgetting to cancel units in multi-step conversions — always write fractions and cancel explicitly`,
      `Over-trusting dimensional validity: a formula that passes is not necessarily correct, just not obviously wrong`,
      `Significant figures: applying multiplication rules to addition problems, or vice versa`,
    ],
    nextSteps: [
      `Lesson 3 (Variables and Functions): every variable has a unit; dimensionless functions like sin take angle in radians`,
      `Chapter 2 (Kinematics): every SUVAT equation carries SI units — you will check them all`,
      `Chapter 4 (Forces): Newton = kg·m/s²; dimensional analysis will catch Newton's-law errors instantly`,
    ],
  },

  quiz: [
    {
      id: 'units-q1',
      type: 'input',
      text: `Convert 108 km/h to m/s. (Divide by 3.6.)`,
      answer: '30',
      hints: ['108 ÷ 3.6 = 30'],
      reviewSection: 'Examples — unit conversion',
    },
    {
      id: 'units-q2',
      type: 'choice',
      text: `What is the SI unit of force?`,
      options: ['Joule', 'Newton', 'Pascal', 'Watt'],
      answer: 'Newton',
      hints: ['Newton = kg·m/s². It is named after Isaac Newton.'],
      reviewSection: 'Intuition — derived units',
    },
    {
      id: 'units-q3',
      type: 'choice',
      text: `A formula gives a result with dimension [kg·m/s³]. This is the dimension of:`,
      options: ['force', 'energy', 'power', 'none of the above — no standard quantity has this dimension'],
      answer: 'power',
      hints: ['Power = energy/time = [kg·m²/s²] / [s] = [kg·m²/s³]. Close but not quite — think more carefully.'],
      reviewSection: 'Rigor — dimensional analysis',
    },
    {
      id: 'units-q4',
      type: 'choice',
      text: `A formula claims T = √(m·g). Does this pass a dimensional check? (T is period [s], m is mass [kg], g is [m/s²])`,
      options: [
        'Yes — the dimensions match',
        'No — [√(kg·m/s²)] = [kg^{1/2}·m^{1/2}/s] ≠ [s]',
        'Yes — because the square root cancels the dimension',
        'Cannot be determined without more information',
      ],
      answer: 'No — [√(kg·m/s²)] = [kg^{1/2}·m^{1/2}/s] ≠ [s]',
      hints: ['Compute [m·g] = kg·m/s². Then √(kg·m/s²) ≠ s.'],
      reviewSection: 'Challenges — pendulum dimensional analysis',
    },
    {
      id: 'units-q5',
      type: 'input',
      text: `Convert 5 cm/s to m/s. Express as a decimal.`,
      answer: '0.05',
      hints: ['1 cm = 0.01 m. So 5 cm/s = 5 × 0.01 m/s = 0.05 m/s.'],
      reviewSection: 'Math — unit conversion algorithm',
    },
    {
      id: 'units-q6',
      type: 'choice',
      text: `Which of the following equations is dimensionally impossible?`,
      options: [
        'v = v₀ + at',
        'x = v₀ + ½at²',
        'v² = v₀² + 2aΔx',
        'a = Δv/Δt',
      ],
      answer: 'x = v₀ + ½at²',
      hints: ['x has dimension [m]. v₀ has dimension [m/s]. You cannot add [m] and [m/s].'],
      reviewSection: 'Rigor — dimensional proof',
    },
    {
      id: 'units-q7',
      type: 'choice',
      text: `sin(x) requires x to be:`,
      options: ['in meters', 'in seconds', 'dimensionless (a pure number, such as radians)', 'in kilograms'],
      answer: 'dimensionless (a pure number, such as radians)',
      hints: ['Transcendental functions take dimensionless arguments — otherwise the Taylor series mixes [1], [m], [m²], ... which cannot be added.'],
      reviewSection: 'Rigor — dimensionless numbers',
    },
    {
      id: 'units-q8',
      type: 'input',
      text: `The period of a pendulum is T = 2π√(L/g). If L = 1 m and g = 9.8 m/s², what is T in seconds? (Use π ≈ 3.14159.)`,
      answer: '2.006',
      hints: [
        'L/g = 1/9.8 ≈ 0.1020. Then √0.1020 ≈ 0.3194.',
        'T = 2π × 0.3194 ≈ 2.007 s. Accept answers from 2.00 to 2.01.',
      ],
      reviewSection: 'Challenges — pendulum',
    },
  ],
}
