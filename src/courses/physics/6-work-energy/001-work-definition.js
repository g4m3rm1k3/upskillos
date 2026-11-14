export default {
  id: 'p1-ch5-001',
  slug: 'work-definition',
  chapter: 'p5',
  order: 1,
  title: 'Work: Force in the Direction of Motion',
  subtitle: 'Not all effort counts — only the force that actually moves something.',
  tags: ['work', 'force', 'displacement', 'dot product', 'energy transfer', 'joule'],

  hook: {
    question: 'A weightlifter holds a 100 kg barbell perfectly still above their head for 3 minutes — arms shaking, muscles burning. According to physics, exactly how much work have they done on the barbell? Make a genuine guess before reading on.',
    realWorldContext:
      'Your intuitive sense of "effort" and physics "work" are deliberately different things. Physics work measures one specific thing: energy transferred into an object\'s motion or position change. When that transfer is zero, the work is zero — regardless of how hard you tried. This is not pedantic. It is the key to understanding where energy goes in every engine, every machine, and every biological system.',
    previewVisualizationId: 'WorkDotProductViz',
  },

  intuition: {
    prose: [
      '**The answer that surprises everyone:** The weightlifter has done exactly zero joules of work on the barbell. The barbell didn\'t move — displacement is zero — so no energy was transferred to its motion or position. The muscles burned ATP (biological energy), but that energy became heat and muscle tension, not mechanical work on the barbell. Biology and physics measure "work" differently on purpose.',

      '**Push a concrete wall.** You push with maximum force. The wall doesn\'t move. Displacement: zero. Work done on the wall: zero. Exhausting yourself without moving something is not work in physics. This forces the question: what exactly *is* work?',

      '**The contradiction that builds the model:** If a horse pulls a cart along a flat road, work is done. If the same horse stands motionless in harness, no work is done. If a roller coaster car rolls along a horizontal track, gravity (pointing down) does no work — because gravity is perpendicular to the motion. The pattern emerging: work requires both force AND displacement, and only the force component *in the direction of motion* counts.',

      '**Building the rule:** We need a formula capturing: (1) more force → more work, (2) more displacement → more work, (3) force aligned with motion → maximum work, (4) force perpendicular → zero work. There is exactly one product of two vectors that behaves this way: the **dot product**. Math doesn\'t impose this — physics demands it, and the dot product is the compression that satisfies all four conditions at once.',
    ],
    callouts: [
      {
        type: 'sequencing',
        title: 'Lesson 1 of 6 — Chapter 5: Work & Energy',
        body:
          '**Chapter 4 established:** Forces cause acceleration (\\(F = ma\\)). Every force has a magnitude and direction.\n**This chapter asks:** What happens when forces act through distances? What is "energy" and where does it come from?\n**This lesson:** Work is the transfer mechanism — force acting through displacement. No displacement, no work.\n**Next lesson:** Kinetic energy — the energy of motion — and how net work equals its change.',
      },
      {
        type: 'definition',
        title: 'Work (conceptual)',
        body:
          'Work is done on an object when a net force has a component in the direction of displacement. Force without displacement = no work. Displacement without force = no work. Perpendicular force = no work.',
      },
      {
        type: 'warning',
        title: 'Physics work ≠ everyday effort',
        body:
          'Holding a barbell still, pushing a wall, carrying a box horizontally at constant height — all are zero work in physics. Biology burns energy in all three cases. Physics tracks energy transferred into mechanical motion or position change only.',
      },
      {
        type: 'connection',
        title: 'Calculus connection: work = dot product = projection',
        body:
          '\\(W = \\vec{F}\\cdot\\vec{d} = |\\vec{F}||\\vec{d}|\\cos\\theta\\). The cosine factor is the projection of \\(\\vec{F}\\) onto \\(\\vec{d}\\) — extracting only the aligned component. For variable forces: \\(W = \\int F(x)\\,dx\\) — the area under the force-position graph. Calculus generalizes the formula from constant to any force.',
      },
    ],
    visualizations: [
      {
        id: 'SVGDiagram',
        props: { type: 'work-force-angle' },
        title: 'Work depends on the angle between force and displacement',
        caption:
          'θ = 0°: force fully aligned with motion → W = Fd (maximum). θ = 90°: force perpendicular → W = 0 (no work). θ = 180°: force opposes motion → W = −Fd (negative work, removing energy). The cosine function encodes all three cases in one formula.',
      },
      {
        id: 'WorkDotProductViz',
        title: 'Drag the force angle — watch work change',
        mathBridge:
          'Adjust θ from 0° to 180°. Watch W = Fd cos θ update. Notice: at 90°, the projection of force onto displacement vanishes completely — the force steers but doesn\'t accelerate.',
        caption: 'The "shadow" of force onto displacement is what does the work.',
        props: { interactive: true },
      },
    ],
  },

  math: {
    prose: [
      'For a **constant force** \\(\\vec{F}\\) acting through displacement \\(\\vec{d}\\):',
      '\\(W = \\vec{F}\\cdot\\vec{d} = Fd\\cos\\theta\\), where \\(\\theta\\) is the angle between force and displacement.',
      'For a **variable force** \\(F(x)\\) that changes as position changes, we sum infinitesimal work contributions:',
      '\\(W = \\int_{x_i}^{x_f} F(x)\\,dx\\) — this is the area under the force-vs-position graph.',
      'Units: \\([W] = \\text{N}\\cdot\\text{m} = \\text{J}\\) (joule). One joule is the work done by one newton acting through one metre in the direction of motion.',
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'Work — constant force',
        body: 'W = \\vec{F}\\cdot\\vec{d} = Fd\\cos\\theta \\qquad [\\text{SI: J = N·m}]',
      },
      {
        type: 'theorem',
        title: 'Work — variable force',
        body: 'W = \\int_{x_i}^{x_f} F(x)\\,dx = \\text{signed area under the }F\\text{-}x\\text{ graph}',
      },
      {
        type: 'mnemonic',
        title: 'Sign of work',
        body:
          '\\(W > 0\\): force aids displacement — energy added to object.\n\n\\(W = 0\\): force perpendicular — steers but doesn\'t speed up or slow down.\n\n\\(W < 0\\): force opposes displacement — energy removed (e.g. friction, braking).',
      },
      {
        type: 'insight',
        title: 'Work-Energy Theorem (coming next lesson)',
        body:
          '\\(W_{\\text{net}} = \\Delta KE = \\tfrac{1}{2}mv_f^2 - \\tfrac{1}{2}mv_i^2\\). Net work done on an object equals the change in its kinetic energy. This theorem ties together force, displacement, and speed — we prove it in Lesson 2.',
      },
    ],
    visualizations: [
      {
        id: 'FunctionPlotter',
        title: 'Area under F(x) = work done',
        mathBridge:
          'For a spring: F(x) = kx. Drag the endpoint — watch \\(W = \\int_0^x kx\\,dx = \\tfrac{1}{2}kx^2\\) update. The triangular area equals the stored spring energy. Integral = visible area = work.',
        caption: 'The integral ∫F dx is not an abstraction — it is the area you can see and measure.',
        props: { expression: '200*x', variable: 'x', xMin: 0, xMax: 0.3, showArea: true },
      },
    ],
  },

  rigor: {
    title: 'Deriving W = Fd cos θ from vector components',
    prose: [
      'We derive the cosine factor from the dot product definition — no hand-waving required.',
    ],
    proofSteps: [
      {
        expression: '\\vec{F} = F_x\\hat{i} + F_y\\hat{j}, \\quad \\vec{d} = d\\hat{i} \\quad (\\text{displacement along }x)',
        annotation: 'Place displacement along the x-axis. Force has components in both directions.',
      },
      {
        expression: 'W = \\vec{F}\\cdot\\vec{d} = F_x \\cdot d + F_y \\cdot 0 = F_x d',
        annotation: 'Dot product: multiply matching components, sum. Only the x-component of force contributes.',
      },
      {
        expression: 'F_x = |\\vec{F}|\\cos\\theta',
        annotation: 'The x-component of force is F cos θ, where θ is the angle between F and d.',
      },
      {
        expression: 'W = |\\vec{F}|\\cos\\theta \\cdot d = Fd\\cos\\theta',
        annotation: 'Substituting: the familiar formula. Cosine naturally emerges from component projection.',
      },
      {
        expression: '\\theta=0°\\Rightarrow W=Fd \\quad \\theta=90°\\Rightarrow W=0 \\quad \\theta=180°\\Rightarrow W=-Fd',
        annotation: 'Three key cases follow from cos 0°=1, cos 90°=0, cos 180°=−1. All physically correct.',
      },
    ],
  },

  examples: [
    {
      id: 'ch5-001-ex1',
      title: 'Pushing a box — all four forces analyzed',
      problem:
        '\\text{A person pushes a 20 kg box with a horizontal 80 N force through 5 m. Friction = 30 N backward. Find work by each force and net work.}',
      steps: [
        {
          expression: 'W_{\\text{push}} = 80 \\times 5 \\times \\cos 0° = 400\\,\\text{J}',
          annotation: 'Push is parallel to displacement (θ = 0°). Maximum work.',
        },
        {
          expression: 'W_{\\text{friction}} = 30 \\times 5 \\times \\cos 180° = -150\\,\\text{J}',
          annotation: 'Friction opposes motion (θ = 180°). Always negative work when opposing displacement.',
        },
        {
          expression: 'W_{\\text{gravity}} = W_{\\text{normal}} = 0',
          annotation: 'Both are vertical; displacement is horizontal. θ = 90°. No work done.',
        },
        {
          expression: 'W_{\\text{net}} = 400 + (-150) = 250\\,\\text{J}',
          annotation: 'Net work = algebraic sum. By the Work-Energy Theorem: the box gained 250 J of kinetic energy.',
        },
      ],
      conclusion: 'Net work 250 J → box sped up by 250 J of kinetic energy gain.',
    },
    {
      id: 'ch5-001-ex2',
      title: 'Variable spring force — integration',
      problem: 'A spring (k = 200 N/m) is compressed 0.10 m. Find work done on the spring.',
      steps: [
        {
          expression: 'F(x) = kx = 200x',
          annotation: 'Hooke\'s Law: force increases linearly with compression.',
        },
        {
          expression: 'W = \\int_0^{0.10} 200x\\,dx = \\left[100x^2\\right]_0^{0.10}',
          annotation: 'Integrate the variable force.',
        },
        {
          expression: 'W = 100(0.01) - 0 = 1.0\\,\\text{J}',
          annotation: 'Also: area of triangle = ½ × base × height = ½ × 0.1 × 20 = 1 J. Same answer geometrically.',
        },
      ],
      conclusion: 'W = 1.0 J stored as elastic potential energy. The triangular area = ½kx².',
    },
  ],

  challenges: [
    {
      id: 'ch5-001-ch1',
      difficulty: 'easy',
      problem:
        '\\text{A satellite moves in a circular orbit. Earth\'s gravity always points toward the centre, perpendicular to the velocity. How much work does gravity do per complete orbit?}',
      hint: 'What is θ between gravity and displacement at every instant?',
      walkthrough: [
        {
          expression: '\\theta = 90° \\text{ at every point on the circular orbit}',
          annotation: 'Centripetal force is always perpendicular to velocity for circular motion.',
        },
        {
          expression: 'W = Fd\\cos 90° = 0 \\text{ at every instant}',
          annotation: 'Zero work each instant → zero work per orbit.',
        },
      ],
      answer: 'Zero. Gravity changes the satellite\'s direction but not its speed.',
    },
    {
      id: 'ch5-001-ch2',
      difficulty: 'medium',
      problem:
        '\\text{Force } \\vec{F} = (3\\hat{i} + 4\\hat{j})\\,\\text{N acts on an object displaced } \\vec{d} = (5\\hat{i} - 2\\hat{j})\\,\\text{m. Find the work done.}',
      hint: 'W = F⃗·d⃗ = FₓDₓ + FᵧDᵧ. Multiply components and add.',
      walkthrough: [
        {
          expression: 'W = F_x d_x + F_y d_y = (3)(5) + (4)(-2)',
          annotation: 'Dot product in component form.',
        },
        {
          expression: 'W = 15 - 8 = 7\\,\\text{J}',
          annotation: 'The y-force partially opposes y-displacement, reducing total work.',
        },
      ],
      answer: 'W = 7 J.',
    },
    {
      id: 'ch5-001-ch3',
      difficulty: 'hard',
      problem:
        '\\text{Force } F(x) = 6x^2 - 2x \\text{ (N) acts as a particle moves from } x = 1\\text{ m to }x = 3\\text{ m. Find work.}',
      hint: 'Integrate: W = ∫₁³ (6x² − 2x) dx.',
      walkthrough: [
        {
          expression: 'W = \\int_1^3 (6x^2 - 2x)\\,dx = \\left[2x^3 - x^2\\right]_1^3',
          annotation: 'Power rule: antiderivative of 6x² is 2x³; antiderivative of 2x is x².',
        },
        {
          expression: 'W = (54 - 9) - (2 - 1) = 45 - 1 = 44\\,\\text{J}',
          annotation: 'Evaluate at upper and lower limits and subtract.',
        },
      ],
      answer: 'W = 44 J.',
    },
  ],

  quiz: [
    {
      id: 'p5-001-q1',
      type: 'choice',
      text: 'A weightlifter holds a 150 kg barbell stationary overhead for 10 seconds. How much work does she do on the barbell?',
      options: ['0 J — no displacement', '14700 J', '1470 J', 'Cannot be determined'],
      answer: '0 J — no displacement',
      hints: ['W = Fd cos θ. What is the displacement of the barbell?'],
      reviewSection: 'Intuition — The answer that surprises everyone',
    },
    {
      id: 'p5-001-q2',
      type: 'choice',
      text: 'A person pushes a box with a 50 N force at θ = 60° to the horizontal through 4 m. How much work is done?',
      options: ['200 J', '100 J', '173 J', '400 J'],
      answer: '100 J',
      hints: ['W = Fd cos θ = 50 × 4 × cos 60°. What is cos 60°?'],
      reviewSection: 'Math — Work: constant force',
    },
    {
      id: 'p5-001-q3',
      type: 'choice',
      text: 'A satellite moves in a perfect circle. Earth\'s gravity points toward the center. How much work does gravity do each orbit?',
      options: ['Positive, since gravity is always present', 'Negative, since gravity opposes some motion', '0 J — gravity is always perpendicular to velocity', 'Depends on orbital speed'],
      answer: '0 J — gravity is always perpendicular to velocity',
      hints: ['For circular motion, centripetal force ⊥ velocity at every instant. cos 90° = 0.'],
      reviewSection: 'Challenge 1 — circular orbit',
    },
    {
      id: 'p5-001-q4',
      type: 'input',
      text: 'Force \\(\\vec{F} = (6\\hat{i} + 8\\hat{j})\\) N acts through displacement \\(\\vec{d} = (2\\hat{i} - 1\\hat{j})\\) m. Calculate the work done in joules.',
      answer: '4',
      hints: ['W = F⃗·d⃗ = FₓDₓ + FᵧDᵧ = (6)(2) + (8)(−1).'],
      reviewSection: 'Math — dot product definition',
    },
    {
      id: 'p5-001-q5',
      type: 'choice',
      text: 'Friction does negative work on a sliding box. This means:',
      options: [
        'No energy is transferred',
        'Energy is added to the box\'s motion',
        'Energy is removed from the box\'s kinetic energy',
        'The friction force is zero',
      ],
      answer: 'Energy is removed from the box\'s kinetic energy',
      hints: ['W < 0 means the force opposes displacement. Energy leaves the object (becoming heat).'],
      reviewSection: 'Math — sign of work',
    },
    {
      id: 'p5-001-q6',
      type: 'choice',
      text: 'A spring (k = 400 N/m) is compressed 0.05 m. The work done on the spring is:',
      options: ['0.25 J', '0.50 J', '1.00 J', '20 J'],
      answer: '0.50 J',
      hints: ['W = ½kx² = ½ × 400 × (0.05)².'],
      reviewSection: 'Example 2 — variable spring force',
    },
    {
      id: 'p5-001-q7',
      type: 'choice',
      text: 'The work-energy theorem states that net work equals:',
      options: [
        'The total potential energy',
        'The change in kinetic energy: ½mv_f² − ½mv_i²',
        'The applied force times time',
        'The gravitational force times height',
      ],
      answer: 'The change in kinetic energy: ½mv_f² − ½mv_i²',
      hints: ['W_net = ΔKE. This is derived in the next lesson.'],
      reviewSection: 'Math — Work-Energy Theorem callout',
    },
    {
      id: 'p5-001-q8',
      type: 'choice',
      text: 'Units of work in SI are:',
      options: ['W (watts)', 'J (joules) = N·m', 'kg·m/s', 'Pa (pascals)'],
      answer: 'J (joules) = N·m',
      hints: ['Work = force × distance. N × m = J.'],
      reviewSection: 'Math — units of work',
    },
    {
      id: 'p5-001-q9',
      type: 'input',
      text: 'A variable force F(x) = 3x² N acts from x = 0 to x = 2 m. Calculate the total work done in joules.',
      answer: '8',
      hints: ['W = ∫₀² 3x² dx = [x³]₀² = 8 − 0.'],
      reviewSection: 'Math — variable force integral',
    },
    {
      id: 'p5-001-q10',
      type: 'choice',
      text: 'Carrying a heavy box horizontally at constant height across a room — how much work does gravity do on the box?',
      options: [
        'Positive: gravity acts downward, box moves',
        '0 J: gravity is perpendicular to horizontal displacement',
        'Negative: gravity opposes horizontal motion',
        'Depends on the weight of the box',
      ],
      answer: '0 J: gravity is perpendicular to horizontal displacement',
      hints: ['θ = 90° between gravity (down) and displacement (horizontal). cos 90° = 0.'],
      reviewSection: 'Intuition — push a concrete wall',
    },
  ],

  misconceptions: [
    {
      id: 'p5-001-m1',
      misconception: 'Holding something heavy requires no energy, so physics must be wrong when it says work = 0.',
      correction: 'Physics tracks mechanical work on the object — energy transferred into its motion or stored potential energy. Your muscles do burn biological energy (ATP) to maintain isometric tension, but that energy becomes heat and chemical waste, not work on the barbell. Physics and biology define "work" differently on purpose.',
      correctionExample: 'Hold a 10 kg dumbbell still overhead. Displacement = 0. W = Fd cos θ = anything × 0 = 0 J on the dumbbell. The ATP your biceps burned is real energy — it just became heat, not mechanical work on the dumbbell.',
    },
    {
      id: 'p5-001-m2',
      misconception: 'A larger force always means more work done.',
      correction: 'Work depends on three things: force magnitude, displacement, AND alignment (cos θ). A huge force perpendicular to motion does zero work. A small force perfectly aligned with motion does positive work.',
      correctionExample: 'A crane holding a 10,000 N load stationary: enormous force, zero displacement → W = 0 J. A 5 N hand pushing a toy car 1 m in the same direction → W = 5 J. The 5 N force did more work than the 10,000 N crane.',
    },
    {
      id: 'p5-001-m3',
      misconception: 'Negative work means the force is doing something wrong or impossible.',
      correction: 'Negative work simply means the force is removing kinetic energy from the object — opposing its motion. Friction, air resistance, and braking forces all do negative work. This is not only possible but essential to slowing things down.',
      correctionExample: 'A car braking: friction does W = −3000 J on the car, reducing its kinetic energy by 3000 J. The negative sign means energy left the car (into the brakes as heat), which is exactly what you want when stopping.',
    },
  ],

  transferPrompts: [
    {
      id: 'p5-001-tp1',
      prompt: 'A door is opened by pushing perpendicular to its face (θ = 0°) vs. pushing near the hinge (same force, same displacement along the door edge). In the hinge case, most force is perpendicular to the swing arc. How does the work-angle relationship explain why door handles are at the far edge?',
      connection: 'The perpendicular component of force to the swing direction decreases as you move toward the hinge, reducing the effective cos θ and requiring more force to do the same rotational work.',
    },
    {
      id: 'p5-001-tp2',
      prompt: 'A ramp lets you move a heavy object to a height h using less force than lifting it straight up. If both paths result in the same change in height, the work done against gravity is identical. What does this tell you about the relationship between path length, force, and work?',
      connection: 'Work against gravity = mgh regardless of path. A ramp reduces force at the cost of longer distance. W = Fd cos θ remains constant — the ramp trades force for distance, keeping total work the same.',
    },
    {
      id: 'p5-001-tp3',
      prompt: 'In your previous study of dot products (linear algebra), you computed the projection of one vector onto another. Identify exactly where that projection appears in W = F⃗·d⃗ and explain why the dot product is the natural operation for work.',
      connection: 'W = F⃗·d⃗ extracts the component of force along the displacement direction — literally a projection. The dot product is defined to do exactly this: multiply magnitudes × cos(angle between them), which is the scalar projection of one vector onto the other.',
    },
  ],

  debugging: [
    {
      id: 'p5-001-db1',
      scenario: 'A student calculates work done by a 100 N force through 5 m as W = 100 × 5 = 500 J, but the force was applied at 30° to the displacement.',
      error: 'Forgot the cos θ factor.',
      fix: 'W = Fd cos θ = 100 × 5 × cos 30° = 500 × 0.866 = 433 J. Always identify the angle between force and displacement vectors before computing.',
    },
    {
      id: 'p5-001-db2',
      scenario: 'A student integrates F(x) = 5x from x = 2 to x = 4 and gets W = [5x²]₂⁴ = 80 − 20 = 60 J.',
      error: 'Forgot the ½ in the antiderivative. ∫5x dx = (5/2)x², not 5x².',
      fix: 'W = ∫₂⁴ 5x dx = [(5/2)x²]₂⁴ = (5/2)(16) − (5/2)(4) = 40 − 10 = 30 J.',
    },
  ],

  mastery: {
    targetLevel: 'Apply W = F⃗·d⃗ = Fd cos θ and W = ∫F(x) dx to constant and variable forces; correctly identify when work is zero, positive, or negative; sum work by multiple forces to find net work.',
    checklistItems: [
      'Can identify the angle θ between force and displacement and apply cos θ correctly',
      'Can compute work for variable forces using definite integration',
      'Can sum work by multiple forces (including zero-work forces like gravity perpendicular to motion)',
      'Can explain why the dot product is the correct mathematical operation for work',
    ],
    commonStruggles: [
      'Forgetting that perpendicular forces do zero work (gravity on horizontal motion, normal force)',
      'Missing the ½ factor when integrating linear forces (spring energy)',
    ],
    nextSteps: 'Work is the mechanism that changes kinetic energy — Lesson 2 derives the Work-Energy Theorem: W_net = ΔKE = ½mv_f² − ½mv_i². Every energy calculation in the rest of this course builds on what you just learned.',
  },

  semantics: {
    core: [
      { symbol: 'W = F⃗·d⃗', meaning: 'work equals the dot product of force and displacement — only the aligned component transfers energy' },
      { symbol: 'W = Fd cos θ', meaning: 'equivalent scalar form: θ is the angle between the force and displacement vectors' },
      { symbol: 'W = ∫F(x) dx', meaning: 'work done by a variable force equals the area under the F vs. x graph' },
      { symbol: 'W > 0', meaning: 'force aids motion — energy added to the object' },
      { symbol: 'W = 0', meaning: 'force perpendicular to motion — steers but does not speed up or slow down' },
      { symbol: 'W < 0', meaning: 'force opposes motion — energy removed from the object (e.g., friction, braking)' },
    ],
    rulesOfThumb: [
      'Check θ first: if force is perpendicular to motion (θ = 90°), work is zero — no calculation needed.',
      'For a spring: W = ½kx². The ½ comes from integrating F = kx from 0 to x.',
      'Normal force and gravity do zero work on horizontal motion — they are perpendicular to displacement.',
      'Net work = algebraic sum of all individual works. Negative works reduce the total.',
      'If the force-position graph is a triangle, W = ½ × base × height (area of the triangle).',
    ],
  },

  notebooks: {
    python: {
      type: 'PythonNotebook',
      props: {
        initialCells: [
        {
          cellTitle: 'Computing Work with Vectors',
          type: 'code',
          language: 'python',
          code: `import numpy as np
import matplotlib.pyplot as plt

# Constant force and displacement as vectors
F = np.array([30, 40])   # N
d = np.array([5, 0])     # m  (horizontal displacement)

W = np.dot(F, d)
theta = np.degrees(np.arccos(np.dot(F, d) / (np.linalg.norm(F) * np.linalg.norm(d))))

print(f"Force vector: {F} N")
print(f"Displacement: {d} m")
print(f"Work W = F·d = {W:.1f} J")
print(f"Angle between F and d: {theta:.1f}°")
print(f"W = |F||d|cos(θ) = {np.linalg.norm(F):.1f} × {np.linalg.norm(d):.1f} × cos({theta:.1f}°) = {W:.1f} J")`,
          prose: [
            '`np.dot(F, d)` computes the dot product F⃗·d⃗ directly — this IS the definition of work. It multiplies matching components and sums: Fₓdₓ + Fᵧdᵧ.',
            '`np.arccos(...)` recovers the angle θ between the vectors. Notice that W = Fd cos θ gives the same number as np.dot — they are the same formula in two forms.',
            'Only the x-component of F (30 N) contributes work here since d is horizontal. The y-component (40 N) is perpendicular to displacement and does zero work — verified by the calculation.',
          ],
        },
        {
          cellTitle: 'Visualizing Work as Force Projection',
          type: 'code',
          language: 'python',
          code: `import numpy as np
import matplotlib.pyplot as plt

fig, axes = plt.subplots(1, 2, figsize=(12, 5))

# Left: show force decomposition
angles = np.linspace(0, 180, 181)
W_values = 50 * 3 * np.cos(np.radians(angles))  # F=50N, d=3m

ax1 = axes[0]
ax1.plot(angles, W_values, 'b-', linewidth=2)
ax1.axhline(y=0, color='k', linewidth=0.5)
ax1.fill_between(angles, W_values, where=(W_values > 0), alpha=0.3, color='green', label='Positive work')
ax1.fill_between(angles, W_values, where=(W_values < 0), alpha=0.3, color='red', label='Negative work')
ax1.set_xlabel('Angle θ (degrees)')
ax1.set_ylabel('Work W (J)')
ax1.set_title('W = 50×3×cos θ vs Angle')
ax1.legend()
ax1.grid(True)

# Right: vector diagram
ax2 = axes[1]
theta_deg = 35
theta = np.radians(theta_deg)
F_mag, d_mag = 50, 3
ax2.annotate('', xy=(d_mag, 0), xytext=(0, 0),
             arrowprops=dict(arrowstyle='->', color='blue', lw=2))
ax2.annotate('', xy=(F_mag/20 * np.cos(theta), F_mag/20 * np.sin(theta)), xytext=(0, 0),
             arrowprops=dict(arrowstyle='->', color='red', lw=2))
ax2.text(1.5, -0.2, 'd', color='blue', fontsize=12)
ax2.text(1.8, 0.8, 'F', color='red', fontsize=12)
proj = F_mag * np.cos(theta)
ax2.annotate('', xy=(proj/20, 0), xytext=(0, 0),
             arrowprops=dict(arrowstyle='->', color='green', lw=2))
ax2.text(proj/20 + 0.1, -0.15, f'F·cos{theta_deg}°={proj:.0f}N', color='green', fontsize=9)
ax2.set_xlim(-0.5, 4)
ax2.set_ylim(-0.5, 3)
ax2.set_title(f'Projection of F onto d (θ={theta_deg}°)')
ax2.grid(True)
plt.tight_layout()
plt.show()`,
          prose: [
            'The left plot shows W = 50 × 3 × cos θ for all angles 0–180°. At 90° the curve crosses zero — force perpendicular to motion does no work. At 180° work is maximally negative — force fully opposing motion.',
            'The right diagram shows the projection of F onto d. The green arrow is F cos θ — the component that does the actual work. This is the geometric meaning of the dot product.',
            'Positive work (green region) adds energy; negative work (red region) removes it. This sign convention directly feeds the Work-Energy Theorem in the next lesson.',
          ],
        },
        {
          cellTitle: 'Work by a Variable Force — Spring Integration',
          type: 'code',
          language: 'python',
          code: `import numpy as np
import matplotlib.pyplot as plt
from scipy import integrate

k = 200  # N/m spring constant

x = np.linspace(0, 0.15, 300)
F_spring = k * x  # Hooke's Law: F = kx

# Analytical: W = ½kx²
x_final = 0.10  # m
W_analytical = 0.5 * k * x_final**2

# Numerical integration to verify
W_numerical, _ = integrate.quad(lambda xi: k * xi, 0, x_final)

print(f"Spring constant k = {k} N/m")
print(f"Compression x = {x_final} m")
print(f"Analytical W = ½kx² = {W_analytical:.3f} J")
print(f"Numerical  W = ∫F dx = {W_numerical:.3f} J")

fig, ax = plt.subplots(figsize=(8, 5))
ax.plot(x, F_spring, 'b-', linewidth=2, label='F(x) = kx')
ax.fill_between(x[x <= x_final], F_spring[x <= x_final], alpha=0.3, color='blue',
                label=f'Work = {W_analytical:.3f} J (area of triangle)')
ax.set_xlabel('Compression x (m)')
ax.set_ylabel('Force F (N)')
ax.set_title('Work Done by Spring Force = Area Under F-x Curve')
ax.legend()
ax.grid(True)
plt.tight_layout()
plt.show()`,
          prose: [
            '`integrate.quad` numerically computes ∫F(x) dx — it should match the analytical ½kx² exactly. This verifies that the formula W = ½kx² comes directly from integrating Hooke\'s Law F = kx.',
            'The shaded area in the plot IS the work done — the integral is the area under the curve. For a linear force, this area is a triangle: W = ½ × base × height = ½ × x × kx = ½kx².',
            'Comparing analytical and numerical results builds trust in both methods. The definite integral generalizes to ANY force shape — not just springs.',
          ],
        },
        {
          cellTitle: 'Net Work and Multiple Forces',
          type: 'code',
          language: 'python',
          challengeType: 'write',
          prompt: 'A 15 kg box is pushed 6 m horizontally with a 90 N applied force at 20° below horizontal. Friction = 25 N opposing motion. Gravity = 147 N down. Normal force = 147 N + 90 sin 20° = 177.8 N up. Calculate work by each force and the net work. Then predict: does the box speed up or slow down?',
          starterCode: `import numpy as np

m = 15       # kg
g = 9.8      # m/s²
d = 6        # m displacement (horizontal)
F_app = 90   # N at 20° BELOW horizontal
theta_app = 20  # degrees below horizontal
f_friction = 25  # N opposing motion

# TODO: Calculate W_applied (F_app has horizontal component only doing work)
# TODO: Calculate W_friction (force opposes motion, θ = 180°)
# TODO: Calculate W_gravity (force down, motion horizontal, θ = ?)
# TODO: Calculate W_normal (force up, motion horizontal, θ = ?)
# TODO: W_net = sum of all four
# TODO: Print each and state whether box speeds up (W_net > 0) or slows down`,
        },
      ]
      },
    },
    matlab: {
      type: 'OpenMatNotebook',
      props: {
        initialCells: [
        {
          cellTitle: 'Work as a Dot Product',
          type: 'code',
          language: 'matlab',
          code: `% Work as a dot product
F = [30, 40];    % Force vector [Fx, Fy] in N
d = [5, 0];      % Displacement vector [dx, dy] in m

W = dot(F, d);
theta = acosd(dot(F,d) / (norm(F) * norm(d)));

fprintf('Work W = F·d = %.1f J\\n', W)
fprintf('Angle between F and d = %.1f degrees\\n', theta)
fprintf('W = |F||d|cos(theta) = %.1f x %.1f x cos(%.1f) = %.1f J\\n', ...
        norm(F), norm(d), theta, W)`,
          prose: [
            '`dot(F, d)` is MATLAB\'s built-in dot product — it computes Fₓdₓ + Fᵧdᵧ directly. This is mathematically identical to W = Fd cos θ; both give the same number from different representations.',
            '`norm(F)` gives the magnitude |F⃗|. Combined with `acosd`, we recover the angle θ between the vectors. This angle is what cos θ in W = Fd cos θ refers to.',
            'With d purely horizontal, only Fₓ = 30 N contributes. The vertical component (Fy = 40 N) is perpendicular to displacement and does zero work — the dot product encodes this automatically.',
          ],
        },
        {
          cellTitle: 'Spring Energy — Numerical and Analytical',
          type: 'code',
          language: 'matlab',
          code: `% Spring work: comparing analytical and numerical
k = 200;         % N/m spring constant
x_final = 0.10;  % m compression

% Analytical: W = (1/2)kx^2
W_analytical = 0.5 * k * x_final^2;

% Numerical integration using integral()
W_numerical = integral(@(x) k*x, 0, x_final);

fprintf('Analytical W = (1/2)kx^2 = %.3f J\\n', W_analytical)
fprintf('Numerical  W = integral(kx) = %.3f J\\n', W_numerical)

% Plot F-x curve
x = linspace(0, 0.15, 200);
F = k * x;
figure;
plot(x, F, 'b-', 'LineWidth', 2); hold on;
fill([0, x_final, x_final, 0], [0, k*x_final, 0, 0], 'b', 'FaceAlpha', 0.3)
xlabel('Compression x (m)'); ylabel('Force F (N)')
title(sprintf('Work = Shaded Area = %.3f J', W_analytical))
grid on`,
          prose: [
            '`integral(@(x) k*x, 0, x_final)` evaluates ∫₀^x kx dx numerically. Both results should match ½kx², confirming the integral formula.',
            '`fill` draws the triangular shaded area under the F-x curve — this area is geometrically the work done. For a linear force, the triangle has area = ½ × base × height = ½ × x × kx = ½kx².',
            'The `@(x) k*x` syntax creates an anonymous function — MATLAB\'s equivalent of a lambda. You can replace `k*x` with any force law to compute work for non-spring forces.',
          ],
        },
        {
          cellTitle: 'Work at Different Angles',
          type: 'code',
          language: 'matlab',
          code: `% How angle affects work
F_mag = 50;  % N
d_mag = 3;   % m

angles = 0:1:180;
W = F_mag * d_mag * cosd(angles);

figure;
plot(angles, W, 'b-', 'LineWidth', 2); hold on;
yline(0, 'k--');
fill([angles(W>=0) fliplr(angles(W>=0))], [W(W>=0) zeros(1,sum(W>=0))], 'g', 'FaceAlpha', 0.3)
fill([angles(W<=0) fliplr(angles(W<=0))], [W(W<=0) zeros(1,sum(W<=0))], 'r', 'FaceAlpha', 0.3)
xlabel('Angle θ (degrees)'); ylabel('Work W (J)')
title('W = 50 × 3 × cos θ — Green: positive work, Red: negative')
grid on
fprintf('At 0 deg: W = %.1f J (maximum)\\n', F_mag*d_mag*cosd(0))
fprintf('At 90 deg: W = %.1f J (perpendicular - no work)\\n', F_mag*d_mag*cosd(90))
fprintf('At 180 deg: W = %.1f J (opposing motion)\\n', F_mag*d_mag*cosd(180))`,
          prose: [
            '`cosd(angles)` takes degrees directly (vs `cos` which needs radians). The output confirms the three key cases: θ = 0° gives W = +150 J, θ = 90° gives W = 0 J, θ = 180° gives W = −150 J.',
            'The green fill shows where force aids motion (positive work, energy added); the red fill shows where force opposes motion (negative work, energy removed). This visual directly corresponds to the sign convention in the math section.',
            '`yline(0)` marks the zero-work line. Any force applied at exactly 90° to displacement falls on this line — gravity on horizontal motion, normal force on any horizontal surface.',
          ],
        },
        {
          cellTitle: 'Net Work on a Box — Multiple Forces',
          type: 'code',
          challengeType: 'write',
          language: 'matlab',
          prompt: 'A 20 kg box is pushed 4 m horizontally. Applied force: 80 N horizontal. Friction: 30 N opposing motion. Calculate W for each force, W_net, and verify: W_net equals the change in kinetic energy if the box started from rest. (Hint: W_net = ΔKE → v_f = sqrt(2*W_net/m))',
          starterCode: `% Net work on a box — multiple forces
m = 20;      % kg
d = 4;       % m displacement
F_push = 80; % N horizontal
f_fric = 30; % N opposing motion

% TODO: W_push = ?
% TODO: W_friction = ?  (friction OPPOSES motion, so theta = 180 deg)
% TODO: W_gravity = ?   (gravity vertical, motion horizontal)
% TODO: W_normal = ?    (normal vertical, motion horizontal)
% TODO: W_net = sum of all

% TODO: if box starts from rest, v_f = sqrt(2*W_net / m)
% TODO: fprintf results`,
        },
      ]
      },
    },
  },
}
