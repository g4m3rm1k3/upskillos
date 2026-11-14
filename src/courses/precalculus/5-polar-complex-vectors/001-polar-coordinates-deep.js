export default {
  id: 'precalc5-001',
  slug: 'polar-coordinates-deep',
  chapter: 'precalc-5',
  order: 1,
  title: 'Polar Coordinates: Distance and Direction Instead of Right and Up',
  subtitle: 'Cartesian asks "how far right and up?" — polar asks "how far, and which direction?" Same point, two languages. Choosing the right one makes the math trivial or horrible.',
  tags: ['polar coordinates', 'polar form', 'converting polar rectangular', 'polar equations', 'graphing polar', 'r theta', 'cardioid', 'rose curve', 'limaçon'],
  aliases: 'polar coordinates r theta convert rectangular cartesian graphing polar equations cardioid rose limaçon symmetry radar',

  hook: {
    question: 'A radar operator sees a plane at distance 120 km, bearing 045°. Nobody converts that to $(x, y)$ before plotting — the distance-and-angle description IS the natural language. Why does the choice of coordinate system matter so much?',
    realWorldContext: 'Polar coordinates are native to anything that rotates or radiates outward: radar, sonar, radio antennas, robotic arms, turbines, circular saws. The equation of a circle centred at the origin is $x^2+y^2=r^2$ in Cartesian — complicated. In polar it is simply $r=5$ — trivial. The system whose equations are simplest is the one you should use. Choosing well is an engineering skill, not just a mathematical one.',
    previewVisualizationId: 'PolarConversionViz',
  },

  intuition: {
    prose: [
      '**Where you are in the story:** You have learned to describe vectors with components — the "right and up" language of Cartesian coordinates. Now you learn a second language for the same point: distance and direction from the origin. This is polar coordinates, and it will feel immediately familiar because it uses the same right triangle you already know.',
      'Every point in the plane has two addresses. The Cartesian address says: walk $x$ units right, then $y$ units up. The polar address says: face angle $\\theta$ from the positive $x$-axis, then walk $r$ units in that direction. Both addresses are complete — they locate the same point. The triangle connecting these two descriptions is an ordinary right triangle, and the conversion formulas are just the sides of that triangle.',
      'The conversion is not a formula to memorise — it is a right triangle to draw. Drop a perpendicular from your point to the $x$-axis. The hypotenuse is $r$ (the polar distance). The horizontal leg is $x$ (= $r\\cos\\theta$ by definition of cosine). The vertical leg is $y$ (= $r\\sin\\theta$ by definition of sine). Going the other way: $r$ is the hypotenuse of that triangle ($r = \\sqrt{x^2+y^2}$ by Pythagoras), and $\\theta$ is the angle at the origin ($\\tan\\theta = y/x$).',
      'A polar address is not unique, which surprises most students. Adding $360°$ to the angle returns to the same point. A negative $r$ means "walk in the opposite direction from $\\theta$." So $(3, 60°)$, $(3, 420°)$, and $(-3, 240°)$ all describe the same point. This non-uniqueness is a feature — it gives flexibility when writing polar equations.',
      'Radar returns an echo with a time (which gives distance $r$) and a direction (which gives angle $\\theta$). The natural output is $(r, \\theta)$. Converting to $(x, y)$ for plotting would require a trigonometric computation for every single detected object — wasteful and error-prone. Polar coordinates are the native representation. Wind direction is always given as a bearing and speed. Navigational charts show distance and bearing. All of these are polar systems. The key insight: polar coordinates are the natural choice when the problem has a natural centre (radar antenna, observer, star) and when distance from that centre matters more than position on a grid.',
      '**Where this is heading:** Complex numbers in polar form (next lesson) use this same $(r, \\theta)$ language — the modulus is $r$ and the argument is $\\theta$. In calculus, area integrals over circular regions convert to $dA = r\\,dr\\,d\\theta$, often turning a hard integral into an easy one.',
    ],
    callouts: [
      {
        type: 'sequencing',
        title: 'Precalc-5 arc — Lesson 3 of 4',
        body: '← Dot Product & Applications | **Polar Coordinates** | Complex Numbers & De Moivre\'s →',
      },
      {
        type: 'insight',
        title: 'The right triangle IS the conversion — nothing to memorise',
        body: '\\text{Draw the point. Drop a perpendicular to the } x\\text{-axis.} \\\\ \\text{Hypotenuse} = r \\quad \\text{Horizontal leg} = x = r\\cos\\theta \\\\ \\text{Vertical leg} = y = r\\sin\\theta \\quad \\text{Angle at origin} = \\theta \\\\ \\text{These are the definitions of sin and cos in a right triangle.}',
      },
      {
        type: 'definition',
        title: 'Conversion formulas — read from the triangle',
        body: 'x = r\\cos\\theta \\qquad y = r\\sin\\theta \\\\ r = \\sqrt{x^2+y^2} \\qquad \\theta = \\arctan(y/x) \\;(\\text{+adjust for quadrant}) \\\\ r^2 = x^2+y^2 \\quad \\leftarrow \\text{ most useful for equation conversion}',
      },
      {
        type: 'warning',
        title: 'Quadrant trap: arctan only covers two quadrants',
        body: '\\arctan(y/x) \\text{ returns values in } (-90°, 90°) \\text{ only.} \\\\ \\text{For QII: } \\theta = \\arctan(y/x) + 180° \\\\ \\text{For QIII: } \\theta = \\arctan(y/x) + 180° \\\\ \\text{For QIV: } \\theta = \\arctan(y/x) + 360° \\text{ (if you want a positive angle)} \\\\ \\text{Rule: always draw the point and check which quadrant it is in.}',
      },
      {
        type: 'definition',
        title: 'Non-uniqueness — one point, many addresses',
        body: '(r, \\theta) = (r, \\theta + 2\\pi k) \\quad k \\in \\mathbb{Z} \\\\ (r, \\theta) = (-r, \\theta + \\pi) \\quad \\text{(negative }r\\text{: go backwards)} \\\\ \\text{The origin:} \\; r = 0 \\text{ for any } \\theta.',
      },
      {
        type: 'insight',
        title: 'Converting between representations — a real engineering cost',
        body: '\\text{Every time you convert between polar and Cartesian, you pay:} \\\\ \\text{one square root, one arctangent, two multiplications.} \\\\ \\text{Radar systems processing thousands of objects per second} \\\\ \\text{stay in polar to avoid this cost entirely.} \\\\ \\text{Choosing the right coordinate system is an engineering decision.}',
      },
    ],
    visualizations: [
      {
        id: 'PolarConversionViz',
        title: 'Drag the Point — The Triangle Appears',
        mathBridge: '1. Drag the point anywhere on the plane and watch the right triangle update. 2. Note how $r$, $\\theta$, $x$, $y$ change — the conversion formulas are always satisfied. 3. Drag the point to QII and observe that $\\theta > 90°$ while $x < 0$ and $y > 0$. 4. Switch to polar curves mode and select different equations. The key lesson: the triangle is not an illustration — it IS the conversion formula. Drag slowly through all four quadrants to see the arctan adjustment in action.',
        caption: 'The triangle is not an illustration — it IS the conversion formula. There is nothing else going on.',
      },
    ],
  },

  rigor: {
    title: 'A polar equation that hides a circle: $r = 2\\cos\\theta$',
    proofSteps: [
      {
        expression: 'r = 2\\cos\\theta',
        annotation: 'Start. This could be many shapes. The graph passes through the origin at $\\theta=90°$ and through $(2,0)$ at $\\theta=0°$. We want to know what curve connects them.',
      },
      {
        expression: 'r \\cdot r = 2\\cos\\theta \\cdot r \\quad \\Rightarrow \\quad r^2 = 2r\\cos\\theta',
        annotation: 'Multiply both sides by $r$. This engineers the equation to match the substitution targets $r^2 = x^2+y^2$ and $r\\cos\\theta = x$.',
      },
      {
        expression: 'x^2 + y^2 = 2x',
        annotation: 'Substitute $r^2 = x^2+y^2$ and $r\\cos\\theta = x$. The polar form is gone — we have a Cartesian equation.',
      },
      {
        expression: 'x^2 - 2x + y^2 = 0 \\quad \\Rightarrow \\quad (x^2-2x+1) + y^2 = 1',
        annotation: 'Rearrange and complete the square on $x$. Add 1 to both sides. Left side becomes $(x-1)^2$, completing the square reveals the hidden circle.',
      },
      {
        expression: '(x-1)^2 + y^2 = 1 \\qquad \\blacksquare',
        annotation: 'Circle centred at $(1,0)$ with radius $1$. It passes through the origin (substitute $(0,0)$: $(0-1)^2+0^2 = 1$ ✓). The polar equation $r = 2\\cos\\theta$ is a perfect circle — described from the perspective of a point ON the circle, not the centre.',
      },
    ],
  },

  math: {
    prose: [
      'Converting between Cartesian and polar equations uses four substitutions. The trick is recognising which substitution to use at each step — and knowing when to multiply by $r$ to create the right pattern.',
      '$r^2 = x^2+y^2$ — this is just the Pythagorean theorem applied to the right triangle. Use this whenever you see $x^2+y^2$ in Cartesian, or $r^2$ in polar.',
      '$r\\cos\\theta = x$ (equivalently $x = r\\cos\\theta$) — from the triangle: horizontal leg = hypotenuse × cosine of angle. Use this whenever you see $x$ alone in Cartesian, or $r\\cos\\theta$ in polar.',
      '$r\\sin\\theta = y$ (equivalently $y = r\\sin\\theta$) — same idea for the vertical leg. Use whenever you see $y$ in Cartesian, or $r\\sin\\theta$ in polar.',
      'The "multiply by $r$" trick: if you see $\\cos\\theta$ alone (not $r\\cos\\theta$), multiply both sides by $r$ to create $r\\cos\\theta = x$. This is the move that converts $r = 2\\cos\\theta$ into $r^2 = 2r\\cos\\theta$. You are multiplying both sides by $r$, which is valid as long as $r \\neq 0$ (the origin is checked separately).',
      'Summary — converting polar to Cartesian: replace $r^2 \\to x^2+y^2$, $r\\cos\\theta \\to x$, $r\\sin\\theta \\to y$. If you have $\\cos\\theta$ alone, multiply by $r$ first. Converting Cartesian to polar: replace $x \\to r\\cos\\theta$, $y \\to r\\sin\\theta$, $x^2+y^2 \\to r^2$.',
    ],
    callouts: [
      {
        type: 'proof-map',
        title: 'Common polar curves and why they have those shapes',
        body: 'r = a: \\text{ every point distance }a\\text{ from origin} \\Rightarrow \\text{circle} \\\\ r = a\\cos\\theta: \\text{ circle through origin (just proved)} \\\\ r = a(1+\\cos\\theta): \\text{ cardioid — heart shape, }r=0\\text{ at }\\theta=180° \\\\ r = a\\cos(n\\theta): \\text{ rose — }n\\text{ petals (odd)}\\text{ or }2n\\text{ petals (even)}',
      },
      {
        type: 'warning',
        title: 'When to use polar vs Cartesian',
        body: '\\text{Use polar when the problem involves:} \\\\ \\bullet \\text{ circles centred at the origin} \\\\ \\bullet \\text{ distance from the origin (radars, waves, lenses)} \\\\ \\bullet \\text{ angular symmetry (roses, spirals, cardioids)} \\\\ \\text{Use Cartesian for lines, parabolas, anything with a clear x/y structure.}',
      },
    ],
    visualizations: [
      {
        id: 'PolarConversionViz',
        title: 'Switch to Polar Curves Mode — See Many Equations',
        mathBridge: '1. Select $r = a$ — observe a perfect circle. 2. Select $r = 2\\cos\\theta$ — trace it as $\\theta$ sweeps $0$ to $\\pi$ and confirm it closes at the origin. 3. Select the cardioid $r = 1+\\cos\\theta$ — pause at $\\theta = 180°$ where $r = 0$. 4. Select a rose curve and count the petals against the $n$ value in $\\cos(n\\theta)$. The key lesson: each curve\'s shape is a direct consequence of what $r$ does as $\\theta$ sweeps — trace slowly and the reason becomes visible.',
        caption: 'Each curve shape is a consequence of the equation, not a coincidence. Trace slowly to see why.',
      },
    ],
  },

  examples: [
    {
      id: 'ch5-001-ex1',
      title: 'Form 1: Point from polar to Cartesian',
      problem: '\\text{Convert } (4, 135°) \\text{ to Cartesian.}',
      steps: [
        {
          expression: 'x = 4\\cos135° = 4\\cdot(-\\tfrac{\\sqrt{2}}{2}) = -2\\sqrt{2} \\approx -2.83',
          annotation: '$\\cos135° = -\\sqrt{2}/2$ (QII, reference angle 45°).',
          hint: 'Use $x = r\\cos\\theta$. The angle 135° is in QII where cosine is negative. Reference angle is 45°.',
        },
        {
          expression: 'y = 4\\sin135° = 4\\cdot\\tfrac{\\sqrt{2}}{2} = 2\\sqrt{2} \\approx 2.83',
          annotation: '$\\sin135° = \\sqrt{2}/2$ (positive in QII).',
          hint: 'Use $y = r\\sin\\theta$. Sine is positive in QII.',
        },
      ],
      conclusion: 'The Cartesian coordinates are $(-2\\sqrt{2}, 2\\sqrt{2})$. Always evaluate the trig functions of the exact angle — $\\cos135° \\neq \\cos45°$ because the quadrant changes the sign.',
    },
    {
      id: 'ch5-001-ex2',
      title: 'Form 2: Point from Cartesian to polar',
      problem: '\\text{Convert } (-3, -3) \\text{ to polar form.}',
      steps: [
        {
          expression: 'r = \\sqrt{9+9} = 3\\sqrt{2}',
          annotation: 'Always positive for the principal polar form.',
          hint: 'Use $r = \\sqrt{x^2+y^2}$. The result is always non-negative.',
        },
        {
          expression: '\\arctan(-3/-3) = \\arctan(1) = 45°',
          annotation: 'But the point $(-3,-3)$ is in QIII — arctan gives 45° which is in QI. Wrong quadrant.',
          hint: 'Arctan gives the right ratio but ignores the quadrant. The signs of $x$ and $y$ individually tell you where the point really is.',
        },
        {
          expression: '\\theta = 45° + 180° = 225°',
          annotation: 'Add 180° to shift into QIII. Always draw the point and check.',
          hint: 'For QIII (both $x$ and $y$ negative), add 180° to the arctan result.',
        },
      ],
      conclusion: 'The polar form is $(3\\sqrt{2}, 225°)$. The arctan of $y/x$ does NOT give the correct angle when the point is in QII or QIII. The signs of $x$ and $y$ individually tell you the quadrant.',
    },
    {
      id: 'ch5-001-ex3',
      title: 'Form 3: Polar equation to Cartesian',
      problem: '\\text{Convert } r = 4\\sin\\theta \\text{ to Cartesian.}',
      steps: [
        {
          expression: 'r \\cdot r = 4\\sin\\theta \\cdot r \\quad \\Rightarrow \\quad r^2 = 4r\\sin\\theta',
          annotation: 'Multiply by $r$ to create $r^2$ and $r\\sin\\theta$.',
          hint: 'There is a lone $\\sin\\theta$ (not $r\\sin\\theta$), so multiply both sides by $r$ to create the substitution target.',
        },
        {
          expression: 'x^2+y^2 = 4y \\quad \\Rightarrow \\quad x^2+(y-2)^2 = 4',
          annotation: 'Substitute, then complete the square on $y$. Circle centred at $(0,2)$, radius 2.',
          hint: 'Substitute $r^2 = x^2+y^2$ and $r\\sin\\theta = y$. Then move $4y$ left and complete the square.',
        },
      ],
      conclusion: 'The polar equation $r = 4\\sin\\theta$ is a circle centred at $(0,2)$ with radius 2. Multiplying by $r$ can introduce $r=0$ (the origin) as an extraneous point — check whether the origin satisfies the original equation.',
    },
    {
      id: 'ch5-001-ex4',
      title: 'Form 4: Cartesian equation to polar',
      problem: '\\text{Convert } y = 3x + 2 \\text{ to polar form.}',
      steps: [
        {
          expression: 'r\\sin\\theta = 3(r\\cos\\theta) + 2',
          annotation: 'Replace $y \\to r\\sin\\theta$, $x \\to r\\cos\\theta$.',
          hint: 'Substitute $x = r\\cos\\theta$ and $y = r\\sin\\theta$ directly.',
        },
        {
          expression: 'r\\sin\\theta - 3r\\cos\\theta = 2 \\quad \\Rightarrow \\quad r(\\sin\\theta - 3\\cos\\theta) = 2',
          annotation: 'Factor out $r$.',
          hint: 'Factor $r$ from the left side.',
        },
        {
          expression: 'r = \\frac{2}{\\sin\\theta - 3\\cos\\theta}',
          annotation: 'Solve for $r$. This is the polar form of a straight line not through the origin.',
          hint: 'Divide both sides by the trig expression.',
        },
      ],
      conclusion: 'The polar form is $r = \\frac{2}{\\sin\\theta - 3\\cos\\theta}$. Straight lines not through the origin have messy polar equations. Lines through the origin are simply $\\theta = \\text{constant}$ — much cleaner.',
    },
  ],

  challenges: [
    {
      id: 'ch5-001-ch1',
      difficulty: 'medium',
      problem: '\\text{Prove that } r = \\sin\\theta + \\cos\\theta \\text{ is a circle. Find its centre and radius.}',
      hint: 'Multiply by $r$, substitute, then complete the square on both $x$ and $y$.',
      walkthrough: [
        {
          expression: 'r^2 = r\\sin\\theta + r\\cos\\theta \\Rightarrow x^2+y^2 = y+x',
          annotation: 'Multiply by $r$, substitute.',
        },
        {
          expression: '(x-\\tfrac{1}{2})^2 + (y-\\tfrac{1}{2})^2 = \\tfrac{1}{2}',
          annotation: 'Complete the square on both $x$ and $y$.',
        },
      ],
      answer: '\\text{Circle, centre }(\\tfrac{1}{2},\\tfrac{1}{2}), \\text{ radius }\\tfrac{\\sqrt{2}}{2}',
    },
  ],

  crossRefs: [
    { slug: 'complex-polar-demoivre', reason: 'Complex numbers in polar form use the same $r$ and $\\theta$ — modulus is $r$, argument is $\\theta$.' },
    { slug: 'trig-ratios-right-triangles', reason: 'The entire conversion between polar and Cartesian is just SOH-CAH-TOA applied to the coordinate right triangle.' },
    { slug: 'vectors-2d', reason: 'Vector components use the same $x = r\\cos\\theta$, $y = r\\sin\\theta$ decomposition as polar-to-Cartesian conversion.' },
  ],

  checkpoints: [
    'Can you convert a point from polar to Cartesian using $x = r\\cos\\theta$, $y = r\\sin\\theta$?',
    'Can you convert a point from Cartesian to polar, correctly adjusting for the quadrant?',
    'Can you convert $r = 2\\cos\\theta$ to Cartesian form and identify it as a circle?',
    'Do you know the "multiply by $r$" trick and when to use it?',
    'Can you decide whether a problem is easier in polar or Cartesian coordinates?',
  ],

  semantics: {
    symbols: [
      { symbol: 'r', meaning: 'Polar distance from the origin; equals $\\sqrt{x^2+y^2}$; non-negative in principal form (negative $r$ means walk backwards).' },
      { symbol: '\\theta', meaning: 'Polar angle measured CCW from the positive $x$-axis; not unique — adding $2\\pi k$ gives the same point.' },
      { symbol: 'r^2 = x^2+y^2', meaning: 'Pythagorean theorem applied to the coordinate right triangle; most useful substitution for equation conversion.' },
      { symbol: 'r\\cos\\theta = x', meaning: 'Horizontal leg of the coordinate triangle; substitute $x$ with this when converting Cartesian to polar.' },
      { symbol: 'r\\sin\\theta = y', meaning: 'Vertical leg of the coordinate triangle; substitute $y$ with this when converting Cartesian to polar.' },
    ],
    rulesOfThumb: [
      'Always draw the point before computing $\\theta$ — the picture tells you which quadrant adjustment to make.',
      'When you see $\\cos\\theta$ alone in a polar equation, multiply both sides by $r$ to create $r\\cos\\theta = x$.',
      'Use polar when the problem involves circles at the origin, radial symmetry, or distance from a central point. Use Cartesian for lines and rectangular structures.',
      'The polar address of a point is not unique: $(r, \\theta) = (r, \\theta+2\\pi) = (-r, \\theta+\\pi)$.',
    ],
  },

  spiral: {
    recoveryPoints: [
      { topic: 'Right triangle trigonometry', where: 'trig-ratios-right-triangles', why: 'The conversion between polar and Cartesian is entirely built on $\\sin$, $\\cos$, and $\\tan$ in right triangles.' },
      { topic: 'Completing the square', where: 'quadratics', why: 'Converting $r = 2\\cos\\theta$ to Cartesian requires completing the square to reveal the circle equation.' },
      { topic: 'Circle equations', where: 'graphs-foundations', why: '$(x-h)^2+(y-k)^2 = r^2$ is the target form after converting polar circle equations.' },
    ],
    futureLinks: [
      { topic: 'Complex polar form', where: 'complex-polar-demoivre', why: 'Complex numbers use the same $(r, \\theta)$ coordinates — modulus = $r$, argument = $\\theta$.' },
      { topic: 'Polar area integrals', where: 'integral-calculus-polar', why: '$A = \\frac{1}{2}\\int r^2\\,d\\theta$ — summing thin triangular sectors around the origin.' },
      { topic: 'Cylindrical coordinates', where: 'multivariable-calculus-intro', why: 'Cylindrical coordinates are polar + a vertical $z$ axis; used in 3D integrals over cylindrical regions.' },
    ],
  },

  assessment: [
    { question: 'Convert $(5, 0°)$ from polar to Cartesian.', answer: '$(5, 0)$', difficulty: 'quick-fire' },
    { question: 'What is the Cartesian equivalent of $r = 7$?', answer: '$x^2+y^2 = 49$ (circle, radius 7)', difficulty: 'quick-fire' },
    { question: 'Convert $(0, -4)$ from Cartesian to polar.', answer: '$(4, 270°)$', difficulty: 'quick-fire' },
    { question: 'What trick do you use when $\\cos\\theta$ appears alone in a polar equation?', answer: 'Multiply both sides by $r$ to create $r\\cos\\theta = x$.', difficulty: 'quick-fire' },
    { question: 'How many polar addresses does a single point have?', answer: 'Infinitely many — adding $2\\pi k$ to $\\theta$ or using $-r$ with $\\theta+\\pi$ all give the same point.', difficulty: 'quick-fire' },
  ],

  mentalModel: [
    'Every point has two addresses: Cartesian (right and up) and polar (how far and which way). They are related by a single right triangle.',
    'The conversion is not a formula — it is the sides of that triangle: $x = r\\cos\\theta$, $y = r\\sin\\theta$, $r = \\sqrt{x^2+y^2}$.',
    'Polar addresses are not unique. The same point has infinitely many polar representations, which gives freedom when writing and solving polar equations.',
    'The "multiply by $r$" trick converts a lone $\\cos\\theta$ or $\\sin\\theta$ into $r\\cos\\theta = x$ or $r\\sin\\theta = y$ — the substitution target. It is the single most important move in polar equation conversion.',
    'Coordinate system choice matters: polar for circles, radial curves, and rotation; Cartesian for lines, parabolas, and grid-aligned structures.',
  ],

  quiz: [
    {
      id: 'pc-q1',
      type: 'multiple-choice',
      text: 'Convert the polar point $(6, 90°)$ to Cartesian.',
      options: ['(6, 0)', '(0, 6)', '(6, 6)', '(3, 3\\sqrt{3})'],
      answer: '(0, 6)',
      hints: ['$x = 6\\cos90° = 0$, $y = 6\\sin90° = 6$.'],
      reviewSection: 'Examples tab — Form 1: Point from polar to Cartesian',
    },
    {
      id: 'pc-q2',
      type: 'multiple-choice',
      text: 'What is the polar form of the Cartesian point $(0, -5)$?',
      options: ['(5, 0°)', '(5, 90°)', '(5, 270°)', '(-5, 90°)'],
      answer: '(5, 270°)',
      hints: ['$r = \\sqrt{0^2+(-5)^2} = 5$. The point is on the negative $y$-axis, which is $\\theta = 270°$.'],
      reviewSection: 'Examples tab — Form 2: Point from Cartesian to polar',
    },
    {
      id: 'pc-q3',
      type: 'multiple-choice',
      text: 'Convert $(-\\sqrt{3}, -1)$ to polar. What is $\\theta$?',
      options: ['30°', '150°', '210°', '330°'],
      answer: '210°',
      hints: ['$\\arctan((-1)/(-\\sqrt{3})) = \\arctan(1/\\sqrt{3}) = 30°$. Both coordinates are negative → QIII. Add 180°.'],
      reviewSection: 'Examples tab — Form 2: Quadrant adjustment',
    },
    {
      id: 'pc-q4',
      type: 'multiple-choice',
      text: 'What Cartesian equation does $r = 6$ represent?',
      options: ['y = 6', 'x = 6', 'x^2 + y^2 = 36', 'x^2 + y^2 = 6'],
      answer: 'x^2 + y^2 = 36',
      hints: ['$r = 6$ means $\\sqrt{x^2+y^2} = 6$, so $x^2+y^2 = 36$.'],
      reviewSection: 'Math tab — common polar curves',
    },
    {
      id: 'pc-q5',
      type: 'multiple-choice',
      text: 'To convert $r = 3\\cos\\theta$ to Cartesian, what is the first step?',
      options: [
        'Square both sides',
        'Multiply both sides by $r$',
        'Substitute $r = \\sqrt{x^2+y^2}$',
        'Divide both sides by $\\cos\\theta$',
      ],
      answer: 'Multiply both sides by $r$',
      hints: ['You need $r\\cos\\theta = x$ as a substitution target. Multiplying by $r$ creates $r^2 = 3r\\cos\\theta$.'],
      reviewSection: 'Rigor tab — proving r = 2cosθ is a circle',
    },
    {
      id: 'pc-q6',
      type: 'multiple-choice',
      text: 'After the multiply-by-$r$ trick on $r = 3\\cos\\theta$ and substituting, you get $x^2+y^2 = 3x$. Completing the square gives which circle?',
      options: [
        '(x-3)^2+y^2=9',
        '(x-3/2)^2+y^2=9/4',
        '(x+3/2)^2+y^2=9/4',
        'x^2+(y-3/2)^2=9/4',
      ],
      answer: '(x-3/2)^2+y^2=9/4',
      hints: ['Rearrange to $x^2-3x+y^2=0$, then add $(3/2)^2 = 9/4$ to both sides.'],
      reviewSection: 'Rigor tab — completing the square on a polar circle',
    },
    {
      id: 'pc-q7',
      type: 'multiple-choice',
      text: 'What is the polar equation of the Cartesian line $x = 4$?',
      options: [
        'r = 4',
        'r\\cos\\theta = 4',
        'r\\sin\\theta = 4',
        '\\theta = 4',
      ],
      answer: 'r\\cos\\theta = 4',
      hints: ['Substitute $x = r\\cos\\theta$ into $x = 4$.'],
      reviewSection: 'Examples tab — Form 4: Cartesian equation to polar',
    },
    {
      id: 'pc-q8',
      type: 'multiple-choice',
      text: 'Which of the following is another valid polar representation of the point $(3, 45°)$?',
      options: ['(3, 225°)', '(-3, 225°)', '(-3, 135°)', '(3, -45°)'],
      answer: '(-3, 225°)',
      hints: ['$(r, \\theta) = (-r, \\theta + 180°)$. Replacing $r=3$ with $r=-3$ and $\\theta$ with $\\theta+180°$ gives the same point.'],
      reviewSection: 'Intuition tab — non-uniqueness of polar addresses',
    },
    {
      id: 'pc-q9',
      type: 'multiple-choice',
      text: 'The polar equation $r = a\\cos(3\\theta)$ is a rose curve. How many petals does it have?',
      options: ['3', '6', '2', '9'],
      answer: '3',
      hints: ['For $r = a\\cos(n\\theta)$: odd $n$ gives $n$ petals, even $n$ gives $2n$ petals. Here $n=3$ is odd.'],
      reviewSection: 'Math tab — common polar curves',
    },
    {
      id: 'pc-q10',
      type: 'multiple-choice',
      text: 'A radar detects an object at 80 km, bearing 030°. Why do engineers keep this in polar form rather than converting to $(x, y)$?',
      options: [
        'Polar form is always more accurate',
        'Converting requires trig computations that are computationally expensive at high volume',
        'Cartesian coordinates cannot represent bearings',
        'The arctan function is not available in radar software',
      ],
      answer: 'Converting requires trig computations that are computationally expensive at high volume',
      hints: ['Every conversion costs one square root, one arctangent, and two multiplications. At thousands of objects per second, this adds up.'],
      reviewSection: 'Intuition tab — converting between representations',
    },
  ],
}
