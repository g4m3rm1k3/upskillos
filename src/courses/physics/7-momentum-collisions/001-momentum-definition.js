export default {
  id: 'p1-ch6-001',
  slug: 'momentum-definition',
  chapter: 'p6',
  order: 1,
  title: 'Momentum: Mass in Motion',
  subtitle: 'Not just how fast — but how much mass is moving, and where.',
  tags: ['momentum', 'p = mv', 'vector', 'Newton\'s second law', 'linear momentum', 'inertia in motion'],

  hook: {
    question:
      'A 5 kg bowling ball rolls at 3 m/s. A 0.05 kg tennis ball flies at 60 m/s. Both have the same kinetic energy (check: ½(5)(9) = 22.5 J; ½(0.05)(3600) = 90 J — actually they don\'t). Revised question: the bowling ball and tennis ball both hit you. Which is harder to stop? What quantity captures "difficulty to stop" better than speed alone?',
    realWorldContext:
      'Momentum is what makes collisions dangerous. A truck at 5 m/s has far more momentum than a bicycle at 5 m/s — the truck is almost impossible to stop quickly, while the bicycle can brake in meters. Air bags, crumple zones, and safety padding all work by extending the time of collision (increasing \\(\\Delta t\\)) to reduce the force — a direct consequence of the impulse-momentum theorem.',
    previewVisualizationId: 'VectorKinematicsLab',
  },

  intuition: {
    prose: [
      '**The answer:** The bowling ball. Even though the tennis ball is faster, the bowling ball has more mass. To stop something, you need to change its velocity — but a massive object resists change more stubbornly. The quantity that captures this "inertia in motion" is **momentum**: \\(\\vec{p} = m\\vec{v}\\).',

      '**Momentum is a vector:** This is crucial. Two cars at the same speed but opposite directions have momenta that add to zero — not 2mv. Two cars moving in the same direction add: total momentum = sum of individual momenta. Direction is encoded by sign in 1D, and by components in 2D/3D.',

      '**Newton\'s Second Law is really about momentum:** Newton didn\'t write \\(F = ma\\). He wrote \\(F = dp/dt\\) — force is the rate of change of momentum. For constant mass, \\(dp/dt = m(dv/dt) = ma\\), so \\(F = ma\\) is a special case. The more fundamental form handles variable-mass systems (rockets, falling chains) and explains how collision forces work.',

      '**Why momentum is conserved in collisions:** When two objects collide, the force one exerts on the other (Newton\'s Third Law) is equal and opposite. So \\(dp_1/dt = -dp_2/dt\\), meaning \\(d(p_1 + p_2)/dt = 0\\) — total momentum is constant. This holds whether the collision is gentle or violent, elastic or inelastic. It is one of the most powerful conservation laws in physics.',
    ],
    callouts: [
      {
        type: 'sequencing',
        title: 'Lesson 1 of 3 — Chapter 6: Momentum',
        body:
          '**Chapter 5 (Energy):** KE = ½mv² — a scalar. Work = force × distance. Conserved only for conservative forces.\n**This chapter (Momentum):** p = mv — a vector. Conserved whenever net external force = 0. Handles impacts and collisions naturally.\n**This lesson:** What momentum is, how it connects to Newton\'s 2nd Law, and why it is conserved.\n**Next:** Impulse — the mechanism by which forces change momentum over time.',
      },
      {
        type: 'definition',
        title: 'Linear momentum',
        body: '\\vec{p} = m\\vec{v} \\qquad [\\text{SI: kg·m/s}]',
      },
      {
        type: 'theorem',
        title: 'Newton\'s Second Law (momentum form)',
        body: '\\vec{F}_{\\text{net}} = \\frac{d\\vec{p}}{dt} \\quad \\text{(general)} \\qquad = m\\vec{a} \\quad \\text{(constant mass)}',
      },
      {
        type: 'theorem',
        title: 'Conservation of momentum',
        body:
          '\\text{If } \\vec{F}_{\\text{net, external}} = 0: \\quad \\vec{p}_{\\text{total}} = \\text{constant}\\\\\\vec{p}_{1,i} + \\vec{p}_{2,i} = \\vec{p}_{1,f} + \\vec{p}_{2,f}',
      },
      {
        type: 'warning',
        title: 'Momentum vs kinetic energy: different quantities',
        body:
          'Both involve mass and velocity, but they behave differently. Momentum is a vector (direction matters); KE is a scalar. Momentum is always conserved in a closed system; KE is conserved only in elastic collisions. Never mix up conservation of momentum with conservation of energy — they apply to different situations.',
      },
      {
        type: 'connection',
        title: 'Calculus connection: F = dp/dt is the derivative definition',
        body:
          '\\(\\vec{F} = \\dfrac{d\\vec{p}}{dt}\\). For constant mass, \\(\\dfrac{d(m\\vec{v})}{dt} = m\\dfrac{d\\vec{v}}{dt} = m\\vec{a}\\). For variable mass (rocket): \\(F = \\dot{m}v + m\\dot{v}\\) — the product rule applied to momentum.',
      },
    ],
    visualizations: [
      {
        id: 'VectorKinematicsLab',
        title: 'Momentum is a vector — direction matters',
        mathBridge:
          'Set two objects with the same speed but different masses. Watch how momentum differs. Then reverse one velocity: momentum adds as vectors, not magnitudes.',
        caption: 'Same speed ≠ same momentum. Momentum encodes mass × direction of motion.',
      },
      {
        id: 'SVGDiagram',
        props: { type: 'momentum-vector' },
        title: 'p = mv as an arrow',
        caption:
          'Arrow length = |p| = mv. Arrow direction = direction of motion. Doubling mass doubles the arrow. Doubling speed doubles it again. Reversing velocity reverses the arrow — momentum flips sign.',
      },
    ],
  },

  math: {
    prose: [
      'Momentum: \\(\\vec{p} = m\\vec{v}\\). In 2D: \\(p_x = mv_x\\), \\(p_y = mv_y\\).',
      'Magnitude: \\(|\\vec{p}| = mv\\) (speed, not velocity). Direction: same as velocity.',
      'From the Work-Energy Theorem, KE = ½mv² = p²/(2m). Two objects with the same momentum can have different kinetic energies if they have different masses.',
      '**System momentum:** For a system of N particles: \\(\\vec{P}_{\\text{total}} = \\sum_i m_i\\vec{v}_i\\).',
    ],
    callouts: [
      {
        type: 'insight',
        title: 'KE vs momentum: which is larger for equal masses?',
        body:
          'Equal mass \\(m\\), different speeds \\(v_1 < v_2\\):\n\n\\(p_1/p_2 = v_1/v_2\\) (momentum ratio = speed ratio).\n\n\\(KE_1/KE_2 = v_1^2/v_2^2\\) (energy ratio = speed ratio squared).\n\nEnergy is more sensitive to speed. A 2× speed increase doubles momentum but quadruples KE.',
      },
      {
        type: 'theorem',
        title: 'Relating KE and momentum',
        body: 'KE = \\frac{p^2}{2m} \\qquad \\text{or equivalently} \\qquad p = \\sqrt{2m \\cdot KE}',
      },
    ],
    visualizations: [
      {
        id: 'SVGDiagram',
        props: { type: 'momentum-conservation-diagram' },
        title: 'Conservation of momentum in an isolated system',
        caption:
          'Before collision: two arrows (p₁ and p₂). After: two different arrows. The vector sum is identical before and after — that is conservation.',
      },
    ],
  },

  rigor: {
    title: 'Deriving conservation of momentum from Newton\'s Third Law',
    proofSteps: [
      {
        expression: '\\vec{F}_{12} = -\\vec{F}_{21} \\quad (\\text{Newton\'s Third Law})',
        annotation: 'Force of object 1 on object 2 equals and opposes force of object 2 on object 1.',
      },
      {
        expression: '\\vec{F}_{12} = \\frac{d\\vec{p}_2}{dt}, \\quad \\vec{F}_{21} = \\frac{d\\vec{p}_1}{dt}',
        annotation: 'Newton\'s Second Law for each object.',
      },
      {
        expression: '\\frac{d\\vec{p}_1}{dt} + \\frac{d\\vec{p}_2}{dt} = \\vec{F}_{21} + \\vec{F}_{12} = 0',
        annotation: 'Add the two equations. The forces cancel by Newton\'s Third Law.',
      },
      {
        expression: '\\frac{d}{dt}(\\vec{p}_1 + \\vec{p}_2) = 0',
        annotation: 'The derivative of total momentum is zero.',
      },
      {
        expression: '\\therefore\\; \\vec{p}_1 + \\vec{p}_2 = \\text{constant}',
        annotation: 'Total momentum is conserved. QED — derived purely from Newton\'s Laws.',
      },
    ],
  },

  examples: [
    {
      id: 'ch6-001-ex1',
      title: 'Comparing momenta',
      problem:
        '\\text{Find momentum of: (a) 80 kg sprinter at 10 m/s, (b) 0.145 kg baseball at 40 m/s, (c) 60,000 kg train at 0.5 m/s.}',
      steps: [
        { expression: 'p_a = 80 \\times 10 = 800\\,\\text{kg·m/s}', annotation: 'Sprinter.' },
        { expression: 'p_b = 0.145 \\times 40 = 5.8\\,\\text{kg·m/s}', annotation: 'Baseball — fast but light.' },
        { expression: 'p_c = 60000 \\times 0.5 = 30{,}000\\,\\text{kg·m/s}', annotation: 'Train — slow but massive. 37× the sprinter\'s momentum.' },
      ],
      conclusion: 'The train at walking pace has 37× the momentum of a sprinting athlete. Mass dominates.',
    },
    {
      id: 'ch6-001-ex2',
      title: '2D collision — conservation in two components',
      problem:
        '\\text{A 3 kg ball at (4, 0) m/s collides with a stationary 2 kg ball. After: 3 kg ball moves at (2, 1) m/s. Find the 2 kg ball\'s velocity.}',
      steps: [
        {
          expression: 'p_{x,i} = 3(4) + 2(0) = 12 \\quad p_{x,f} = 3(2) + 2v_{2x} \\Rightarrow v_{2x} = 3\\,\\text{m/s}',
          annotation: 'x-component momentum conservation.',
        },
        {
          expression: 'p_{y,i} = 0 \\quad p_{y,f} = 3(1) + 2v_{2y} \\Rightarrow v_{2y} = -1.5\\,\\text{m/s}',
          annotation: 'y-component: y-momentum was zero before, so 2 kg ball must go negative-y.',
        },
        {
          expression: '\\vec{v}_2 = (3\\hat{i} - 1.5\\hat{j})\\,\\text{m/s}',
          annotation: '2D momentum conservation requires two separate equations.',
        },
      ],
      conclusion: 'After collision: 2 kg ball moves at (3, −1.5) m/s. Momentum is conserved in each direction independently.',
    },
  ],

  challenges: [
    {
      id: 'ch6-001-ch1',
      difficulty: 'easy',
      problem: '\\text{A 2 kg object moves at 5 m/s east. Find its momentum.}',
      hint: 'p = mv, include direction.',
      walkthrough: [
        { expression: 'p = 2 \\times 5 = 10\\,\\text{kg·m/s east}', annotation: 'Direction included.' },
      ],
      answer: 'p = 10 kg·m/s east.',
    },
    {
      id: 'ch6-001-ch2',
      difficulty: 'medium',
      problem:
        '\\text{A 1500 kg car moves north at 20 m/s and a 1000 kg car moves south at 15 m/s. Find the total momentum of the system (define north as positive).}',
      hint: 'South = negative direction. Add momenta as signed numbers.',
      walkthrough: [
        { expression: 'p_{\\text{total}} = (1500)(20) + (1000)(-15) = 30000 - 15000 = 15000\\,\\text{kg·m/s north}', annotation: 'Vector addition.' },
      ],
      answer: 'p_total = 15,000 kg·m/s north.',
    },
    {
      id: 'ch6-001-ch3',
      difficulty: 'hard',
      problem:
        '\\text{A 0.1 kg bullet at 400 m/s embeds in a 4.9 kg stationary block (inelastic collision). Find the block+bullet speed. Then calculate the kinetic energy before and after — what fraction is lost?}',
      hint: 'Conservation of momentum for velocity. Then compare KE before and after.',
      walkthrough: [
        {
          expression: '(0.1)(400) + 0 = (0.1 + 4.9)v_f \\Rightarrow v_f = 40/5 = 8\\,\\text{m/s}',
          annotation: 'Momentum conservation.',
        },
        {
          expression: 'KE_i = \\tfrac{1}{2}(0.1)(400)^2 = 8000\\,\\text{J}',
          annotation: 'Initial KE (bullet only).',
        },
        {
          expression: 'KE_f = \\tfrac{1}{2}(5)(64) = 160\\,\\text{J}',
          annotation: 'Final KE (block+bullet).',
        },
        {
          expression: '\\text{Fraction lost} = \\frac{8000-160}{8000} = 98\\%',
          annotation: '98% of kinetic energy is lost — converted to heat, sound, and deformation.',
        },
      ],
      answer: 'v_f = 8 m/s; 98% of initial KE is lost to inelastic deformation.',
    },
  ],

  quiz: [
    {
      id: 'p6-001-q1',
      type: 'input',
      text: 'A 4 kg object moves at 6 m/s east. Calculate its momentum in kg·m/s.',
      answer: '24',
      hints: ['p = mv = 4 × 6.'],
      reviewSection: 'Math — p = mv',
    },
    {
      id: 'p6-001-q2',
      type: 'choice',
      text: 'Momentum is a vector quantity. This means:',
      options: [
        'It has magnitude only',
        'It has both magnitude and direction — two objects at the same speed but opposite directions have momenta that cancel',
        'It can only be positive',
        'It is the same as kinetic energy',
      ],
      answer: 'It has both magnitude and direction — two objects at the same speed but opposite directions have momenta that cancel',
      hints: ['p = mv⃗. The direction of momentum matches the direction of velocity.'],
      reviewSection: 'Intuition — momentum is a vector',
    },
    {
      id: 'p6-001-q3',
      type: 'choice',
      text: 'Newton\'s original Second Law was written as F = dp/dt. This is more general than F = ma because:',
      options: [
        'It applies to non-constant forces',
        'It handles variable-mass systems (rockets) where m changes with time',
        'It does not require vectors',
        'It only works at constant velocity',
      ],
      answer: 'It handles variable-mass systems (rockets) where m changes with time',
      hints: ['F = d(mv)/dt. If m is constant: m(dv/dt) = ma. If m changes (rocket ejecting mass): d(mv)/dt ≠ ma.'],
      reviewSection: 'Intuition — Newton\'s 2nd law and momentum',
    },
    {
      id: 'p6-001-q4',
      type: 'input',
      text: 'A 1200 kg car moves at 15 m/s. A 60 kg cyclist moves at 10 m/s in the same direction. What is their combined momentum in kg·m/s?',
      answer: '18600',
      hints: ['p_total = p_car + p_cyclist = 1200×15 + 60×10.'],
      reviewSection: 'Math — adding momenta',
    },
    {
      id: 'p6-001-q5',
      type: 'choice',
      text: 'Why does total momentum remain constant during a collision between two objects in an isolated system?',
      options: [
        'Kinetic energy is conserved',
        'Newton\'s Third Law: the forces are equal and opposite → dp₁/dt = −dp₂/dt → d(p₁+p₂)/dt = 0',
        'Velocity cannot change during a collision',
        'Mass is conserved',
      ],
      answer: 'Newton\'s Third Law: the forces are equal and opposite → dp₁/dt = −dp₂/dt → d(p₁+p₂)/dt = 0',
      hints: ['F₁₂ = −F₂₁ (Newton 3rd). F = dp/dt. So dp₁/dt = −dp₂/dt → total p unchanged.'],
      reviewSection: 'Intuition — why momentum is conserved',
    },
    {
      id: 'p6-001-q6',
      type: 'choice',
      text: 'A 3 kg ball moving at +4 m/s collides and sticks to a 5 kg ball at rest. What is the final momentum?',
      options: ['12 kg·m/s', '8 kg·m/s', '20 kg·m/s', '0 kg·m/s'],
      answer: '12 kg·m/s',
      hints: ['Momentum is conserved: p_f = p_i = 3×4 + 5×0 = 12 kg·m/s.'],
      reviewSection: 'Math — conservation in collision',
    },
    {
      id: 'p6-001-q7',
      type: 'input',
      text: 'Two ice skaters push off from rest. Skater A (m=60 kg) moves at 2 m/s east. What is the momentum of Skater B (m=80 kg) in kg·m/s? (include sign, west = negative)',
      answer: '-120',
      hints: ['Total initial momentum = 0. p_A + p_B = 0. p_B = −p_A = −60×2 = −120 kg·m/s.'],
      reviewSection: 'Math — conservation from rest',
    },
    {
      id: 'p6-001-q8',
      type: 'choice',
      text: 'Units of momentum in SI are:',
      options: ['J (joules)', 'N·s = kg·m/s', 'N/m', 'kg/m/s²'],
      answer: 'N·s = kg·m/s',
      hints: ['p = mv: kg × m/s = kg·m/s. Also: F × t = N × s = kg·m/s². Wait — N = kg·m/s², so N·s = kg·m/s. They match.'],
      reviewSection: 'Math — momentum units',
    },
    {
      id: 'p6-001-q9',
      type: 'choice',
      text: 'A 2 kg ball moves at 5 m/s north and a 2 kg ball moves at 5 m/s south. Their total momentum is:',
      options: ['10 kg·m/s north', '20 kg·m/s', '0 kg·m/s', '5 kg·m/s north'],
      answer: '0 kg·m/s',
      hints: ['Vectors: +10 + (−10) = 0. Equal masses, equal speeds, opposite directions → momenta cancel.'],
      reviewSection: 'Intuition — momentum as a vector',
    },
    {
      id: 'p6-001-q10',
      type: 'choice',
      text: 'Momentum conservation holds in a collision even when kinetic energy is NOT conserved because:',
      options: [
        'Energy is always conserved in physics',
        'The total momentum is a function of external forces only, and internal collision forces cancel by Newton\'s Third Law',
        'Mass is always constant in collisions',
        'KE and momentum are the same quantity',
      ],
      answer: 'The total momentum is a function of external forces only, and internal collision forces cancel by Newton\'s Third Law',
      hints: ['Internal forces (A pushes B, B pushes A) are equal and opposite → net effect on total p = 0. KE can be lost to heat/deformation, but total p is unaffected by internal forces.'],
      reviewSection: 'Intuition — conservation in collisions',
    },
  ],

  misconceptions: [
    {
      id: 'p6-001-m1',
      misconception: 'A fast, light object always has more momentum than a slow, heavy one.',
      correction: 'p = mv — both mass AND velocity matter. A truck at 5 m/s (10,000 kg) has p = 50,000 kg·m/s. A bullet at 500 m/s (0.01 kg) has p = 5 kg·m/s. The truck has 10,000× more momentum.',
      correctionExample: 'Tennis ball at 60 m/s: p = 0.05 × 60 = 3 kg·m/s. Bowling ball at 3 m/s: p = 5 × 3 = 15 kg·m/s. The slower bowling ball has 5× more momentum.',
    },
    {
      id: 'p6-001-m2',
      misconception: 'Momentum and kinetic energy are essentially the same thing — both involve mass and velocity.',
      correction: 'KE = ½mv² (scalar, always ≥ 0) vs p = mv⃗ (vector, can be zero even when objects are moving fast). They are related but measure different things. Two equal masses moving in opposite directions have zero total momentum but non-zero total kinetic energy.',
      correctionExample: 'Two 1 kg balls at ±5 m/s: p_total = 0, KE_total = 25 J. They have zero combined momentum but 25 J of combined kinetic energy. Completely different quantities.',
    },
  ],

  transferPrompts: [
    {
      id: 'p6-001-tp1',
      prompt: 'Car air bags deploy in about 30 ms and extend the collision time from ~5 ms (rigid impact) to ~50 ms. If the change in momentum (impulse) is the same either way, how does the air bag reduce injury?',
      connection: 'F = Δp/Δt. Same Δp, longer Δt → much smaller F. Air bag increases Δt by ~10×, reducing impact force by ~10×. The impulse (area under F-t curve) stays the same but is spread over more time.',
    },
    {
      id: 'p6-001-tp2',
      prompt: 'Momentum is p⃗ = mv⃗ — a vector. In your linear algebra study, you worked with vectors and their components. Write momentum in component form for a 2D collision where one object moves at speed v at angle θ to the x-axis. What are the x and y momentum components?',
      connection: 'p⃗ = m(v_x, v_y) = m(v cos θ, v sin θ). Each component is conserved separately: Σpₓ = constant AND Σp_y = constant. This is why 2D collision problems split into two independent equations.',
    },
  ],

  debugging: [
    {
      id: 'p6-001-db1',
      scenario: 'A student computes total momentum after two balls collide as |p₁| + |p₂| = 5 + 8 = 13 kg·m/s.',
      error: 'Added magnitudes without regard to direction. Momentum is a vector — you must add components, not magnitudes.',
      fix: 'Assign signs: if ball 1 moves right (+5 kg·m/s) and ball 2 moves left (−8 kg·m/s): total = 5 + (−8) = −3 kg·m/s (leftward). Or use component addition in 2D.',
    },
    {
      id: 'p6-001-db2',
      scenario: 'A student says: "After a perfectly inelastic collision, both energy and momentum are conserved."',
      error: 'In a perfectly inelastic collision, objects stick together. Momentum IS conserved, but kinetic energy is NOT — energy is lost to heat, sound, and deformation.',
      fix: 'Only elastic collisions conserve both KE and momentum. In inelastic collisions (including perfectly inelastic), only momentum is conserved. A perfectly inelastic collision has maximum KE loss.',
    },
  ],

  mastery: {
    targetLevel: 'Calculate momentum as a vector p⃗ = mv⃗; add momenta with correct signs; apply F = dp/dt as the fundamental form of Newton\'s Second Law; explain momentum conservation from Newton\'s Third Law.',
    checklistItems: [
      'Can calculate individual and combined momenta with correct direction',
      'Can apply the vector addition rule to total momentum in 1D and 2D',
      'Can explain why p = mv is conserved in isolated collisions using Newton\'s Third Law',
      'Can distinguish momentum from kinetic energy conceptually and by formula',
    ],
    commonStruggles: [
      'Treating momentum as a scalar — forgetting the direction/sign',
      'Confusing p conservation (always in isolated systems) with KE conservation (only elastic)',
    ],
    nextSteps: 'Lesson 2 introduces impulse — the mechanism by which momentum changes. Impulse-momentum theorem: J⃗ = Δp⃗ = F⃗ × Δt. This explains why air bags and crumple zones work.',
  },

  semantics: {
    core: [
      { symbol: 'p⃗ = mv⃗', meaning: 'linear momentum — mass times velocity vector; has direction' },
      { symbol: 'F = dp/dt', meaning: 'Newton\'s Second Law in terms of momentum — the fundamental form' },
      { symbol: 'Σp⃗ = constant', meaning: 'conservation of momentum — holds when net external force is zero' },
      { symbol: 'p_total = Σmᵢvᵢ', meaning: 'total momentum is the vector sum of all individual momenta' },
    ],
    rulesOfThumb: [
      'Momentum is conserved in all isolated collisions — elastic, inelastic, or perfectly inelastic.',
      'KE is conserved only in elastic collisions.',
      'Assign positive and negative signs to directions before calculating total momentum.',
      'Objects pushing off from rest always have equal and opposite momenta: p₁ = −p₂.',
      'In 2D: conserve x-momentum and y-momentum separately — two independent equations.',
    ],
  },

  notebooks: {
    python: {
      type: 'PythonNotebook',
      props: {
        initialCells: [
        {
          cellTitle: 'Momentum as a Vector',
          type: 'code',
          language: 'python',
          code: `import numpy as np
import matplotlib.pyplot as plt

# Two objects, 2D momenta
objects = [
    {'m': 3.0,  'v': np.array([4.0, 2.0]),  'color': 'blue',  'name': 'Ball A (3 kg)'},
    {'m': 1.5,  'v': np.array([-2.0, 5.0]), 'color': 'red',   'name': 'Ball B (1.5 kg)'},
]

momenta = [obj['m'] * obj['v'] for obj in objects]
p_total = sum(momenta)

print("Object | Mass | Velocity    | Momentum        | |p|")
for obj, p in zip(objects, momenta):
    print(f"{obj['name']:20} | {obj['m']:4.1f} | {str(obj['v']):12} | {str(p):15} | {np.linalg.norm(p):.2f} kg·m/s")
print(f"{'Total':20}       |      |              | {str(p_total):15} | {np.linalg.norm(p_total):.2f} kg·m/s")

fig, ax = plt.subplots(figsize=(8, 6))
origin = np.array([0, 0])
for obj, p, in zip(objects, momenta):
    ax.annotate('', xy=p, xytext=origin,
                arrowprops=dict(arrowstyle='->', color=obj['color'], lw=2))
    ax.text(p[0]+0.1, p[1]+0.1, obj['name'] + f'\\np={np.linalg.norm(p):.1f}', color=obj['color'])
ax.annotate('', xy=p_total, xytext=origin,
            arrowprops=dict(arrowstyle='->', color='green', lw=3))
ax.text(p_total[0]+0.1, p_total[1]+0.1, f'p_total={np.linalg.norm(p_total):.1f}', color='green')
ax.set_xlim(-5, 20); ax.set_ylim(-2, 12)
ax.grid(True); ax.axhline(0, color='k', lw=0.5); ax.axvline(0, color='k', lw=0.5)
ax.set_title('Momentum as 2D Vectors')
plt.tight_layout(); plt.show()`,
          prose: [
            '`momenta = [obj[\'m\'] * obj[\'v\'] for obj in objects]` computes each momentum vector p⃗ = mv⃗ by multiplying the scalar mass by the velocity vector — element-wise.',
            '`p_total = sum(momenta)` adds the two momentum vectors. Since they point in different directions, the total magnitude is not simply |p₁| + |p₂|. Vector addition is required.',
            'The plot shows each momentum as an arrow from the origin. The green arrow (p_total) is the vector sum — it reflects both the magnitude and direction of the combined momentum.',
          ],
        },
        {
          cellTitle: 'Collision Momentum Check',
          type: 'code',
          language: 'python',
          code: `import numpy as np

# Perfect inelastic collision: objects stick together
m1, v1 = 3.0, 5.0   # kg, m/s (positive = rightward)
m2, v2 = 5.0, -2.0  # kg, m/s (negative = leftward)

p_before = m1*v1 + m2*v2
v_final  = p_before / (m1 + m2)
p_after  = (m1 + m2) * v_final

KE_before = 0.5*m1*v1**2 + 0.5*m2*v2**2
KE_after  = 0.5*(m1+m2)*v_final**2
KE_loss   = KE_before - KE_after

print("Before collision:")
print(f"  p1 = {m1*v1:.1f} kg·m/s, p2 = {m2*v2:.1f} kg·m/s")
print(f"  Total p = {p_before:.1f} kg·m/s, Total KE = {KE_before:.1f} J")
print()
print("After collision (perfectly inelastic):")
print(f"  v_final = {v_final:.3f} m/s")
print(f"  Total p = {p_after:.1f} kg·m/s, Total KE = {KE_after:.1f} J")
print()
print(f"Momentum conserved: {abs(p_before - p_after) < 1e-10}")
print(f"KE lost: {KE_loss:.2f} J ({100*KE_loss/KE_before:.1f}% of initial KE)")`,
          prose: [
            '`p_before = m1*v1 + m2*v2` computes total momentum with sign — negative v2 means leftward. This is the scalar form of vector addition for 1D.',
            '`v_final = p_before / (m1 + m2)` applies momentum conservation: total p unchanged, new mass is m1+m2. This is the core calculation for perfectly inelastic collisions.',
            '`KE_loss` quantifies energy lost to deformation/heat. Momentum conservation holds exactly (difference < 1e-10 due to floating point), while KE is NOT conserved — the hallmark of an inelastic collision.',
          ],
        },
        {
          cellTitle: 'Momentum vs Kinetic Energy',
          type: 'code',
          language: 'python',
          code: `import numpy as np
import matplotlib.pyplot as plt

# Show how KE and momentum relate differently to mass and speed
masses = np.linspace(0.1, 10, 100)
v = 5  # m/s fixed

p_vs_m = masses * v         # p = mv (linear in m)
KE_vs_m = 0.5 * masses * v**2  # KE = ½mv² (linear in m too)

speeds = np.linspace(0, 10, 100)
m = 2  # kg fixed

p_vs_v = m * speeds         # p = mv (linear in v)
KE_vs_v = 0.5 * m * speeds**2  # KE = ½mv² (quadratic in v)

fig, axes = plt.subplots(2, 2, figsize=(12, 8))

axes[0,0].plot(masses, p_vs_m, 'b-', lw=2)
axes[0,0].set_xlabel('Mass (kg)'); axes[0,0].set_ylabel('p (kg·m/s)'); axes[0,0].set_title('p vs mass (v=5 m/s)')
axes[0,0].grid(True)

axes[0,1].plot(masses, KE_vs_m, 'r-', lw=2)
axes[0,1].set_xlabel('Mass (kg)'); axes[0,1].set_ylabel('KE (J)'); axes[0,1].set_title('KE vs mass (v=5 m/s)')
axes[0,1].grid(True)

axes[1,0].plot(speeds, p_vs_v, 'b-', lw=2)
axes[1,0].set_xlabel('Speed (m/s)'); axes[1,0].set_ylabel('p (kg·m/s)'); axes[1,0].set_title('p vs speed (m=2 kg) — linear')
axes[1,0].grid(True)

axes[1,1].plot(speeds, KE_vs_v, 'r-', lw=2)
axes[1,1].set_xlabel('Speed (m/s)'); axes[1,1].set_ylabel('KE (J)'); axes[1,1].set_title('KE vs speed (m=2 kg) — quadratic')
axes[1,1].grid(True)
plt.tight_layout()
plt.show()`,
          prose: [
            'Both p and KE scale linearly with mass — both mass plots are straight lines. This means doubling mass doubles both p and KE when speed is fixed.',
            'The speed dependence is where they diverge: p = mv is linear in v (bottom-left, straight line), while KE = ½mv² is quadratic in v (bottom-right, parabola).',
            'This explains why high-speed collisions are so much more destructive than mass comparisons suggest: KE grows as v² while p grows as v. A doubling of speed doubles momentum but quadruples KE.',
          ],
        },
        {
          cellTitle: 'Challenge — Elastic Collision in 1D',
          type: 'code',
          language: 'python',
          challengeType: 'write',
          prompt: 'In an elastic collision between masses m₁ and m₂, both momentum AND kinetic energy are conserved. Given m₁ = 4 kg at v₁ = 6 m/s and m₂ = 2 kg at v₂ = −3 m/s: (1) Find v₁_final and v₂_final using the elastic collision formulas. (2) Verify momentum is conserved. (3) Verify KE is conserved. (4) Plot "before" and "after" momentum arrows.',
          starterCode: `import numpy as np

m1, v1_i = 4.0, 6.0
m2, v2_i = 2.0, -3.0

# Elastic collision formulas:
# v1_f = ((m1-m2)*v1_i + 2*m2*v2_i) / (m1+m2)
# v2_f = ((m2-m1)*v2_i + 2*m1*v1_i) / (m1+m2)

# TODO: calculate v1_f and v2_f
# TODO: verify p_before == p_after (momentum conserved)
# TODO: verify KE_before == KE_after (kinetic energy conserved)
# TODO: print results with verification`,
        },
      ]
      },
    },
    matlab: {
      type: 'OpenMatNotebook',
      props: {
        initialCells: [
        {
          cellTitle: 'Momentum Calculation and Vector Addition',
          type: 'code',
          language: 'matlab',
          code: `% Momentum as vector
m1 = 3; v1 = [4, 2];   % kg, m/s (2D)
m2 = 1.5; v2 = [-2, 5];

p1 = m1 * v1;
p2 = m2 * v2;
p_total = p1 + p2;

fprintf('p1 = [%.1f, %.1f] kg·m/s, |p1| = %.2f\\n', p1(1), p1(2), norm(p1))
fprintf('p2 = [%.1f, %.1f] kg·m/s, |p2| = %.2f\\n', p2(1), p2(2), norm(p2))
fprintf('p_total = [%.1f, %.1f] kg·m/s, |p_total| = %.2f\\n', p_total(1), p_total(2), norm(p_total))

figure;
quiver(0, 0, p1(1), p1(2), 'b', 'LineWidth', 2, 'MaxHeadSize', 0.3); hold on
quiver(0, 0, p2(1), p2(2), 'r', 'LineWidth', 2, 'MaxHeadSize', 0.3)
quiver(0, 0, p_total(1), p_total(2), 'g', 'LineWidth', 3, 'MaxHeadSize', 0.3)
xlabel('p_x (kg·m/s)'); ylabel('p_y (kg·m/s)')
title('Momentum Vectors and Their Sum')
legend('p1 (3 kg)', 'p2 (1.5 kg)', 'p total')
grid on; axis equal`,
          prose: [
            '`p1 = m1 * v1` multiplies the scalar mass by the velocity vector — MATLAB handles this automatically, scaling each vector component. This directly implements p⃗ = mv⃗.',
            '`p_total = p1 + p2` adds the two momentum vectors component by component. Note that |p_total| ≠ |p1| + |p2| because vectors add geometrically, not by magnitude.',
            '`quiver(0, 0, px, py, ...)` draws arrows from the origin — the standard way to visualize vectors in MATLAB. The green arrow (p_total) shows the resultant from the vector addition.',
          ],
        },
        {
          cellTitle: 'Collision — Before and After',
          type: 'code',
          language: 'matlab',
          code: `% Perfectly inelastic collision
m1 = 3; v1 = 5;    % kg, m/s (rightward)
m2 = 5; v2 = -2;   % kg, m/s (leftward)

p_before = m1*v1 + m2*v2;
v_final  = p_before / (m1 + m2);
p_after  = (m1+m2) * v_final;

KE_before = 0.5*m1*v1^2 + 0.5*m2*v2^2;
KE_after  = 0.5*(m1+m2)*v_final^2;

fprintf('Before: p = %.1f kg·m/s, KE = %.1f J\\n', p_before, KE_before)
fprintf('After:  p = %.1f kg·m/s, KE = %.1f J\\n', p_after, KE_after)
fprintf('p conserved: %.2e (should be ~0)\\n', abs(p_before - p_after))
fprintf('KE lost: %.1f J (%.0f%%)\\n', KE_before-KE_after, 100*(KE_before-KE_after)/KE_before)`,
          prose: [
            '`v_final = p_before / (m1 + m2)` is the one-line momentum conservation formula for a perfectly inelastic collision. Total momentum is preserved; it is now carried by the combined mass.',
            '`abs(p_before - p_after)` should be essentially zero (machine precision ~10⁻¹⁵). This numerically verifies that momentum is exactly conserved.',
            'The KE loss confirms this is an inelastic collision — kinetic energy converted to heat and deformation. This is why car crashes are so destructive: the "lost" KE appears as damage.',
          ],
        },
        {
          cellTitle: 'p vs KE Comparison',
          type: 'code',
          language: 'matlab',
          code: `% Visualize how p and KE scale with mass and speed
v_fixed = 5; m_fixed = 2;
masses = linspace(0.1, 10, 100);
speeds = linspace(0, 10, 100);

figure;
subplot(2,2,1)
plot(masses, masses*v_fixed, 'b-', 'LineWidth', 2)
xlabel('Mass (kg)'); ylabel('p (kg·m/s)'); title('p vs mass (v=5)'); grid on

subplot(2,2,2)
plot(masses, 0.5*masses*v_fixed^2, 'r-', 'LineWidth', 2)
xlabel('Mass (kg)'); ylabel('KE (J)'); title('KE vs mass (v=5)'); grid on

subplot(2,2,3)
plot(speeds, m_fixed*speeds, 'b-', 'LineWidth', 2)
xlabel('Speed (m/s)'); ylabel('p (kg·m/s)'); title('p vs speed — linear'); grid on

subplot(2,2,4)
plot(speeds, 0.5*m_fixed*speeds.^2, 'r-', 'LineWidth', 2)
xlabel('Speed (m/s)'); ylabel('KE (J)'); title('KE vs speed — quadratic'); grid on`,
          prose: [
            'Both p and KE scale linearly with mass (top row — both straight lines). But their speed dependences differ: p is linear in v (bottom-left), KE is quadratic in v (bottom-right).',
            '`speeds.^2` uses element-wise squaring for the KE calculation. The resulting parabola contrasts with the linear p-vs-speed plot directly below it.',
            'This visual comparison shows why high-speed crashes are more destructive than mass comparisons suggest: KE grows faster with speed than p does. A 2× speed increase doubles p but quadruples KE.',
          ],
        },
        {
          cellTitle: 'Challenge — Skater Push-Off',
          type: 'code',
          language: 'matlab',
          challengeType: 'write',
          prompt: 'Two ice skaters start at rest and push off from each other. Skater A has mass 55 kg and moves at 3 m/s east after the push. (1) Find Skater B\'s momentum. (2) If B has mass 80 kg, find B\'s speed. (3) Compute KE_A and KE_B — who got more kinetic energy? (4) Plot a bar chart comparing momentum magnitude and KE for each skater.',
          starterCode: `% Skater push-off
m_A = 55; v_A = 3;  % kg, m/s eastward
m_B = 80;

% TODO: p_A = m_A * v_A
% TODO: p_B = -p_A  (momentum conserved, started at rest)
% TODO: v_B = p_B / m_B
% TODO: KE_A = 0.5*m_A*v_A^2; KE_B = 0.5*m_B*v_B^2
% TODO: fprintf results
% TODO: bar chart: [abs(p_A), abs(p_B)] and [KE_A, KE_B]`,
        },
      ]
      },
    },
  },
}
