export default {
  id: 'precalc5-002',
  slug: 'complex-polar-demoivre',
  chapter: 'precalc-5',
  order: 2,
  title: "Complex Numbers in Polar Form and De Moivre's Theorem",
  subtitle: "Multiplying complex numbers rotates and scales — once you see that, De Moivre's theorem stops being a miracle and becomes obvious",
  tags: ['complex polar form', 'modulus', 'argument', 'De Moivre theorem', 'nth roots', 'complex multiplication', 'rotation', 'Euler formula'],
  aliases: "complex number polar form modulus argument De Moivre theorem nth roots multiplication rotation scaling Euler formula trig form",

  hook: {
    question: "Why does $(\\cos\\theta + i\\sin\\theta)^n = \\cos(n\\theta) + i\\sin(n\\theta)$? On its face this looks like a lucky coincidence. But if complex multiplication is rotation, then doing $n$ rotations of $\\theta$ each is just one rotation of $n\\theta$. The miracle evaporates completely.",
    realWorldContext: "AC circuit analysis, signal processing, and control systems all use complex polar form because multiplying two complex exponentials is trivial: magnitudes multiply, angles add. The Fourier transform — which underlies MP3, JPEG, MRI, and radar — is built entirely on this. Every time your phone plays music, it is performing millions of complex polar multiplications per second.",
    previewVisualizationId: 'ComplexPolarViz',
  },

  // ── PILLAR 1: What it IS ───────────────────────────────────────────────────
  intuition: {
    pillar: 1,
    pillarLabel: 'What it IS — complex numbers live on a plane, multiplication rotates them',
    prose: [
      'A complex number $a + bi$ is a point in a plane where the horizontal axis holds real numbers and the vertical axis holds imaginary numbers. Every complex number has a distance from the origin ($r = |z| = \\sqrt{a^2+b^2}$, called the modulus) and an angle from the positive real axis ($\\theta = \\arg(z)$, called the argument). These two numbers completely describe the complex number — this is polar form.',
      'Multiplying two complex numbers does something beautiful geometrically: the moduli multiply and the arguments add. So $z_1 \\times z_2$ has distance $|z_1| \\cdot |z_2|$ from the origin and angle $\\theta_1 + \\theta_2$. In plain English: multiplication scales by the modulus and rotates by the argument.',
      'This rotation interpretation makes $i^2 = -1$ completely natural. In polar form, $i = (1, 90°)$ — unit length, pointing straight up. Multiplying $i \\times i$ gives modulus $1 \\times 1 = 1$ and angle $90° + 90° = 180°$. A complex number at angle $180°$ with length 1 is exactly $-1$. No axioms, no definition — just geometry.',
    ],
    callouts: [
      {
        type: 'insight',
        title: 'Why i² = −1 is geometrically obvious',
        body: 'i = (1, 90°) \\text{ — unit length, pointing up.} \\\\ i \\times i: \\text{ lengths } 1\\times1=1, \\text{ angles } 90°+90°=180°. \\\\ (1, 180°) = -1 \\quad \\text{(180° is the negative real axis).} \\\\ \\text{Two quarter-turns is a half-turn. A half-turn reverses direction. That IS } -1.',
      },
      {
        type: 'definition',
        title: 'Polar form and the multiplication rule',
        body: 'z = a+bi = r(\\cos\\theta+i\\sin\\theta) = re^{i\\theta} \\\\ r = |z| = \\sqrt{a^2+b^2} \\quad \\theta = \\arctan(b/a) \\text{ (adjust for quadrant)} \\\\ z_1 z_2 = r_1 r_2\\,e^{i(\\theta_1+\\theta_2)} \\\\ |z_1 z_2| = |z_1||z_2| \\quad \\arg(z_1 z_2) = \\arg z_1 + \\arg z_2',
      },
      {
        type: 'insight',
        title: "De Moivre's theorem as repeated rotation",
        body: 'z^n: \\text{ do } n \\text{ rotations of } \\theta, \\text{ each scaling by } r. \\\\ \\text{Total angle: } n\\theta. \\quad \\text{Total scale: } r^n. \\\\ [r(\\cos\\theta+i\\sin\\theta)]^n = r^n(\\cos n\\theta+i\\sin n\\theta) \\\\ \\text{Not a theorem requiring proof — a direct consequence of the rotation interpretation.}',
      },
    ],
    visualizations: [
      {
        id: 'ComplexPolarViz',
        title: 'Drag z₁ and z₂ — Watch z₁z₂ Rotate and Scale',
        mathBridge: 'Drag the two complex numbers. The product updates live. Its angle is the sum of the two angles, its length is the product of the two lengths. No algebra — just rotation.',
        caption: 'Multiplication is rotation + scaling. That is all it ever is.',
      },
    ],
  },

  // ── PILLAR 2: Why it's TRUE ────────────────────────────────────────────────
  rigor: {
    pillar: 2,
    pillarLabel: "Why it's TRUE — proving De Moivre's by induction",
    title: "Formal proof that $(\\cos\\theta+i\\sin\\theta)^n = \\cos n\\theta+i\\sin n\\theta$",
    prerequisiteRecap: {
      title: 'What you need to follow this proof',
      items: [
        { concept: 'Mathematical induction', statement: 'Prove a base case, then prove that if it holds for $k$ it holds for $k+1$. This covers all positive integers.', linkedLesson: 'mathematical-induction' },
        { concept: 'Angle addition formulas', statement: '$\\cos(A+B) = \\cos A\\cos B - \\sin A\\sin B$, $\\sin(A+B) = \\sin A\\cos B + \\cos A\\sin B$', linkedLesson: 'trig-identities-deep-dive' },
        { concept: 'Complex multiplication', statement: '$(a+bi)(c+di) = (ac-bd) + (ad+bc)i$', linkedLesson: null },
      ],
    },
    proofSteps: [
      {
        expression: '\\text{Base case } n=1: (\\cos\\theta+i\\sin\\theta)^1 = \\cos\\theta+i\\sin\\theta = \\cos(1\\cdot\\theta)+i\\sin(1\\cdot\\theta). \\checkmark',
        annotation: 'Trivially true. The statement holds for $n=1$.',
        geometricAnchor: 'One rotation by $\\theta$: angle is $\\theta$, modulus is 1. Exactly what the formula says.',
      },
      {
        expression: '\\text{Assume: } (\\cos\\theta+i\\sin\\theta)^k = \\cos(k\\theta)+i\\sin(k\\theta).',
        annotation: 'Inductive hypothesis. We assume it works for $n=k$ and will show it works for $n=k+1$.',
        geometricAnchor: '$k$ rotations of $\\theta$ each gives total angle $k\\theta$. We are assuming this.',
      },
      {
        expression: '(\\cos\\theta+i\\sin\\theta)^{k+1} = [\\cos(k\\theta)+i\\sin(k\\theta)] \\cdot (\\cos\\theta+i\\sin\\theta)',
        annotation: 'Factor out one copy. The bracketed part is the inductive hypothesis.',
        geometricAnchor: 'One more rotation on top of $k$ rotations. The new total should be $(k+1)\\theta$.',
      },
      {
        expression: '= (\\cos k\\theta\\cos\\theta - \\sin k\\theta\\sin\\theta) + i(\\sin k\\theta\\cos\\theta + \\cos k\\theta\\sin\\theta)',
        annotation: 'Expand using $(a+bi)(c+di) = (ac-bd)+(ad+bc)i$. This is pure algebra.',
        geometricAnchor: null,
      },
      {
        expression: '= \\cos(k\\theta+\\theta) + i\\sin(k\\theta+\\theta) = \\cos((k+1)\\theta)+i\\sin((k+1)\\theta) \\qquad \\blacksquare',
        annotation: 'Recognise the angle addition formulas. The real part is $\\cos(A+B)$ with $A=k\\theta$, $B=\\theta$. The imaginary part is $\\sin(A+B)$.',
        geometricAnchor: 'Adding the new $\\theta$ rotation to the existing $k\\theta$ gives $(k+1)\\theta$ total. The formula holds.',
      },
    ],
  },

  // ── PILLAR 3: How the algebra CONNECTS ────────────────────────────────────
  math: {
    pillar: 3,
    pillarLabel: 'How the algebra CONNECTS — nth roots formula unpacked',
    prose: [
      'The nth roots formula is derived from asking: "what polar numbers $w$ satisfy $w^n = z$?" Every symbol in the result has a geometric meaning.',
    ],
    annotatedDerivation: {
      title: 'Where the nth roots formula comes from — step by step',
      steps: [
        {
          expression: '\\text{Want: } w \\text{ such that } w^n = z. \\text{ Write } w = \\rho e^{i\\phi} \\text{ and } z = re^{i\\theta}.',
          plain: 'Use polar form for both. $\\rho$ and $\\phi$ are the unknown modulus and argument of $w$.',
          prereq: null,
        },
        {
          expression: 'w^n = \\rho^n e^{in\\phi} = re^{i\\theta}',
          plain: "Apply De Moivre's to the left side. Now equate moduli and arguments separately.",
          prereq: "De Moivre's: raising to the $n$th power raises modulus to $n$th power and multiplies argument by $n$.",
        },
        {
          expression: '\\rho^n = r \\Rightarrow \\rho = r^{1/n}',
          plain: 'Moduli must be equal. The modulus of each root is the $n$th root of the modulus of $z$. All $n$ roots have the same modulus.',
          prereq: null,
        },
        {
          expression: 'n\\phi = \\theta + 2\\pi k \\quad k = 0,1,2,\\ldots,n-1',
          plain: 'Arguments must be equal — but two angles are equal if they differ by a full rotation $2\\pi k$. This gives $n$ different values of $k$ before repeating.',
          prereq: 'Angles that differ by $2\\pi$ describe the same direction. So $e^{i\\alpha} = e^{i(\\alpha+2\\pi)}$. The $k$ counts how many extra full rotations we allow.',
        },
        {
          expression: '\\phi_k = \\frac{\\theta + 2\\pi k}{n} \\quad \\Rightarrow \\quad w_k = r^{1/n}\\!\\left(\\cos\\frac{\\theta+2\\pi k}{n} + i\\sin\\frac{\\theta+2\\pi k}{n}\\right)',
          plain: 'Solve for $\\phi$. Each value of $k$ gives a different root. The $n$ roots are equally spaced because consecutive roots differ by $2\\pi/n$ in angle.',
          prereq: null,
        },
      ],
      summary: "The $n$ roots of $z$ are equally spaced on a circle of radius $r^{1/n}$ because each comes from adding one more $2\\pi/n$ step around the circle. The formula is not arbitrary — it's what you get when you solve $w^n = z$ in polar form.",
    },
    callouts: [
      {
        type: 'theorem',
        title: 'nth roots — equally spaced on a circle',
        body: 'w_k = r^{1/n}\\!\\left(\\cos\\frac{\\theta+2\\pi k}{n} + i\\sin\\frac{\\theta+2\\pi k}{n}\\right), \\; k=0,\\ldots,n-1 \\\\ \\text{Count: exactly } n \\text{ roots. Spacing: } 2\\pi/n. \\text{ Radius: } r^{1/n}.',
      },
      {
        type: 'insight',
        title: "Using De Moivre's to derive trig identities",
        body: '(\\cos\\theta+i\\sin\\theta)^2 = \\cos2\\theta + i\\sin2\\theta \\quad \\text{(De Moivre\'s)} \\\\ \\text{Also} = \\cos^2\\theta - \\sin^2\\theta + 2i\\sin\\theta\\cos\\theta \\quad \\text{(expand)} \\\\ \\text{Equate real/imaginary: } \\cos2\\theta = \\cos^2\\theta-\\sin^2\\theta, \\; \\sin2\\theta = 2\\sin\\theta\\cos\\theta',
      },
    ],
    visualizations: [
      {
        id: 'ComplexPolarViz',
        title: 'Switch to nth Roots — Polygon Appears',
        mathBridge: 'Switch to roots mode and change $n$. The $n$ equally spaced roots of 1 form a regular polygon — triangle for $n=3$, square for $n=4$. Increase $n$ slowly and watch the polygon grow.',
        caption: 'The roots of unity are the vertices of a regular $n$-gon. One of the most surprising and beautiful results in all of mathematics.',
      },
    ],
  },

  // ── PILLAR 4: A different ANALOGY ─────────────────────────────────────────
  analogy: {
    pillar: 4,
    pillarLabel: 'A different lens — complex multiplication as a transformation machine',
    title: 'Multiplication as transformation: rotation + dilation',
    prose: [
      'Think of a complex number $z = re^{i\\theta}$ as an instruction: "rotate by $\\theta$, then scale by $r$." Multiplying any complex number $w$ by $z$ applies that instruction to $w$. The result is $w$ rotated by $\\theta$ and scaled by $r$.',
      'This makes division obvious too: $w/z$ undoes the instruction — rotates by $-\\theta$ and scales by $1/r$. Complex conjugate $\\bar{z} = re^{-i\\theta}$ is "rotate backwards" — it reflects over the real axis.',
      'In computer graphics, every rotation and scaling of an object in the complex plane is a multiplication. Two successive rotations — rotate by $\\alpha$ then by $\\beta$ — is just multiplying $e^{i\\alpha} \\times e^{i\\beta} = e^{i(\\alpha+\\beta)}$. The angle adds. This is why complex numbers are used to represent 2D rotations in game engines.',
    ],
    callouts: [
      {
        type: 'insight',
        title: 'The power of the rotation view',
        body: 'z = e^{i\\theta}: \\text{ pure rotation by } \\theta, \\text{ no scaling.} \\\\ z = re^{i\\theta}: \\text{ scale by } r \\text{ AND rotate by } \\theta. \\\\ z^n = r^n e^{in\\theta}: \\text{ scale } n \\text{ times, rotate } n \\text{ times.} \\\\ \\text{Graphics, robotics, signal processing all use this.}',
      },
    ],
  },

  // ── PILLAR 5: PRACTICE ────────────────────────────────────────────────────
  examples: [
    {
      id: 'ch5-002-ex1',
      pillar: 5,
      title: 'Form 1: Converting to polar form',
      problem: '\\text{Write } z = -2 + 2i \\text{ in polar form.}',
      steps: [
        { expression: 'r = \\sqrt{4+4} = 2\\sqrt{2}', annotation: 'Modulus.' },
        { expression: '\\arctan(2/-2) = \\arctan(-1) = -45°. \\text{ But } z \\text{ is in QII, so } \\theta = -45°+180° = 135°.', annotation: 'Argument — adjust for quadrant.' },
        { expression: 'z = 2\\sqrt{2}\\,(\\cos135°+i\\sin135°)', annotation: 'Polar form.' },
      ],
      watchFor: 'Always check the quadrant. $-2+2i$ has negative real part and positive imaginary part → QII. The arctan result $-45°$ is in QIV — wrong quadrant, add $180°$.',
    },
    {
      id: 'ch5-002-ex2',
      pillar: 5,
      title: 'Form 2: Multiplying in polar form',
      problem: '\\text{Compute } (1+i)(\\sqrt{3}-i) \\text{ using polar form.}',
      steps: [
        { expression: '1+i = \\sqrt{2}\\,e^{i\\pi/4} \\qquad \\sqrt{3}-i = 2\\,e^{-i\\pi/6}', annotation: 'Convert each to polar.' },
        { expression: '\\text{Product: modulus } \\sqrt{2}\\cdot2=2\\sqrt{2}, \\text{ angle } \\pi/4-\\pi/6=\\pi/12.', annotation: 'Multiply moduli, add angles.' },
        { expression: '2\\sqrt{2}\\,(\\cos15°+i\\sin15°)', annotation: 'Answer in polar form.' },
      ],
      watchFor: 'Adding angles in polar multiplication means you add SIGNED angles — $\\pi/4$ and $-\\pi/6$ give $\\pi/12$, not $\\pi/4+\\pi/6$.',
    },
    {
      id: 'ch5-002-ex3',
      pillar: 5,
      title: 'Form 3: Large power using De Moivre',
      problem: '\\text{Compute } (1+i)^{10}.',
      steps: [
        { expression: '1+i = \\sqrt{2}\\,e^{i\\pi/4}', annotation: 'Polar form.' },
        { expression: '(1+i)^{10} = (\\sqrt{2})^{10}\\,e^{i10\\pi/4} = 32\\,e^{i5\\pi/2}', annotation: "De Moivre's." },
        { expression: '5\\pi/2 = 2\\pi + \\pi/2 \\Rightarrow e^{i5\\pi/2} = e^{i\\pi/2} = i', annotation: 'Reduce modulo $2\\pi$.' },
        { expression: '(1+i)^{10} = 32i', annotation: 'Clean exact answer. Try expanding by hand to appreciate why polar is faster.' },
      ],
      watchFor: 'After computing $n\\theta$, always reduce modulo $2\\pi$ to find the simplest equivalent angle. $5\\pi/2$ and $\\pi/2$ describe the same direction.',
    },
    {
      id: 'ch5-002-ex4',
      pillar: 5,
      title: 'Form 4: Finding all nth roots',
      problem: '\\text{Find all cube roots of } -8.',
      steps: [
        { expression: '-8 = 8e^{i\\pi} \\quad (r=8, \\theta=\\pi)', annotation: '$-8$ is on the negative real axis, modulus 8.' },
        { expression: '\\rho = 8^{1/3} = 2 \\quad \\phi_k = \\frac{\\pi+2\\pi k}{3}, \\; k=0,1,2', annotation: 'Root modulus and angles.' },
        { expression: 'w_0 = 2e^{i\\pi/3} = 1+\\sqrt{3}i \\quad w_1 = 2e^{i\\pi} = -2 \\quad w_2 = 2e^{i5\\pi/3} = 1-\\sqrt{3}i', annotation: 'Convert each to rectangular. The real cube root $-2$ is $w_1$.' },
      ],
      watchFor: 'There are THREE cube roots — not just $-2$. Students often stop at $-2$ because it is obvious. The other two are complex and equally valid.',
    },
  ],

  challenges: [
    {
      id: 'ch5-002-ch1',
      difficulty: 'medium',
      problem: "\\text{Use De Moivre's to derive } \\cos 3\\theta = 4\\cos^3\\theta - 3\\cos\\theta.",
      hint: 'Expand $(\\cos\\theta+i\\sin\\theta)^3$ with the binomial theorem and equate real parts.',
      watchFor: 'Remember $i^2=-1$ and $i^3=-i$ when expanding. Collect real and imaginary parts separately.',
      walkthrough: [
        { expression: '(c+is)^3 = c^3+3c^2(is)+3c(is)^2+(is)^3 = c^3+3ic^2s-3cs^2-is^3', annotation: 'Expand.' },
        { expression: '\\text{Real part: } c^3-3cs^2 = \\cos^3\\theta-3\\cos\\theta\\sin^2\\theta = \\cos^3\\theta-3\\cos\\theta(1-\\cos^2\\theta)', annotation: 'Use $\\sin^2=1-\\cos^2$.' },
        { expression: '= 4\\cos^3\\theta-3\\cos\\theta = \\cos 3\\theta \\qquad \\blacksquare', annotation: "By De Moivre's, real part of $(c+is)^3$ is $\\cos3\\theta$." },
      ],
      answer: '\\cos 3\\theta = 4\\cos^3\\theta - 3\\cos\\theta',
    },
  ],

  calcBridge: {
    teaser: "Euler's formula $e^{i\\theta} = \\cos\\theta+i\\sin\\theta$ is the bridge between exponential and trig functions in calculus. It explains why $\\int e^{ax}\\cos(bx)\\,dx$ can be solved by treating $\\cos(bx)$ as the real part of $e^{ibx}$. In differential equations, complex characteristic roots $\\alpha \\pm \\beta i$ give solutions $e^{\\alpha t}\\cos(\\beta t)$ and $e^{\\alpha t}\\sin(\\beta t)$ — the polar form of a spiral. Fourier analysis decomposes any periodic function into a sum of complex exponentials $e^{in\\theta}$.",
    linkedLessons: ['polar-coordinates-deep', 'trig-identities-deep-dive'],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Euler\'s formula: e^(iθ) = cos(θ) + i·sin(θ). What does this say about e^(iπ)?',
      options: [
        'e^(iπ) = cos(π) + i·sin(π) = -1 + i·0 = -1, giving e^(iπ) + 1 = 0 — Euler\'s identity, connecting the five most fundamental constants in mathematics (e, i, π, 1, 0) in one equation',
        'e^(iπ) = eπ (the real part only, since imaginary parts cancel)',
        'e^(iπ) is undefined because you cannot raise e to a complex power',
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Polar form: z = r·e^(iθ) = r(cos θ + i sin θ). When you MULTIPLY two complex numbers in polar form, what happens to r and θ?',
      options: [
        'Both r and θ add: (r₁+r₂)·e^(i(θ₁+θ₂))',
        'r values multiply and θ values add: r₁e^(iθ₁)·r₂e^(iθ₂) = r₁r₂·e^(i(θ₁+θ₂)); multiplication in the complex plane is a ROTATION by θ₂ and a SCALING by r₂',
        'Both r and θ multiply: (r₁r₂)·e^(i·θ₁θ₂)',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'De Moivre\'s theorem: (cos θ + i sin θ)ⁿ = cos(nθ) + i sin(nθ). How is this used to find cos(3θ) in terms of cos(θ)?',
      options: [
        'Substitute 3θ into the cosine power series expansion',
        'Expand (cos θ + i sin θ)³ using the binomial theorem, then separate real and imaginary parts. The real part gives cos(3θ); collecting cos and sin terms and using sin²θ = 1-cos²θ gives the triple angle formula cos(3θ) = 4cos³θ - 3cos θ',
        'Apply cos(3θ) = cos(2θ+θ) repeatedly using the addition formula',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'The nth roots of unity are the n solutions to zⁿ = 1. Why are they equally spaced around the unit circle?',
      options: [
        'By convention — roots are defined to be evenly distributed',
        'Each root has |z| = 1 (on the unit circle) and argument θ = 2πk/n for k = 0, 1, ..., n-1 (from De Moivre: e^(i·2πk/n))ⁿ = e^(i·2πk) = 1). Equal angle increments of 2π/n between consecutive roots place them exactly evenly around the circle',
        'The equal spacing is only true for prime values of n',
      ],
      correct: 1,
    },
  ],
}
