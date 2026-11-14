export default {
  id: 'p1-ch8-001',
  slug: 'hookes-law',
  chapter: 'p8',
  order: 1,
  title: "Hooke's Law: The Restoring Force",
  subtitle: 'Springs push back proportionally to how far you push them — until they don\'t.',
  tags: ['Hooke\'s Law', 'spring constant', 'restoring force', 'elastic limit', 'F = -kx', 'spring energy'],

  hook: {
    question:
      'You stretch a spring gently — it pulls back. You stretch it twice as far — it pulls back twice as hard. Three times as far — three times as hard. But then you stretch it too far — and suddenly it doesn\'t spring back at all. What is the law governing the first part, and what breaks it in the second?',
    realWorldContext:
      'Hooke\'s Law is the foundation of every spring, every elastic material, and every oscillating system. Suspension bridges sway with it. Atomic bonds obey it near equilibrium. Every musical instrument string vibrates because of it. Even the bonds between atoms in a solid act like tiny springs — which is why solids have a Young\'s modulus and why sound travels through them.',
    previewVisualizationId: 'SpringOscillation',
  },

  intuition: {
    prose: [
      '**The law:** Within the elastic limit, the restoring force of a spring is proportional to its displacement: \\(F = -kx\\). The minus sign is crucial — it means the force always acts opposite to the displacement, pushing or pulling the spring back toward equilibrium.',

      '**The elastic limit:** The linear relationship holds only up to a certain extension. Beyond this, the material deforms permanently (plastic deformation) and Hooke\'s Law fails. A rubber band, a spring, a steel beam — all are Hookean for small deformations and non-Hookean for large ones. Physics begins with the linear region.',

      '**The spring constant k:** A stiff spring has a large k (requires more force per metre of stretch). A soft spring has a small k. Units: N/m. A car suspension spring might have k ≈ 20,000 N/m; a watch spring k ≈ 0.001 N/m; an atomic bond k ≈ 10 N/m.',

      '**Why the minus sign creates oscillation:** If you displace a mass from equilibrium, Hooke\'s Law restores it. But it overshoots — and the restoring force pulls it back again. This alternation between restoring force and overshoot is the origin of all oscillatory motion. Hooke\'s Law is the starting point for the next three lessons.',
    ],
    callouts: [
      {
        type: 'sequencing',
        title: 'Lesson 1 of 4 — Chapter 8: Oscillations & Waves',
        body:
          '**Chapter 5:** Spring PE = ½kx² — work done against Hooke\'s Law, stored as elastic energy.\n**This chapter:** Hooke\'s Law as a restoring force that creates oscillatory motion.\n**This lesson:** F = −kx — the linear restoring force.\n**Next:** Simple Harmonic Motion — the oscillation that results.',
      },
      {
        type: 'theorem',
        title: 'Hooke\'s Law',
        body: 'F = -kx \\qquad [\\text{SI: k in N/m, x in m, F in N}]',
      },
      {
        type: 'definition',
        title: 'Spring constant k',
        body:
          'k measures the stiffness: force per unit displacement. Large k = stiff spring (hard to stretch). Small k = soft spring (easy to stretch). Units: N/m.',
      },
      {
        type: 'warning',
        title: 'The minus sign is not optional',
        body:
          'F = −kx, not F = kx. The restoring force points opposite to x. If x > 0 (stretched), F < 0 (pulls back). If x < 0 (compressed), F > 0 (pushes back). Dropping the minus sign predicts a force that accelerates the spring away from equilibrium — the wrong physics entirely.',
      },
      {
        type: 'connection',
        title: 'Calculus connection: F = −dPE/dx confirms the minus sign',
        body:
          'Spring PE = ½kx². Differentiating: \\(F = -\\dfrac{d}{dx}(\\tfrac{1}{2}kx^2) = -kx\\). The minus sign in Hooke\'s Law comes directly from the negative gradient of the PE curve. The parabolic PE well always curves upward — force always points toward the minimum.',
      },
    ],
    visualizations: [
      {
        id: 'SpringOscillation',
        title: 'Stretch the spring — feel the restoring force',
        mathBridge:
          'Drag the mass to stretch or compress the spring. Watch the force arrow: it always points back toward equilibrium (x = 0). The force magnitude is proportional to displacement. Release and watch it oscillate.',
        caption: 'F = −kx: force is linear in displacement and always restorative.',
        props: { showForce: true, interactive: true },
      },
      {
        id: 'FunctionPlotter',
        title: 'F-x graph: slope = −k',
        mathBridge:
          'Plot F = −kx. The slope is −k. Double k → steeper slope → stiffer spring. The area under a triangle on this graph = work = ½kx² (spring PE).',
        caption: 'Linear F-x relationship. The slope gives k directly.',
        props: { expression: '-200*x', variable: 'x', xMin: -0.2, xMax: 0.2, label: 'F (N)' },
      },
    ],
  },

  math: {
    prose: [
      'For a spring with constant \\(k\\) displaced \\(x\\) from equilibrium:',
      'Force: \\(F = -kx\\)',
      'Elastic PE (from Lesson 5.3): \\(PE = \\tfrac{1}{2}kx^2\\)',
      'For springs in series and parallel:',
      'Series: \\(\\dfrac{1}{k_{\\text{eff}}} = \\dfrac{1}{k_1} + \\dfrac{1}{k_2}\\) (softer — two springs share the load)',
      'Parallel: \\(k_{\\text{eff}} = k_1 + k_2\\) (stiffer — both springs share the displacement)',
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'Springs in series vs parallel',
        body:
          '\\text{Series: } \\frac{1}{k_{\\text{eff}}} = \\sum_i \\frac{1}{k_i} \\quad (\\text{softer})\\\\\\text{Parallel: } k_{\\text{eff}} = \\sum_i k_i \\quad (\\text{stiffer})',
      },
      {
        type: 'insight',
        title: 'Springs are capacitors for mechanical energy',
        body:
          'A spring stores ½kx² joules when displaced by x. Double the displacement → 4× the stored energy (quadratic, not linear). This is the same scaling as kinetic energy ½mv² — by design, they exchange perfectly in SHM.',
      },
    ],
    visualizations: [
      {
        id: 'SVGDiagram',
        props: { type: 'spring-series-parallel' },
        title: 'Series vs parallel spring combinations',
        caption:
          'Series: same force, displacements add. Effective k is less than either spring alone. Parallel: same displacement, forces add. Effective k is greater than either spring.',
      },
    ],
  },

  rigor: {
    title: 'Hooke\'s Law as the first term of a Taylor expansion',
    prose: [
      'Any potential energy function near a stable equilibrium looks like a parabola — and therefore obeys Hooke\'s Law.',
    ],
    proofSteps: [
      {
        expression: 'U(x) = U(0) + U\'(0)x + \\tfrac{1}{2}U\'\'(0)x^2 + \\cdots',
        annotation: 'Taylor series of any PE function about equilibrium x = 0.',
      },
      {
        expression: 'U\'(0) = 0 \\text{ (equilibrium: minimum of PE → derivative is zero)}',
        annotation: 'At equilibrium, the force is zero: F = −dU/dx = −U\'(0) = 0.',
      },
      {
        expression: 'U(x) \\approx U(0) + \\tfrac{1}{2}U\'\'(0)x^2',
        annotation: 'For small x, higher terms are negligible. U″(0) > 0 (stable equilibrium).',
      },
      {
        expression: 'F = -\\frac{dU}{dx} = -U\'\'(0)x \\equiv -kx',
        annotation: 'The effective spring constant is k = U″(0). Any smooth PE near its minimum looks like a spring.',
      },
    ],
  },

  examples: [
    {
      id: 'ch8-001-ex1',
      title: 'Finding k from a stretch experiment',
      problem: '\\text{A spring stretches 8 cm when a 4 N force is applied. Find k. How far does it stretch under 10 N?}',
      steps: [
        { expression: 'k = F/|x| = 4/0.08 = 50\\,\\text{N/m}', annotation: 'Spring constant from F = kx (taking magnitude).' },
        { expression: 'x = F/k = 10/50 = 0.20\\,\\text{m} = 20\\,\\text{cm}', annotation: 'Stretch under 10 N.' },
      ],
      conclusion: 'k = 50 N/m. New stretch = 20 cm.',
    },
    {
      id: 'ch8-001-ex2',
      title: 'Two springs in series and parallel',
      problem: '\\text{Springs k₁ = 100 N/m and k₂ = 150 N/m. Find } k_{\\text{eff}} \\text{ for (a) series, (b) parallel.}',
      steps: [
        { expression: '(a)\\; \\frac{1}{k_{\\text{eff}}} = \\frac{1}{100} + \\frac{1}{150} = \\frac{3+2}{300} = \\frac{5}{300} \\Rightarrow k_{\\text{eff}} = 60\\,\\text{N/m}', annotation: 'Series: softer than either spring.' },
        { expression: '(b)\\; k_{\\text{eff}} = 100 + 150 = 250\\,\\text{N/m}', annotation: 'Parallel: stiffer than either spring.' },
      ],
      conclusion: 'Series: 60 N/m (softer). Parallel: 250 N/m (stiffer).',
    },
  ],

  challenges: [
    {
      id: 'ch8-001-ch1',
      difficulty: 'easy',
      problem: '\\text{A 0.5 kg mass hangs from a spring (k = 200 N/m) at rest. Find the spring extension.}',
      hint: 'At equilibrium: kx = mg.',
      walkthrough: [
        { expression: 'x = mg/k = (0.5)(9.8)/200 = 0.0245\\,\\text{m} = 2.45\\,\\text{cm}', annotation: 'Equilibrium stretch.' },
      ],
      answer: 'x = 2.45 cm.',
    },
    {
      id: 'ch8-001-ch2',
      difficulty: 'medium',
      problem:
        '\\text{A spring (k = 300 N/m) is compressed 5 cm and launches a 50 g ball. Find the launch speed.}',
      hint: '½kx² = ½mv². Spring PE → KE.',
      walkthrough: [
        {
          expression: '\\tfrac{1}{2}(300)(0.05)^2 = \\tfrac{1}{2}(0.05)v^2 \\Rightarrow 0.375 = 0.025v^2',
          annotation: 'Energy conservation.',
        },
        { expression: 'v = \\sqrt{15} \\approx 3.87\\,\\text{m/s}', annotation: '' },
      ],
      answer: 'Launch speed ≈ 3.87 m/s.',
    },
    {
      id: 'ch8-001-ch3',
      difficulty: 'hard',
      problem:
        '\\text{A diatomic molecule has PE: } U(r) = \\frac{A}{r^{12}} - \\frac{B}{r^6} \\text{ (Lennard-Jones). At equilibrium } r_0 \\text{, show it behaves like a spring. Find k in terms of A, B, r₀.}',
      hint: 'Find r₀ from dU/dr = 0. Then k = d²U/dr² evaluated at r₀.',
      walkthrough: [
        {
          expression: 'dU/dr = -12A/r^{13} + 6B/r^7 = 0 \\Rightarrow r_0 = (2A/B)^{1/6}',
          annotation: 'Equilibrium position.',
        },
        {
          expression: 'k = \\frac{d^2U}{dr^2}\\bigg|_{r_0} = \\frac{156A}{r_0^{14}} - \\frac{42B}{r_0^8}',
          annotation: 'Second derivative gives the effective spring constant.',
        },
        {
          expression: 'k = \\frac{36B^2}{A r_0^2} \\cdot \\frac{1}{4} \\cdot \\frac{B}{A} \\; (\\text{simplifies using } r_0)',
          annotation: 'Substituting r₀ and simplifying. Near equilibrium, all atoms vibrate as harmonic oscillators.',
        },
      ],
      answer: 'Near r₀, U ≈ ½k(r−r₀)² — Lennard-Jones reduces to Hooke\'s Law. The atomic bond is a spring.',
    },
  ],

  quiz: [
    {
      id: 'p8-001-q1',
      type: 'choice',
      question: 'A spring (k = 80 N/m) is compressed 15 cm from equilibrium. What is the magnitude of the restoring force?',
      options: ['12 N', '8 N', '120 N', '1.5 N'],
      answer: '12 N',
      hints: ['F = k|x| = 80 × 0.15.', 'The sign tells direction; magnitude is k × displacement in meters.'],
      reviewSection: 'intuition',
    },
    {
      id: 'p8-001-q2',
      type: 'choice',
      question: 'A spring stretches 4 cm under a 20 N force and 8 cm under a 40 N force. What is k?',
      options: ['500 N/m', '250 N/m', '200 N/m', '5 N/m'],
      answer: '500 N/m',
      hints: ['k = F/x = 20 N / 0.04 m.', 'Both data points give the same k — Hooke\'s Law is linear.'],
      reviewSection: 'examples',
    },
    {
      id: 'p8-001-q3',
      type: 'choice',
      question: 'How much elastic potential energy is stored in a spring (k = 200 N/m) stretched 10 cm?',
      options: ['1 J', '2 J', '10 J', '0.1 J'],
      answer: '1 J',
      hints: ['PE = ½kx² = ½ × 200 × (0.1)².', '½ × 200 × 0.01 = 1 J.'],
      reviewSection: 'math',
    },
    {
      id: 'p8-001-q4',
      type: 'choice',
      question: 'Two springs k₁ = 60 N/m and k₂ = 60 N/m are connected in series. What is k_effective?',
      options: ['30 N/m', '60 N/m', '120 N/m', '45 N/m'],
      answer: '30 N/m',
      hints: ['1/k_eff = 1/k₁ + 1/k₂ = 1/60 + 1/60 = 2/60.', 'k_eff = 30 N/m — series always gives a softer spring.'],
      reviewSection: 'math',
    },
    {
      id: 'p8-001-q5',
      type: 'choice',
      question: 'The same two springs (k = 60 N/m each) are connected in parallel. What is k_effective?',
      options: ['120 N/m', '60 N/m', '30 N/m', '90 N/m'],
      answer: '120 N/m',
      hints: ['Parallel: k_eff = k₁ + k₂ = 60 + 60 = 120 N/m.', 'Parallel is always stiffer than either spring alone.'],
      reviewSection: 'math',
    },
    {
      id: 'p8-001-q6',
      type: 'choice',
      question: 'The minus sign in F = −kx means:',
      options: ['The force always points toward equilibrium (opposite to displacement)', 'The spring force is always negative', 'The spring constant k is negative', 'The spring decelerates the mass'],
      answer: 'The force always points toward equilibrium (opposite to displacement)',
      hints: ['If x > 0 (stretched right), F = −kx < 0 (force pulls left, back toward x = 0).'],
      reviewSection: 'intuition',
    },
    {
      id: 'p8-001-q7',
      type: 'choice',
      question: 'If a spring stores 8 J at x = 4 cm, how much energy does it store at x = 8 cm?',
      options: ['32 J', '16 J', '24 J', '64 J'],
      answer: '32 J',
      hints: ['PE = ½kx² scales as x². Double x → quadruple PE.', '8 J × 4 = 32 J.'],
      reviewSection: 'math',
    },
    {
      id: 'p8-001-q8',
      type: 'choice',
      question: 'Hooke\'s Law F = −kx is only valid:',
      options: ['Within the elastic limit (small displacements)', 'For all possible displacements', 'Only for metal springs', 'Only at room temperature'],
      answer: 'Within the elastic limit (small displacements)',
      hints: ['Beyond the elastic limit, permanent (plastic) deformation occurs and the force-displacement relationship is no longer linear.'],
      reviewSection: 'intuition',
    },
    {
      id: 'p8-001-q9',
      type: 'choice',
      question: 'The rigor section shows that any stable PE minimum looks like a spring because the Taylor expansion near the minimum gives U ≈ ½U″(0)x². What is the effective spring constant?',
      options: ["k = U''(0) (the second derivative of PE at equilibrium)", "k = U'(0) (the first derivative)", "k = U(0) (the PE value at minimum)", 'k = −U′(0) (negative of the slope)'],
      answer: "k = U''(0) (the second derivative of PE at equilibrium)",
      hints: ['F = −dU/dx ≈ −U″(0)x = −kx. So k = U″(0).', 'The curvature of the PE well determines the spring constant.'],
      reviewSection: 'rigor',
    },
    {
      id: 'p8-001-q10',
      type: 'choice',
      question: 'A 0.2 kg mass hangs at rest from a spring (k = 40 N/m). What is the equilibrium stretch?',
      options: ['4.9 cm', '2.0 cm', '9.8 cm', '1.0 cm'],
      answer: '4.9 cm',
      hints: ['At equilibrium, spring force = gravity: kx = mg.', 'x = mg/k = (0.2)(9.8)/40 = 0.049 m = 4.9 cm.'],
      reviewSection: 'challenges',
    },
  ],

  misconceptions: [
    {
      id: 'p8-001-m1',
      misconception: 'Springs in series are stiffer than a single spring because "two springs are stronger than one."',
      correction: 'Series springs are softer, not stiffer. In series, the SAME force stretches BOTH springs, so displacements add: x_total = x₁ + x₂. More total stretch under the same force means lower effective k. Rule: series → 1/k_eff = 1/k₁ + 1/k₂ → k_eff is less than the smaller k. Parallel springs share the DISPLACEMENT — forces add — so parallel is stiffer.',
      correctionExample: 'Two k = 100 N/m springs in series: k_eff = 50 N/m (softer). Same springs in parallel: k_eff = 200 N/m (stiffer).',
    },
    {
      id: 'p8-001-m2',
      misconception: 'The restoring force is largest when the spring passes through equilibrium.',
      correction: 'The restoring force is ZERO at equilibrium (x = 0) because F = −kx = 0 there. The force is largest at maximum displacement (x = ±A). At equilibrium the spring is neither stretched nor compressed — no restoring force. What is maximum at equilibrium is the SPEED, not the force.',
      correctionExample: 'Spring: k = 200 N/m, A = 5 cm. At x = 0: F = 0, v = v_max. At x = 5 cm: F = −10 N (maximum), v = 0.',
    },
  ],

  transferPrompts: [
    {
      id: 'p8-001-t1',
      prompt: `Young's modulus E relates stress (force per area) to strain (fractional extension) in a solid material: σ = Eε. A steel rod of length L, cross-section A, and Young's modulus E stretched by ΔL behaves like a spring. What is the effective spring constant of the rod in terms of E, A, and L? How does this explain why short, thick rods are stiffer than long, thin ones?`,
      connection: 'F = kx for a spring; F = (EA/L)ΔL for a rod — the rod IS a spring with k = EA/L. Longer rod (larger L) → smaller k (softer). Larger cross-section (larger A) → larger k (stiffer).',
    },
    {
      id: 'p8-001-t2',
      prompt: `In an LC circuit (inductor L, capacitor C), the charge q oscillates as: L(d²q/dt²) = −q/C. Compare this to m(d²x/dt²) = −kx for a spring-mass system. What plays the role of mass? What plays the role of spring constant? What does this analogy predict for the oscillation frequency of the LC circuit?`,
      connection: 'The LC circuit is a perfect electrical analogue of the spring-mass system: L↔m, 1/C↔k, q↔x. The oscillation frequency is ω = 1/√(LC), directly from ω = √(k/m).',
    },
  ],

  debugging: [
    {
      id: 'p8-001-d1',
      error: `A student writes: "Spring with k = 300 N/m stretched 20 cm. Restoring force = kx = 300 × 20 = 6000 N."`,
      fix: `Two errors: (1) forgetting to convert cm to meters, and (2) dropping the minus sign for the restoring force.
F = −kx = −300 N/m × 0.20 m = −60 N
The force is 60 N pointing back toward equilibrium (negative x direction if stretched in +x direction).
Always convert to SI units (meters) before plugging into F = −kx.`,
    },
    {
      id: 'p8-001-d2',
      error: `A student computes series spring constant:
k₁ = 200 N/m, k₂ = 300 N/m
"In series, add them: k_eff = 200 + 300 = 500 N/m"`,
      fix: `Adding spring constants gives parallel, not series. For series:
1/k_eff = 1/k₁ + 1/k₂ = 1/200 + 1/300 = 3/600 + 2/600 = 5/600
k_eff = 600/5 = 120 N/m (softer than either spring alone)

Memory aid: series springs = resistors in parallel (use the reciprocal formula). Parallel springs = resistors in series (just add).`,
    },
  ],

  mastery: {
    targetLevel: 'Apply F = −kx and PE = ½kx² to springs; distinguish series vs parallel combinations; connect Hooke\'s Law to the PE minimum via the Taylor expansion.',
    checklistItems: [
      'Can compute F given k and x, including correct sign (restoring direction)',
      'Can find k from a force-displacement measurement',
      'Can compute elastic PE = ½kx² and use energy conservation to find speeds',
      'Can calculate k_eff for springs in series (reciprocal formula) and parallel (sum)',
      'Can explain why Hooke\'s Law applies near any stable equilibrium (Taylor expansion argument)',
    ],
    commonStruggles: [
      'Converting displacement to meters before using F = kx — cm/mm inputs give answers 100/1000× too large',
      'Series springs: adding k values instead of using the reciprocal formula',
      'Forgetting the minus sign in F = −kx when writing equations (the sign matters for determining direction of oscillation)',
    ],
    nextSteps: 'Lesson p8-002 (Simple Harmonic Motion) shows what oscillation F = −kx produces: x(t) = A cos(ωt) with ω = √(k/m).',
  },

  semantics: {
    core: [
      { symbol: 'F = -kx', meaning: 'Hooke\'s Law: restoring force proportional to and opposite displacement' },
      { symbol: 'k', meaning: 'Spring constant (N/m): force required per unit of stretch — large k = stiff spring' },
      { symbol: 'x', meaning: 'Displacement from equilibrium (m): positive = stretched, negative = compressed' },
      { symbol: 'PE = \\tfrac{1}{2}kx^2', meaning: 'Elastic potential energy — stored in a spring displaced by x from equilibrium' },
      { symbol: 'k_{\\text{eff}}', meaning: 'Effective spring constant for combinations: reciprocal sum for series, direct sum for parallel' },
      { symbol: 'k = U\'\'(0)', meaning: 'Any smooth PE near its minimum looks like a spring — curvature = spring constant' },
    ],
    rulesOfThumb: [
      'F = −kx: the minus sign is the restoring mechanism — it\'s what makes oscillations happen.',
      'Series springs → softer: same force, displacements add. Parallel springs → stiffer: same displacement, forces add.',
      'PE = ½kx²: double the stretch → quadruple the stored energy.',
      'Any stable equilibrium behaves like a Hookean spring for small displacements — Hooke\'s Law is universal near equilibrium.',
      'At equilibrium: F = 0 (no restoring force). At max displacement: F = max (strongest pull back).',
    ],
  },

  notebooks: {
    python: {
      type: 'PythonNotebook',
      title: "Hooke's Law in Python",
      props: {
        initialCells: [
        {
          cellTitle: 'F = −kx: the force-displacement curve',
          type: 'code',
          language: 'python',
          code: `import numpy as np
import matplotlib.pyplot as plt

# Hooke's Law: F = -kx
k = 200  # N/m — spring constant
x = np.linspace(-0.15, 0.15, 300)  # displacement from -15 cm to +15 cm
F = -k * x                          # restoring force: F = -kx

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

# Left: F vs x — linear restoring force
ax1.plot(x * 100, F, 'b-', linewidth=2)  # convert x to cm for display
ax1.axhline(0, color='k', linewidth=0.5)
ax1.axvline(0, color='k', linewidth=0.5)
ax1.set_xlabel('Displacement x (cm)')
ax1.set_ylabel('Force F (N)')
ax1.set_title(f"Hooke's Law: F = −kx  (k = {k} N/m)")
ax1.fill_between(x * 100, F, 0, alpha=0.15, color='blue')
ax1.grid(True)

# Right: PE = ½kx² — parabolic potential well
PE = 0.5 * k * x**2
ax2.plot(x * 100, PE, 'r-', linewidth=2)
ax2.set_xlabel('Displacement x (cm)')
ax2.set_ylabel('Potential Energy PE (J)')
ax2.set_title('Elastic PE = ½kx²: parabolic energy well')
ax2.grid(True)

plt.tight_layout()
plt.show()

# Key values
for disp_cm in [5, 10, 15]:
    disp_m = disp_cm / 100
    F_val = k * disp_m
    PE_val = 0.5 * k * disp_m**2
    print(f"x = {disp_cm} cm: F = {F_val:.1f} N,  PE = {PE_val:.3f} J")`,
          prose: [
            'F = -k * x is the core of Hooke\'s Law: negative means the force opposes the displacement. When x is positive (stretched right), F is negative (pulls left). NumPy applies this element-wise across all 300 displacement values at once.',
            'The F-x plot is a straight line with slope −k. This linearity is exactly what "Hooke\'s Law" means — force is proportional to displacement. The slope gives k directly: steeper line = stiffer spring.',
            'The PE parabola shows why spring energy scales as x²: PE = ½kx². At x = 10 cm, PE = 1 J; at x = 15 cm, PE = 2.25 J (2.25× more energy for 1.5× more stretch). The parabolic "well" shape explains why springs always push back toward the minimum.',
          ],
        },
        {
          cellTitle: 'Series vs parallel spring combinations',
          type: 'code',
          language: 'python',
          code: `import numpy as np
import matplotlib.pyplot as plt

# Compare force-displacement for single springs and combinations
k1 = 100  # N/m
k2 = 150  # N/m

k_series   = 1 / (1/k1 + 1/k2)      # 1/k_eff = 1/k1 + 1/k2
k_parallel = k1 + k2                  # k_eff = k1 + k2

x = np.linspace(0, 0.1, 200)  # stretch from 0 to 10 cm

F_k1       = k1 * x
F_k2       = k2 * x
F_series   = k_series * x
F_parallel = k_parallel * x

plt.figure(figsize=(8, 5))
plt.plot(x * 100, F_k1,       label=f'Spring 1 only (k = {k1} N/m)', linewidth=1.5, linestyle=':')
plt.plot(x * 100, F_k2,       label=f'Spring 2 only (k = {k2} N/m)', linewidth=1.5, linestyle=':')
plt.plot(x * 100, F_series,   label=f'Series (k_eff = {k_series:.1f} N/m)', linewidth=2, color='red')
plt.plot(x * 100, F_parallel, label=f'Parallel (k_eff = {k_parallel} N/m)', linewidth=2, color='blue')
plt.xlabel('Displacement (cm)')
plt.ylabel('Force (N)')
plt.title('Spring combinations: series vs parallel')
plt.legend(); plt.grid(True)
plt.show()

print(f"k1 = {k1}, k2 = {k2} N/m")
print(f"Series:   k_eff = {k_series:.1f} N/m  (softer than either — reciprocal formula)")
print(f"Parallel: k_eff = {k_parallel} N/m  (stiffer than either — direct sum)")`,
          prose: [
            'k_series = 1 / (1/k1 + 1/k2) implements the series formula directly. In series, both springs stretch under the SAME force, so displacements add: the effective spring is softer. k_eff = 60 N/m is less than either k1 = 100 or k2 = 150.',
            'k_parallel = k1 + k2 adds the constants directly because in parallel, both springs share the SAME displacement while their forces add. The effective spring is stiffer: 250 N/m is more than either spring alone.',
            'The slope of each line on the plot equals k_eff. The series line is shallower (less force per unit stretch); the parallel line is steeper (more force per unit stretch). The visual confirms the arithmetic.',
          ],
        },
        {
          cellTitle: 'Spring launcher: energy conservation',
          type: 'code',
          language: 'python',
          code: `import numpy as np
import matplotlib.pyplot as plt

# Spring (k = 300 N/m) launches a ball: ½kx² = ½mv²
k = 300   # N/m
m = 0.05  # kg (50 g)

compressions_cm = np.linspace(1, 20, 200)  # 1 cm to 20 cm compression
compressions_m  = compressions_cm / 100

# Energy conservation: ½kx² = ½mv² → v = x√(k/m)
v_launch = compressions_m * np.sqrt(k / m)

# PE stored at each compression
PE = 0.5 * k * compressions_m**2

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

ax1.plot(compressions_cm, v_launch, 'b-', linewidth=2)
ax1.set_xlabel('Spring compression (cm)')
ax1.set_ylabel('Launch speed (m/s)')
ax1.set_title(f'Launch speed vs compression (k={k} N/m, m={m} kg)')
ax1.grid(True)

ax2.plot(compressions_cm, PE, 'r-', linewidth=2)
ax2.set_xlabel('Spring compression (cm)')
ax2.set_ylabel('Stored PE (J)')
ax2.set_title('PE = ½kx²: quadratic growth')
ax2.grid(True)

plt.tight_layout()
plt.show()

# Specific calculation
x0 = 0.05  # 5 cm
v0 = x0 * np.sqrt(k/m)
PE0 = 0.5 * k * x0**2
print(f"Compress 5 cm: PE = {PE0:.3f} J, launch speed = {v0:.2f} m/s")
print(f"Compress 10 cm: PE = {4*PE0:.3f} J (4x), launch speed = {2*v0:.2f} m/s (2x)")`,
          prose: [
            'v_launch = compressions_m * np.sqrt(k / m) comes from setting ½kx² = ½mv² and solving for v: v = x√(k/m). This is energy conservation — all spring PE becomes KE at launch.',
            'The v-vs-compression plot is linear because v ∝ x (square root of a perfect square). Double the compression → double the launch speed. But the PE plot is quadratic (PE ∝ x²), so double compression means 4× the stored energy — and √(4×) = 2× the speed.',
            'The print output confirms: compressing to 10 cm gives twice the speed of 5 cm (6.32 vs 3.16 m/s) but four times the stored PE (1.5 vs 0.375 J). The energy quadruples but the speed only doubles — because KE = ½mv² scales as v².',
          ],
        },
        {
          cellTitle: 'Challenge: effective spring constant of an atomic bond',
          type: 'code',
          language: 'python',
          challengeType: 'write',
          starterCode: `import numpy as np
import matplotlib.pyplot as plt

# Lennard-Jones potential: U(r) = A/r^12 - B/r^6
# Use values for a typical diatomic molecule
A = 1e-138  # J·m^12
B = 1e-78   # J·m^6

r = np.linspace(2.8e-10, 6e-10, 500)  # distance in meters (2.8 to 6 angstroms)
U = A / r**12 - B / r**6

# TODO:
# 1. Plot U(r) vs r (convert r to angstroms: r_angstrom = r * 1e10)
# 2. Find r0 (equilibrium distance): the minimum of U — use np.argmin(U)
# 3. Compute the second derivative numerically at r0:
#    k_eff = (U[r0_idx+1] - 2*U[r0_idx] + U[r0_idx-1]) / dr**2
#    where dr = r[1] - r[0]
# 4. Compare to the analytical result: k_eff = 72*B^2 / (4*A) * (B/(2*A))**(1/3)
# 5. Print: r0 in angstroms, k_eff in N/m, and compare to typical atomic bonds (~10-100 N/m)
`,
        },
      ]
      },
    },
    matlab: {
      type: 'OpenMatNotebook',
      title: "Hooke's Law in MATLAB/Octave",
      props: {
        initialCells: [
        {
          cellTitle: 'F = −kx: force-displacement curve',
          type: 'code',
          language: 'matlab',
          code: `% Hooke's Law: F = -kx and PE = ½kx²
k = 200;   % N/m
x = linspace(-0.15, 0.15, 300);   % displacement: -15 to +15 cm
F  = -k * x;                       % restoring force
PE = 0.5 * k * x.^2;              % elastic PE

figure;
subplot(1,2,1);
plot(x*100, F, 'b-', 'LineWidth', 2);
hold on;
yline(0, 'k-', 'LineWidth', 0.5);
xline(0, 'k-', 'LineWidth', 0.5);
xlabel('Displacement x (cm)'); ylabel('Force F (N)');
title(sprintf("Hooke's Law: F = -kx  (k = %d N/m)", k));
grid on;

subplot(1,2,2);
plot(x*100, PE, 'r-', 'LineWidth', 2);
xlabel('Displacement x (cm)'); ylabel('PE (J)');
title('Elastic PE = ½kx²: parabolic well');
grid on;

% Print key values
fprintf('x=5cm: F=%.1fN, PE=%.3fJ\\n', k*0.05, 0.5*k*0.05^2);
fprintf('x=10cm: F=%.1fN, PE=%.3fJ\\n', k*0.1, 0.5*k*0.1^2);`,
          prose: [
            'F = -k * x computes Hooke\'s Law for all 300 positions at once. MATLAB performs element-wise multiplication on vectors without needing a .* operator when one argument is a scalar.',
            'PE = 0.5 * k * x.^2 uses .^2 for element-wise squaring of the vector x. The result is the parabolic PE well that always curves upward — its minimum at x = 0 is the equilibrium, and F = −dPE/dx = −kx restores the mass toward it.',
            'subplot(1,2,1) and subplot(1,2,2) put both plots in the same figure window. The left plot (F vs x) is linear with slope −k; the right (PE vs x) is parabolic — doubling x gives four times the PE.',
          ],
        },
        {
          cellTitle: 'Series vs parallel spring combinations',
          type: 'code',
          language: 'matlab',
          code: `% Series and parallel spring combinations
k1 = 100; k2 = 150;   % N/m

k_series   = 1 / (1/k1 + 1/k2);   % reciprocal formula
k_parallel = k1 + k2;               % direct sum

x = linspace(0, 0.1, 200);          % 0 to 10 cm

figure;
plot(x*100, k1*x, 'k:',  'LineWidth', 1.5, 'DisplayName', sprintf('k1=%d N/m', k1));
hold on;
plot(x*100, k2*x, 'b:',  'LineWidth', 1.5, 'DisplayName', sprintf('k2=%d N/m', k2));
plot(x*100, k_series*x,   'r-',  'LineWidth', 2.5, 'DisplayName', sprintf('Series k_{eff}=%.0f N/m', k_series));
plot(x*100, k_parallel*x, 'g-',  'LineWidth', 2.5, 'DisplayName', sprintf('Parallel k_{eff}=%.0f N/m', k_parallel));
xlabel('Displacement (cm)'); ylabel('Force (N)');
title('Spring combinations: slope = k_{eff}');
legend; grid on;

fprintf('Series:   k_eff = %.1f N/m (softer than k1=%d and k2=%d)\\n', k_series, k1, k2);
fprintf('Parallel: k_eff = %.0f N/m (stiffer than k1=%d and k2=%d)\\n', k_parallel, k1, k2);`,
          prose: [
            'k_series = 1 / (1/k1 + 1/k2) implements the series formula. The reciprocal structure mirrors resistors in parallel — physically, series springs share the same force but sum their displacements, which always produces an effective k smaller than either individual spring.',
            'k_parallel = k1 + k2 adds directly because parallel springs share the same displacement while their forces add. The effective spring is stiffer than either — k_eff = 250 N/m exceeds both k1 = 100 and k2 = 150.',
            'The plot shows four lines with different slopes. Series (red) is the flattest — least force per cm of stretch. Parallel (green) is the steepest — most force per cm. The dotted individual spring lines fall between them.',
          ],
        },
        {
          cellTitle: 'Spring launcher: energy conservation',
          type: 'code',
          language: 'matlab',
          code: `% Spring launcher: ½kx² = ½mv² → v = x*sqrt(k/m)
k = 300;    % N/m
m = 0.05;   % kg

comp_cm = linspace(1, 20, 200);    % compression in cm
comp_m  = comp_cm / 100;

v_launch = comp_m * sqrt(k / m);   % energy conservation
PE_stored = 0.5 * k * comp_m.^2;

figure;
subplot(1,2,1);
plot(comp_cm, v_launch, 'b-', 'LineWidth', 2);
xlabel('Compression (cm)'); ylabel('Launch speed (m/s)');
title(sprintf('Spring launcher (k=%d N/m, m=%d g)', k, m*1000));
grid on;

subplot(1,2,2);
plot(comp_cm, PE_stored, 'r-', 'LineWidth', 2);
xlabel('Compression (cm)'); ylabel('Stored PE (J)');
title('PE = ½kx²: quadratic growth');
grid on;

% Compare 5 cm vs 10 cm
x1 = 0.05; x2 = 0.10;
fprintf('5 cm: PE=%.3f J, v=%.2f m/s\\n', 0.5*k*x1^2, x1*sqrt(k/m));
fprintf('10 cm: PE=%.3f J, v=%.2f m/s  (4x PE, 2x v)\\n', 0.5*k*x2^2, x2*sqrt(k/m));`,
          prose: [
            'v_launch = comp_m * sqrt(k / m) computes v = x√(k/m) for all compressions at once. sqrt() applies element-wise to a scalar in this case. The formula comes from ½kx² = ½mv² → v² = kx²/m → v = x√(k/m).',
            'PE_stored = 0.5 * k * comp_m.^2 uses .^2 for element-wise squaring of the vector comp_m. The result grows as the square of compression — the right subplot shows the characteristic upward-curving parabola.',
            'The fprintf output shows the key scaling: 10 cm compression gives 4× the PE (1.5 vs 0.375 J) but only 2× the launch speed (6.32 vs 3.16 m/s). This is because v ∝ √(PE), so quadrupling PE doubles the speed.',
          ],
        },
        {
          cellTitle: 'Challenge: Lennard-Jones effective spring constant',
          type: 'code',
          language: 'matlab',
          challengeType: 'write',
          starterCode: `% Lennard-Jones potential: U(r) = A/r^12 - B/r^6
A = 1e-138;  % J·m^12
B = 1e-78;   % J·m^6

r = linspace(2.8e-10, 6e-10, 500);   % distance in meters
U = A ./ r.^12 - B ./ r.^6;

% TODO:
% 1. Plot U vs r (use r_ang = r * 1e10 for angstroms on x-axis)
% 2. Find r0 (equilibrium): [~, idx] = min(U); r0 = r(idx)
% 3. Compute k_eff numerically using central differences:
%    dr = r(2)-r(1); k_eff = (U(idx+1) - 2*U(idx) + U(idx-1)) / dr^2
% 4. Print r0 in angstroms and k_eff in N/m
% (Typical atomic bonds have k ≈ 10-100 N/m)
`,
        },
      ]
      },
    },
  },
};
