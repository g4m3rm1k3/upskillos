export default {
  id: 'p0-005',
  slug: 'graphs-as-physics',
  chapter: 'p0',
  order: 4,
  title: 'Graphs as Physics',
  subtitle: 'Reading position, velocity, and acceleration from curves — without solving a single equation.',
  tags: ['x-t graph', 'v-t graph', 'slope', 'area under curve', 'graph reading', 'motion analysis', 'kinematics graphs'],

  hook: {
    question:
      'A police officer shows you a position-time graph from a speed camera. The graph is a steep straight line going upward. You don\'t know the equation. You don\'t need it. Just by looking at the slope of the line, you can instantly tell:this car was moving fast and at constant speed. If the graph curves upward, it was accelerating. If it\'s flat, the car was stopped. Every physics graph is a picture of the motion — if you know how to read it. What does every feature of an x-t or v-t graph tell you?',
    realWorldContext:
      'Seismologists read earthquake waves from time-series graphs. Doctors read heart rhythms from ECGs. Engineers read stress vs. time from structural monitoring. Physicists read particle trajectories from detector readouts. In all of these: understanding what slopes and areas mean is the fundamental skill. This lesson makes you fluent in the visual language of physics.',
    previewVisualizationId: 'SVGDiagram',
    previewVisualizationProps: { type: 'xt-vt-graphs' },
  },

  intuition: {
    prose: [
      '**The x–t graph: slope = velocity. **On a position-vs-time graph (x on the vertical axis, t on the horizontal),the slope of the curve at any point equals the instantaneous velocity at that moment. Steep positive slope → moving fast in the positive direction. Zero slope (horizontal) → momentarily stopped or at constant position. Steep negative slope → moving fast in the negative direction. Curved upward (increasing slope) → speeding up. Curved downward (decreasing slope) → slowing down.',

      '**The v–t graph: slope = acceleration, area = displacement. **On a velocity-vs-time graph, the slope at any point equals the instantaneous acceleration. But there is a second tool: the **area under the v–t graph** equals displacement. A rectangle of width Δt and height v gives displacement v·Δt. Many rectangles stacked up approximate the total displacement over any interval. As the rectangles shrink to zero width — this is the integral. No calculus notation needed yet: just "area under the curve equals displacement."',

      '**Reading motion stories from graphs. **Every x–t or v–t graph tells a story. A flat x–t line: the object is at rest. A straight x–t line with positive slope: constant positive velocity. A parabolic x–t curve opening upward: constant positive acceleration from rest. A straight v–t line with negative slope: constant deceleration. A v–t graph touching zero and bouncing: the object turned around (direction reversed). Reading these patterns is faster than solving equations — and builds intuition that equations alone cannot give.',

      '**The twin graphs — x–t and v–t together. **The x–t and v–t graphs are linked by the slope relationship. Wherever x–t has zero slope, the v–t graph crosses zero. Wherever x–t has maximum slope, v–t has its maximum value. Wherever x–t is a parabola, v–t is a straight line. Looking at both graphs simultaneously — one describes position, the other its rate of change — gives a complete picture of the motion.',
    ],
    callouts: [
      {
        type: 'sequencing',
        title: 'Lesson 5 of 8 — Chapter 0: Orientation',
        body:
          '**Previous (Lesson 4):** Average vs instantaneous — slope of secant vs tangent.\\n**This lesson:** Graphs — reading x–t and v–t graphs for motion information.\\n**Next (Lesson 6):** Vectors vs scalars — direction matters.\\n**Why it matters:** Every kinematic problem in Ch. 1–2 has a graphical interpretation.',
      },
      {
        type: 'theorem',
        title: 'The two fundamental graph relationships',
        body:
          '\\text{On an } x\\text{-}t \\text{ graph: slope at any point} = v(t) \\\\\\text{On a } v\\text{-}t \\text{ graph: slope at any point} = a(t) \\\\\\text{On a } v\\text{-}t \\text{ graph: area under curve from } t_1 \\text{ to } t_2 = \\Delta x',
      },
      {
        type: 'insight',
        title: 'What each graph shape means',
        body:
          '\\text{x–t flat: object at rest.}\\\\\\text{x–t straight line: constant velocity.}\\\\\\text{x–t parabola opening up: constant positive acceleration.}\\\\\\text{v–t flat: constant velocity (zero acceleration).}\\\\\\text{v–t straight line: constant acceleration.}\\\\\\text{v–t crosses zero: object reversed direction.}',
      },
      {
        type: 'warning',
        title: 'Height vs slope — the most common graph-reading mistake',
        body:
          '\\text{High position on an x–t graph is not high velocity.}\\\\\\text{Velocity comes from SLOPE, not from how high the curve sits.}\\\\\\text{An object can be at high x with zero velocity (at rest up high).}\\\\\\text{Similarly on v–t: high velocity is not high acceleration.}',
      },
    ],
    visualizations: [
      {
        id: 'SVGDiagram',
        props: { type: 'xt-vt-graphs' },
        title: 'x–t and v–t graphs side by side',
        mathBridge:
          'Cover the v–t panel. On the x–t graph: identify where the slope is steepest (fastest),where it is zero (stopped), where it is decreasing (slowing down). Now uncover the v–t panel. The peak of the x–t slope corresponds to the peak of v–t. The zero slope of x–t corresponds to v–t crossing zero.',
        caption: 'Slope of x–t = value of v–t. Slope of v–t = value of a. Area under v–t = Δx.',
      },
      {
        id: 'PositionVelocityAcceleration',
        title: 'Live x(t), v(t), a(t) — drag the time slider',
        mathBridge:
          'Drag the slider to move through time. Watch all three graphs update simultaneously. Pay attention to the sign of v when x is decreasing,and the sign of a when v is decreasing.',
        caption: 'The three kinematic functions are three views of the same motion.',
      },
    ],
  },

  math: {
    prose: [
      '**Reading average velocity from an x–t graph. **Draw a straight line (secant) between two points \\((t_1, x_1)\\) and \\((t_2, x_2)\\). The slope of this line = \\(\\Delta x / \\Delta t\\) = average velocity over that interval. No formula needed — pick any two points, measure the rise and the run.',
      '**Computing displacement from a v–t graph. **If the v–t graph is a rectangle (constant velocity v over time Δt):displacement = v × Δt = area of rectangle. If the v–t graph is a triangle (velocity from 0 to v_f over Δt):displacement = ½ × base × height = ½ × Δt × v_f. More complex shapes: break into triangles and rectangles, sum the areas.',
      '**The constant-acceleration case on graphs. **When acceleration is constant:a–t graph: flat horizontal line at height a.v–t graph: straight line with slope a and y-intercept v₀.x–t graph: parabola with curvature set by a. All three shapes are the "constant acceleration signature."',
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'Displacement from v–t graph',
        body:
          '\\Delta x = \\text{(area under v–t curve from } t_1 \\text{ to } t_2\\text{)}\\\\\\text{Rectangle: } \\Delta x = v \\cdot \\Delta t\\\\\\text{Triangle: } \\Delta x = \\tfrac{1}{2} \\cdot \\Delta t \\cdot (v_f - v_i)\\\\\\text{Trapezoid: } \\Delta x = \\tfrac{1}{2}(v_i + v_f) \\cdot \\Delta t',
      },
      {
        type: 'insight',
        title: 'Constant acceleration — the three graph signatures',
        body:
          '\\text{a–t graph: } \\text{horizontal line at } a\\\\\\text{v–t graph: } \\text{straight line, slope} = a\\\\\\text{x–t graph: } \\text{parabola, opens upward for } a > 0\\\\\\text{Memorize these three shapes — they appear in every kinematics problem.}',
      },
      {
        type: 'definition',
        title: 'Signed area under v–t graph',
        body:
          '\\text{Area above the t-axis (v > 0): positive displacement (moving in +x direction).}\\\\\\text{Area below the t-axis (v < 0): negative displacement (moving in −x direction).}\\\\\\text{Total displacement = net signed area.}\\\\\\text{Total distance = total unsigned area (both parts positive).}',
      },
    ],
    visualizations: [
      {
        id: 'SVGDiagram',
        props: { type: 'algebra-trapezoid' },
        title: 'Why Δx = ½(v₀+v)t — the area of a trapezoid',
        mathBridge:
          'For constant acceleration, v(t) is a straight line. The area under a straight-line v–t graph from 0 to t is a trapezoid:width = t, left height = v₀, right height = v. Area = ½(v₀ + v)·t = displacement. This is not calculus — it is pure geometry.',
        caption: 'Δx = ½(v₀+v)t is a geometry result — area of the trapezoid under the v-t line.',
      },
      {
        id: 'PythonNotebook',
        title: 'Read and plot motion graphs — build the physics intuition',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Stage 1 — Plot x(t) and v(t) Side by Side',
              prose: 'For free fall: x = ½gt² and v = gt. Plot both and compare their shapes.',
              instructions: 'Run. Notice: x is a parabola, v is a straight line. Confirm slope of x = value of v.',
              code:
                'import numpy as np\nfrom opencalc import Figure\n\ng = 9.8\nt = np.linspace(0, 4, 200)\nx = 0.5 * g * t**2\nv = g * t\n\nfig1 = Figure(xmin=0, xmax=4.2, ymin=0, ymax=85)\nfig1.plot(t.tolist(), x.tolist(), color="blue", label="x(t)=½gt²")\nfig1.xlabel("t (s)").ylabel("x (m)").title("Position — x-t graph (parabola)")\nfig1.show()\n\nfig2 = Figure(xmin=0, xmax=4.2, ymin=0, ymax=42)\nfig2.plot(t.tolist(), v.tolist(), color="green", label="v(t)=gt")\nfig2.xlabel("t (s)").ylabel("v (m/s)").title("Velocity — v-t graph (straight line)")\nfig2.show()',
              output: '',
              status: 'idle',
            },
            {
              id: 2,
              cellTitle: 'Stage 2 — Verify Area = Displacement',
              prose: 'The area under the v–t graph equals displacement. For v = gt, the area from 0 to t is a triangle: ½·t·(gt) = ½gt². This should equal x(t).',
              instructions: 'Run. The numerical area (from summing rectangles) should match ½gt².',
              code:
                'import numpy as np\n\ng = 9.8\nT = 3.0  # compute displacement from t=0 to t=T\n\n# Numerical area under v(t) = g*t from 0 to T\ndt = 0.001\nt_vals = np.arange(0, T, dt)\nv_vals = g * t_vals\narea = np.sum(v_vals * dt)  # sum of v * dt rectangles\n\n# Exact displacement\nexact = 0.5 * g * T**2\n\nprint(f"Numerical area under v-t graph = {area:.4f} m")\nprint(f"Exact x(T) = ½gT² = {exact:.4f} m")\nprint(f"Error: {abs(area-exact)/exact*100:.3f}%")',
              output: '',
              status: 'idle',
            },
            {
              id: 11,
              challengeType: 'write',
              challengeNumber: 1,
              challengeTitle: 'Challenge — Read Velocity from x(t)',
              difficulty: 'medium',
              prompt:
                'For x(t) = 4t² − 2t + 1, estimate the instantaneous velocity at t = 2 sby computing (x(2.001) − x(1.999)) / 0.002. Store result in v_inst.',
              instructions: '1. Evaluate x(2.001) and x(1.999).\n2. Divide the difference by 0.002.',
              code:
                'def x(t):\n    return 4*t**2 - 2*t + 1\n\nv_inst = \n\nprint(f"v(2) ≈ {v_inst:.4f} m/s")',
              output: '',
              status: 'idle',
              testCode:
                '\ndef x(t): return 4*t**2 - 2*t + 1\nexpected = (x(2.001) - x(1.999)) / 0.002\nif abs(v_inst - expected) > 0.01:\n    raise ValueError(f"Expected ≈{expected:.4f}, got {v_inst}")\nres = f"SUCCESS: v(2) ≈ {v_inst:.4f} m/s. Exact: v = 8t−2, v(2) = 14 m/s."\nres\n',
              hint: 'v_inst = (x(2.001) - x(1.999)) / 0.002',
            },
          ],
        },
      },
    ],
  },

  rigor: {
    prose: [
      '**Why "area = displacement" is really an integral. **The displacement from \\(t_1\\) to \\(t_2\\) is \\(\\Delta x = \\int_{t_1}^{t_2} v(t)\\,dt\\). The integral is defined as the limit of a sum of rectangles:divide [t₁, t₂] into n sub-intervals of width Δt = (t₂−t₁)/n,compute v at the left endpoint of each, multiply by Δt, sum. As n → ∞ (Δt → 0), this sum converges to the area under the curve. This is exactly the Riemann integral — but the geometric intuition (area) comes first.',
      '**The Fundamental Theorem of Calculus — previewed in kinematics. **Position is the integral of velocity: \\(x(t) = x_0 + \\int_0^t v(\\tau)\\,d\\tau\\). Velocity is the derivative of position: \\(v = dx/dt\\). These are inverses of each other — differentiation and integration undo each other. This is the Fundamental Theorem of Calculus,and kinematics is its most natural physical manifestation.',
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'The kinematic version of the Fundamental Theorem',
        body:
          '\\text{Derivative: } v(t) = \\frac{dx}{dt} \\quad \\text{(slope of x–t graph)}\\\\\\text{Integral: } x(t) = x_0 + \\int_0^t v(\\tau)\\,d\\tau \\quad \\text{(area under v–t graph)}\\\\\\text{These two operations are inverses. This IS the Fundamental Theorem of Calculus.}',
      },
      {
        type: 'insight',
        title: 'Concavity — the second derivative tells the shape',
        body:
          '\\text{If } \\frac{d^2x}{dt^2} = a > 0\\text{: x–t parabola opens upward (speeding up in + direction)}\\\\\\text{If } \\frac{d^2x}{dt^2} = a < 0\\text{: x–t parabola opens downward (slowing down or going negative)}\\\\\\text{The second derivative = acceleration = curvature of the x–t graph.}',
      },
    ],
    proofSteps: [
      {
        expression: '\\Delta x = \\int_{t_1}^{t_2} v(t)\\,dt',
        annotation: 'Displacement is the integral of velocity — area under the v–t curve.',
      },
      {
        expression: '\\approx \\sum_{i=1}^{n} v(t_i) \\cdot \\Delta t \\quad \\text{where } \\Delta t = \\frac{t_2-t_1}{n}',
        annotation: 'Approximate as a sum of rectangles, each with height v(tᵢ) and width Δt.',
      },
      {
        expression: '\\text{For } v(t) = gt: \\sum_{i} gt_i \\cdot \\Delta t = g \\cdot \\Delta t \\sum_i t_i \\approx g \\cdot \\frac{T^2}{2}',
        annotation: 'For constant acceleration, the sum evaluates to ½gT² as n → ∞.',
      },
      {
        expression: '\\therefore \\Delta x = \\frac{1}{2}gT^2 = x(T) - x(0) \\quad \\checkmark',
        annotation: 'This matches x(T) = ½gT² — confirming area = displacement.',
      },
    ],
    title: 'Area under v–t = displacement: a Riemann sum argument',
    visualizations: [
      {
        id: 'SVGDiagram',
        props: { type: 'riemann-rect' },
        title: 'Riemann rectangles converging to the integral',
        mathBridge:
          'Each rectangle has height v(tᵢ) and width Δt. Their total area approximates displacement. As rectangles get thinner, the approximation improves. The limiting total area is the integral — exact displacement.',
        caption: 'The integral ∫v dt is the limit of the Riemann sum — exact area, exact displacement.',
      },
      {
        id: 'PositionVelocityAcceleration',
        title: 'The Fundamental Theorem in action — x, v, a linked live',
        mathBridge:
          'Drag the time slider. The slope of x(t) at any point equals the value of v(t) at that same point — this is the derivative relationship. The area swept under v(t) up to time t equals the accumulated displacement on x(t) — this is the integral relationship. Both together are the Fundamental Theorem of Calculus.',
        caption: 'x(t) and v(t) are inverses of each other: slope of x = v, area under v = Δx.',
      },
    ],
  },

  examples: [
    {
      id: 'p0-005-ex1',
      title: 'Reading velocity from an x–t graph',
      problem:
        '\\text{An x–t graph shows a straight line from (0, 0) to (4, 48). What is the velocity? Is it constant?}',
      steps: [
        {
          expression: 'v = \\text{slope} = \\frac{\\Delta x}{\\Delta t} = \\frac{48 - 0}{4 - 0} = 12\\,\\text{m/s}',
          annotation: 'Rise = 48 m, run = 4 s. Slope = 12 m/s.',
        },
        {
          expression: '\\text{Straight line} \\Rightarrow \\text{slope is constant} \\Rightarrow \\text{velocity is constant}',
          annotation: 'A straight x–t line means constant velocity.',
        },
      ],
      conclusion: 'Velocity = 12 m/s, constant. (Zero acceleration.)',
    },
    {
      id: 'p0-005-ex2',
      title: 'Displacement from a v–t graph (trapezoid)',
      problem:
        '\\text{A v–t graph shows velocity rising linearly from 0 to 20 m/s over 4 s. What is the displacement?}',
      steps: [
        {
          expression: '\\text{Area under v–t} = \\text{triangle} = \\tfrac{1}{2} \\times \\text{base} \\times \\text{height}',
          annotation: 'A straight v–t line from v=0 to v=20 over t=4 forms a right triangle.',
        },
        {
          expression: '\\Delta x = \\tfrac{1}{2} \\times 4\\,\\text{s} \\times 20\\,\\text{m/s} = 40\\,\\text{m}',
          annotation: '½ × 4 × 20 = 40.',
        },
      ],
      conclusion:
        'Displacement = 40 m. Confirm: x = ½at² with a = 5 m/s² (slope of v–t line): x = ½(5)(16) = 40 m. ✓',
    },
    {
      id: 'p0-005-ex3',
      title: 'Reading a two-phase motion graph',
      problem:
        '\\text{A v–t graph shows: v = 10 m/s constant for 5 s, then v decreases linearly to 0 over the next 2 s. Find total displacement.}',
      steps: [
        {
          expression: '\\text{Phase 1: rectangle, } \\Delta x_1 = 10 \\times 5 = 50\\,\\text{m}',
          annotation: 'Constant velocity phase: area = v × t.',
        },
        {
          expression: '\\text{Phase 2: triangle, } \\Delta x_2 = \\tfrac{1}{2} \\times 2 \\times 10 = 10\\,\\text{m}',
          annotation: 'Decelerating to zero: triangle area.',
        },
        {
          expression: '\\Delta x_{\\text{total}} = 50 + 10 = 60\\,\\text{m}',
          annotation: 'Sum the areas.',
        },
      ],
      conclusion: 'Total displacement = 60 m.',
    },
    {
      id: 'p0-005-ex4',
      title: 'Identifying motion from graph shape',
      problem:
        '\\text{An x–t graph is a parabola that peaks at } t = 3\\,\\text{s and returns to zero at } t = 6\\,\\text{s. Describe the motion: direction, turning point, and sign of acceleration.}',
      steps: [
        {
          expression: '\\text{Parabola with peak: the slope goes from positive (before peak) to zero (at peak) to negative (after peak)}',
          annotation: 'Reading the slope trend: velocity is decreasing throughout.',
        },
        {
          expression: '\\text{Slope = 0 at } t=3\\,\\text{s} \\Rightarrow v=0 \\text{ at } t=3\\,\\text{s} \\Rightarrow \\text{turning point}',
          annotation: 'The object momentarily stops and reverses direction at t = 3 s.',
        },
        {
          expression: '\\text{Parabola opening downward} \\Rightarrow a < 0 \\text{ (constant negative acceleration)}',
          annotation: 'A downward parabola has negative curvature — negative second derivative — negative acceleration.',
        },
      ],
      conclusion:
        'The object moves in the +x direction (0 to 3 s), stops at t=3, then returns in the −x direction. Constant negative acceleration throughout. This is the signature of a ball thrown upward.',
    },
  ],

  challenges: [
    {
      id: 'p0-005-ch1',
      difficulty: 'easy',
      problem:
        '\\text{A v–t graph shows a horizontal line at v = 8 m/s from t=0 to t=6 s. What is the displacement? What is the acceleration?}',
      hint: 'Area of a rectangle = base × height. Horizontal v–t line means zero slope = zero acceleration.',
      walkthrough: [
        { expression: '\\Delta x = 8 \\times 6 = 48\\,\\text{m}', annotation: 'Rectangle area.' },
        { expression: 'a = \\text{slope of v–t} = 0', annotation: 'Horizontal line → zero slope → zero acceleration.' },
      ],
      answer: 'Δx = 48 m, a = 0. (Constant velocity motion.)',
    },
    {
      id: 'p0-005-ch2',
      difficulty: 'medium',
      problem:
        '\\text{A v–t graph shows v going from −6 m/s at t=0 to +6 m/s at t=4 s (linear).(a) What is the acceleration? (b) When is the object at rest? (c) What is the net displacement?}',
      hint:
        '(a) slope of v–t. (b) v = 0 when? (c) Net area — the triangle below the axis is negative.',
      walkthrough: [
        {
          expression: '\\text{(a) } a = \\frac{6-(-6)}{4-0} = \\frac{12}{4} = 3\\,\\text{m/s}^2',
          annotation: 'Slope of v–t line.',
        },
        {
          expression: '\\text{(b) v = 0 when: } -6 + 3t = 0 \\Rightarrow t = 2\\,\\text{s}',
          annotation: 'The line crosses zero at t = 2 s.',
        },
        {
          expression: '\\text{(c) Area below axis (t=0 to 2): } -\\tfrac{1}{2}(2)(6) = -6\\,\\text{m}',
          annotation: 'Triangle below the t-axis — negative displacement.',
        },
        {
          expression: '\\text{Area above axis (t=2 to 4): } +\\tfrac{1}{2}(2)(6) = +6\\,\\text{m}',
          annotation: 'Triangle above the t-axis — positive displacement.',
        },
        {
          expression: '\\Delta x_{\\text{net}} = -6 + 6 = 0\\,\\text{m}',
          annotation: 'Net displacement = 0. The object returned to its start.',
        },
      ],
      answer: '(a) a = 3 m/s². (b) At rest at t = 2 s. (c) Net displacement = 0 m.',
    },
    {
      id: 'p0-005-ch3',
      difficulty: 'hard',
      problem:
        '\\text{From the following v–t data, estimate displacement from t=0 to t=4 susing the trapezoid rule:}\\\\\\begin{array}{c|c}t\\,(\\text{s}) & v\\,(\\text{m/s})\\\\ \\hline 0 & 0 \\\\ 1 & 5 \\\\ 2 & 12 \\\\ 3 & 21 \\\\ 4 & 32\\end{array}',
      hint: 'Trapezoid rule: each interval contributes ½(v_i + v_{i+1}) × Δt.',
      walkthrough: [
        {
          expression: '\\Delta x_{[0,1]} = \\tfrac{1}{2}(0+5)(1) = 2.5\\,\\text{m}',
          annotation: 'First interval.',
        },
        {
          expression: '\\Delta x_{[1,2]} = \\tfrac{1}{2}(5+12)(1) = 8.5\\,\\text{m}',
          annotation: 'Second interval.',
        },
        {
          expression: '\\Delta x_{[2,3]} = \\tfrac{1}{2}(12+21)(1) = 16.5\\,\\text{m}',
          annotation: 'Third interval.',
        },
        {
          expression: '\\Delta x_{[3,4]} = \\tfrac{1}{2}(21+32)(1) = 26.5\\,\\text{m}',
          annotation: 'Fourth interval.',
        },
        {
          expression: '\\Delta x_{\\text{total}} = 2.5 + 8.5 + 16.5 + 26.5 = 54\\,\\text{m}',
          annotation: 'Sum all trapezoids.',
        },
      ],
      answer: 'Approximate displacement = 54 m.',
    },
  ],

  semantics: {
    core: [
      { symbol: '\\text{slope of x–t}', meaning: 'instantaneous velocity v — steeper slope = faster' },
      { symbol: '\\text{slope of v–t}', meaning: 'instantaneous acceleration a — steeper slope = more rapidly changing speed' },
      { symbol: '\\text{area under v–t}', meaning: 'displacement Δx — area above axis is +Δx, below axis is −Δx' },
      { symbol: '\\text{parabola on x–t}', meaning: 'constant acceleration — the classic free-fall signature' },
      { symbol: '\\text{straight line on x–t}', meaning: 'constant velocity — zero acceleration' },
      { symbol: '\\text{v–t crosses zero}', meaning: 'object momentarily at rest — reverses direction at that instant' },
    ],
    rulesOfThumb: [
      'Height ≠ velocity: velocity is slope, not the height of the x–t curve.',
      'A straight x–t line always means constant velocity (a = 0).',
      'A parabolic x–t curve always means constant acceleration.',
      'Area under v–t = displacement; area above axis = positive; below axis = negative.',
      'When v–t crosses the t-axis, the object reversed direction — mark this as a turning point.',
    ],
  },

  spiral: {
    recoveryPoints: [
      {
        lessonId: 'p0-004',
        label: 'Lesson 4 — Average vs Instantaneous',
        note: 'Slope of x–t is instantaneous velocity. If the distinction between average and instantaneous feels unclear, review Lesson 4.',
      },
    ],
    futureLinks: [
      {
        lessonId: 'p1-ch2-003',
        label: 'Ch. 2, Lesson 3 — Position Graph Analysis',
        note: 'Ch. 2 spends three full lessons (L3–L5) on x–t, v–t, and a–t graph reading at a deeper level.',
      },
      {
        lessonId: 'p1-ch2-009',
        label: 'Ch. 2, Lesson 9 — Displacement from Velocity Area',
        note: 'The area-under-curve idea becomes a formal integration technique in Ch. 2 L9.',
      },
    ],
  },

  assessment: {
    questions: [
      {
        id: 'p0-005-assess-1',
        type: 'choice',
        text: 'On an x–t graph, what does a zero slope mean?',
        options: ['Zero acceleration', 'Zero velocity', 'Maximum velocity', 'Maximum acceleration'],
        answer: 'Zero velocity',
        hint: 'Slope of x–t = velocity. Zero slope = zero velocity = object is momentarily at rest.',
      },
      {
        id: 'p0-005-assess-2',
        type: 'input',
        text: 'A v–t graph shows constant v = 5 m/s from t=0 to t=8 s. What is the displacement in meters?',
        answer: '40',
        hint: 'Area = v × t = 5 × 8 = 40 m.',
      },
    ],
  },

  mentalModel: [
    'x–t slope = velocity; v–t slope = acceleration; area under v–t = displacement',
    'Straight x–t line → constant velocity (a=0); parabola → constant acceleration',
    'v–t crossing zero = turning point — object reversed direction',
    'Height of x–t curve tells position, NOT velocity — this is the most common mistake',
    'Area above v–t axis = positive displacement; below = negative displacement; net = algebraic sum',
    'The kinematic triple: a–t is flat, v–t is straight, x–t is quadratic — for constant a',
  ],

  notebooks: {
    python: {
      type: 'python',
      cells: [
        {
          cellTitle: 'Plotting x–t and v–t Together',
          type: 'code',
          language: 'python',
          prose: [
            `The x–t and v–t graphs are linked: the slope of x–t gives the value shown on v–t. Plot them side by side and confirm this relationship by picking specific points.`,
          ],
          code: `import numpy as np
import matplotlib.pyplot as plt

g = 9.8
v0 = 15.0   # m/s initial upward
x0 = 0.0

t = np.linspace(0, 3.1, 300)
x_vals = x0 + v0*t - 0.5*g*t**2
v_vals = v0 - g*t

# Find turning point (v=0)
t_peak = v0 / g
x_peak = x0 + v0*t_peak - 0.5*g*t_peak**2

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8), sharex=True)

ax1.plot(t, x_vals, 'b-', linewidth=2)
ax1.axhline(0, color='brown', linewidth=1)
ax1.axvline(t_peak, color='gray', linestyle='--', alpha=0.5)
ax1.plot(t_peak, x_peak, 'go', markersize=10, label=f'Peak: slope=0 at t={t_peak:.2f}s')
ax1.set_ylabel('x [m]');  ax1.set_title('x–t graph (slope = velocity)')
ax1.legend();  ax1.grid(True, alpha=0.3)

# Mark slope at t=1s
t1 = 1.0
slope_at_t1 = v0 - g*t1
t_range = np.array([t1-0.3, t1+0.3])
ax1.plot(t_range, x0 + v0*t_range - 0.5*g*t_range**2, 'r-', linewidth=0)
# Draw tangent line
x_at_t1 = x0 + v0*t1 - 0.5*g*t1**2
ax1.plot(t_range, x_at_t1 + slope_at_t1*(t_range - t1), 'r-', linewidth=2,
         label=f'Tangent at t=1: slope={slope_at_t1:.1f} m/s')
ax1.legend(fontsize=8)

ax2.plot(t, v_vals, 'g-', linewidth=2)
ax2.axhline(0, color='brown', linewidth=1.5)
ax2.axvline(t_peak, color='gray', linestyle='--', alpha=0.5)
ax2.plot(t_peak, 0, 'go', markersize=10, label='v=0 at peak (x-t zero slope)')
ax2.plot(1.0, v0 - g*1.0, 'rs', markersize=10, label=f'v(1)={v0-g*1.0:.1f} m/s = tangent slope above')
ax2.set_xlabel('t [s]');  ax2.set_ylabel('v [m/s]')
ax2.set_title('v–t graph (slope = acceleration, area = displacement)')
ax2.legend(fontsize=8);  ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.show()

print(f"At t=1s: tangent slope on x-t = {slope_at_t1:.1f} m/s = v(1) on v-t  ✓")
print(f"At t={t_peak:.2f}s: x-t slope = 0 and v-t crosses zero  ✓")`,
        },
        {
          cellTitle: 'Area Under v–t Curve = Displacement',
          type: 'code',
          language: 'python',
          prose: [
            `The area under a v–t curve gives displacement. We verify this numerically by summing tiny rectangles (Riemann sum) and comparing to the exact formula.`,
          ],
          code: `import numpy as np
import matplotlib.pyplot as plt

g = 9.8
v0 = 20.0

def v(t):
    return v0 - g*t

def x_exact(t, x0=0):
    return x0 + v0*t - 0.5*g*t**2

T = 4.0
t_range = np.linspace(0, T, 400)
v_range = v(t_range)

fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(t_range, v_range, 'g-', linewidth=2.5, label='v(t) = v₀ − gt')
ax.axhline(0, color='black', linewidth=1)
ax.fill_between(t_range, 0, v_range, where=(v_range >= 0),
                alpha=0.3, color='blue', label='+ area → + displacement')
ax.fill_between(t_range, 0, v_range, where=(v_range < 0),
                alpha=0.3, color='red', label='− area → − displacement')
ax.set_xlabel('t [s]');  ax.set_ylabel('v [m/s]')
ax.set_title('Area under v–t = displacement (blue+, red−)')
ax.legend();  ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()

# Numerical verification
dt = 0.001
t_vals = np.arange(0, T, dt)
area_total = np.sum(v(t_vals) * dt)   # signed area
area_pos   = np.sum(np.maximum(v(t_vals), 0) * dt)
area_neg   = np.sum(np.minimum(v(t_vals), 0) * dt)

x_formula = x_exact(T)

print(f"Numerical signed area (t=0 to {T}s): {area_total:.4f} m")
print(f"Exact displacement x({T}): {x_formula:.4f} m")
print(f"Match: {'✓' if abs(area_total - x_formula) < 0.01 else '✗'}")
print(f"\\nPositive area: {area_pos:.2f} m  (forward trip)")
print(f"Negative area: {area_neg:.2f} m  (return trip)")
print(f"Net (signed): {area_pos+area_neg:.2f} m")`,
        },
        {
          cellTitle: 'Reading Motion from a Mystery Graph',
          type: 'code',
          language: 'python',
          prose: [
            `Given only a table of (t, x) data points, reconstruct the motion story: find when velocity is zero (turning point), whether acceleration is positive or negative, and estimate the velocity at each point.`,
          ],
          code: `import numpy as np
import matplotlib.pyplot as plt

# Mystery motion data
t_data = np.array([0, 1, 2, 3, 4, 5, 6])
x_data = np.array([0, 8, 12, 12, 8, 0, -12])

# Estimate instantaneous velocity using symmetric differences
v_est = np.gradient(x_data, t_data)   # numpy's central-difference approximation

# Estimate acceleration
a_est = np.gradient(v_est, t_data)

fig, axes = plt.subplots(3, 1, figsize=(10, 9), sharex=True)

axes[0].plot(t_data, x_data, 'bo-', markersize=8, linewidth=2)
axes[0].set_ylabel('x [m]');  axes[0].set_title('x–t graph (mystery motion)')
axes[0].grid(True, alpha=0.3)

axes[1].plot(t_data, v_est, 'gs-', markersize=8, linewidth=2)
axes[1].axhline(0, color='black', linewidth=1)
axes[1].set_ylabel('v [m/s]');  axes[1].set_title('v–t graph (slope of x–t)')
axes[1].grid(True, alpha=0.3)

axes[2].plot(t_data, a_est, 'rd-', markersize=8, linewidth=2)
axes[2].axhline(0, color='black', linewidth=1)
axes[2].set_xlabel('t [s]');  axes[2].set_ylabel('a [m/s²]')
axes[2].set_title('a–t graph (slope of v–t)')
axes[2].grid(True, alpha=0.3)

plt.suptitle('Reading the full motion story from x–t data', fontsize=12)
plt.tight_layout()
plt.show()

print("Motion analysis:")
for i, t in enumerate(t_data):
    sign_v = '+' if v_est[i] > 0.01 else ('-' if v_est[i] < -0.01 else '0')
    print(f"  t={t}s: x={x_data[i]:>5} m,  v≈{v_est[i]:>6.1f} m/s ({sign_v}),  a≈{a_est[i]:>6.1f} m/s²")`,
        },
        {
          cellTitle: 'Challenge — Compute Displacement from a v–t Table',
          type: 'code',
          language: 'python',
          code: `# Challenge: compute displacement from v–t data using the trapezoid rule
# ─────────────────────────────────────────────────────────
import numpy as np

# v–t data
t_data = np.array([0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0])
v_data = np.array([0, 4.9, 9.8, 14.7, 19.6, 14.7, 9.8, 4.9, 0])
# (this is a symmetric profile: accelerates then decelerates back to zero)

# Task 1: Compute displacement using the trapezoid rule manually.
# For each adjacent pair (t_i, t_{i+1}):
#   displacement_i = 0.5 * (v_i + v_{i+1}) * (t_{i+1} - t_i)
# Sum all displacement_i. Store total in displacement_trap.

displacement_trap = 0.0
for i in range(len(t_data) - 1):
    # YOUR CODE: add one trapezoid contribution per loop iteration
    pass

# Task 2: Use numpy's np.trapz() function to verify.
displacement_numpy = # YOUR CODE HERE: np.trapz(...)

# Task 3: What is the average velocity over the 4 s interval?
avg_v = # YOUR CODE HERE

print(f"Trapezoid rule:  Δx = {displacement_trap:.2f} m")
print(f"np.trapz:        Δx = {displacement_numpy:.2f} m")
print(f"Average velocity: {avg_v:.2f} m/s")`,
          prose: [],
        },
      ],
    },
    matlab: {
      type: 'matlab',
      cells: [
        {
          cellTitle: 'Graph Reading in MATLAB — Slope and Area',
          type: 'code',
          language: 'matlab',
          prose: [
            `MATLAB's \`diff()\` gives finite differences for numerical slopes (velocities from positions). \`trapz()\` gives the trapezoidal area (displacement from velocities). These two functions implement the core graphical relationships.`,
          ],
          code: `%% Slope of x–t gives v, area under v–t gives Δx
g = 9.8;
v0 = 15;
t = linspace(0, 3.06, 200);
x_vals = v0.*t - 0.5.*g.*t.^2;

% Numerical slope → velocity estimate
dt_step = t(2) - t(1);
v_numerical = diff(x_vals) ./ dt_step;
t_mid = (t(1:end-1) + t(2:end)) / 2;   % midpoints

figure;
subplot(2,1,1);
plot(t, x_vals, 'b-', 'LineWidth', 2);
xlabel('t [s]');  ylabel('x [m]');
title('x–t graph: parabola (constant a)');  grid on;

subplot(2,1,2);
plot(t_mid, v_numerical, 'g-', 'LineWidth', 2, 'DisplayName', 'diff(x)/dt');
hold on;
plot(t, v0 - g.*t, 'r--', 'LineWidth', 1.5, 'DisplayName', 'Exact v(t)');
axhline_at_zero = yline(0, 'k-');
xlabel('t [s]');  ylabel('v [m/s]');
title('v–t: slope of x–t (matches exact v = v₀–gt)');
legend;  grid on;

%% Area under v–t curve
t_full = linspace(0, 3.06, 1000);
v_full = v0 - g.*t_full;
area_pos = trapz(t_full(v_full>=0), v_full(v_full>=0));
area_neg = trapz(t_full(v_full<0),  v_full(v_full<0));
net_disp = trapz(t_full, v_full);

fprintf('Positive area (up trip):   %.2f m\\n', area_pos);
fprintf('Negative area (down trip): %.2f m\\n', area_neg);
fprintf('Net displacement:          %.2f m\\n', net_disp);
fprintf('Exact net displacement (x(tf)-x(0)): %.2f m\\n', ...
        v0*3.06 - 0.5*g*3.06^2 - 0);`,
        },
        {
          cellTitle: 'Trapezoid Rule — Displacement from v–t Data',
          type: 'code',
          language: 'matlab',
          prose: [
            `The trapezoid rule approximates the area under any curve. MATLAB's \`trapz()\` automates this, but it is instructive to code it manually to see how each trapezoidal strip contributes.`,
          ],
          code: `%% Trapezoid rule: displacement from tabular v–t data
t_data = [0, 1, 2, 3, 4, 5, 6, 7]';
v_data = [0, 5, 12, 21, 32, 21, 12, 5]';   % m/s

% Manual trapezoid
n = length(t_data) - 1;
delta_x = zeros(n, 1);
for i = 1:n
    delta_x(i) = 0.5 * (v_data(i) + v_data(i+1)) * (t_data(i+1) - t_data(i));
end
total_disp_manual = sum(delta_x);

% MATLAB built-in
total_disp_trapz = trapz(t_data, v_data);

fprintf('Manual trapezoid sum: %.2f m\\n', total_disp_manual);
fprintf('MATLAB trapz():       %.2f m\\n', total_disp_trapz);

% Plot v-t with shaded area
figure;
area(t_data, v_data, 'FaceColor', [0.4 0.7 1.0], 'FaceAlpha', 0.4);
hold on;
plot(t_data, v_data, 'b-o', 'LineWidth', 2, 'MarkerSize', 8);
xlabel('t [s]');  ylabel('v [m/s]');
title(sprintf('Displacement = area under v–t = %.2f m', total_disp_trapz));
grid on;`,
        },
        {
          cellTitle: 'Challenge — Identify Motion Phases from a v–t Graph',
          type: 'code',
          language: 'matlab',
          code: `%% Challenge: analyze a multi-phase v–t profile
% ─────────────────────────────────────────────────────────
% A car's velocity data (in m/s) sampled every 2 seconds:
t_data = [0,  2,  4,  6,  8, 10, 12, 14, 16]';
v_data = [0, 10, 20, 20, 20, 15, 10,  5,  0]';

% Task 1: Plot the v–t graph (v vs t).

% Task 2: Identify the three motion phases by inspecting the slope:
%   Phase A: t = 0 to ? s  (what is happening?)
%   Phase B: t = ? to ? s  (what is happening?)
%   Phase C: t = ? to 16 s (what is happening?)

% Task 3: Compute the displacement for each phase using trapz().
% Store in disp_A, disp_B, disp_C and total_disp.

% YOUR ANALYSIS HERE
% Hint: Phase A ends where v stops increasing. Phase B is constant v.
%       Phase C is where v decreases.

figure;
area(t_data, v_data, 'FaceColor', [0.5 0.8 0.5], 'FaceAlpha', 0.4);
hold on;
plot(t_data, v_data, 'g-o', 'LineWidth', 2, 'MarkerSize', 8);
xlabel('t [s]');  ylabel('v [m/s]');
title('Multi-phase motion — identify phases and compute displacement');
grid on;

% YOUR CODE: compute disp_A, disp_B, disp_C, total_disp
% disp_A = trapz(...)
% disp_B = ...
% disp_C = ...
% total_disp = disp_A + disp_B + disp_C;

% fprintf('Phase A: %.1f m\\n', disp_A);
% fprintf('Phase B: %.1f m\\n', disp_B);
% fprintf('Phase C: %.1f m\\n', disp_C);
% fprintf('Total:   %.1f m\\n', total_disp);`,
          prose: [],
        },
      ],
    },
  },

  misconceptions: [
    {
      id: 'p0-005-misc1',
      misconception: `"High position on an x–t graph means high velocity."`,
      reality: `Velocity is the SLOPE of the x–t graph, not the height. An object at x = 100 m with a horizontal (flat) graph has zero velocity — it is at rest up high. An object at x = 0 with a steep slope is moving fast. Height tells you where the object is; slope tells you how fast it is moving.`,
      whyItHappens: `Students intuitively read height as "more" and confuse "more position" with "more velocity." The cure is to always ask: "what is the slope here?" before reading any quantity from a graph.`,
    },
    {
      id: 'p0-005-misc2',
      misconception: `"Area under a graph always means something — even on an x–t graph."`,
      reality: `Area under a v–t graph = displacement. But area under an x–t graph has no standard physical meaning in kinematics. Only specific combinations of axes produce meaningful areas. On the x–t graph, the relevant operation is slope (derivative), not area. On the v–t graph, area gives displacement and slope gives acceleration.`,
      whyItHappens: `Students over-generalise the "area = physical quantity" idea from v–t graphs to all graphs.`,
    },
    {
      id: 'p0-005-misc3',
      misconception: `"When v–t crosses zero, the object has stopped permanently."`,
      reality: `v = 0 at a single instant means the object is momentarily at rest — it is reversing direction. Before that instant, it was moving one way; after, it moves the other. "Stopped permanently" would show v = 0 for a whole interval (a flat section of the v–t graph at v=0), not just a crossing.`,
      whyItHappens: `Students think "stopped = v = 0" and don't consider whether v is passing through zero or resting at zero.`,
    },
  ],

  transferPrompts: [
    {
      id: 'p0-005-tp1',
      prompt: `An ECG (electrocardiogram) plots electrical voltage V(t) across the heart over time. (a) What does a steep region of the V–t graph represent? (b) What does a flat region represent? (c) If you could compute the area under the V–t curve, would that have a physical meaning in this context? Why or why not?`,
      targetConcept: 'Generalising slope = rate of change to non-kinematic graphs',
      hint: `The slope of any y–t graph gives the rate of change of y. The area only has a standard meaning when the specific axes are paired correctly (v–t for displacement, power–time for energy, etc.).`,
    },
    {
      id: 'p0-005-tp2',
      prompt: `A company's sales revenue is plotted as R(t) over 12 months. The graph rises steeply in months 1–3, levels off from months 4–8, then falls sharply in months 9–12. (a) Describe the rate of change of revenue in each phase. (b) During which phase is revenue growing fastest? (c) If revenue is negative in months 9–12, what does the area below the axis represent?`,
      targetConcept: 'Graph reading skills transfer to rate-of-change reasoning in any domain',
      hint: `"Rate of change of revenue" = slope. Fastest growth = steepest positive slope.`,
    },
  ],

  debugging: [
    {
      id: 'p0-005-dbg1',
      title: 'Reading height instead of slope from x–t',
      scenario: `A student is shown an x–t parabola that reaches x = 50 m at t = 2 s. The student says "velocity at t=2 is 50/2 = 25 m/s."`,
      error: `The student divided position by time — that gives average velocity from t=0, not instantaneous velocity at t=2. Instantaneous velocity at t=2 is the slope of the tangent at that point, not the height divided by time.`,
      fix: `Draw the tangent line at t=2. Its slope = Δx/Δt as Δt→0 = dx/dt at t=2. For x = ½gt²: v(2) = g×2 = 19.6 m/s — not 25 m/s.`,
      prevention: `Never divide coordinates. Always identify whether you need slope (velocity) or area (displacement) before reading anything from a graph.`,
    },
    {
      id: 'p0-005-dbg2',
      title: 'Adding areas with different signs',
      scenario: `A v–t graph shows v = +5 m/s for 3 s, then v = −3 m/s for 2 s. A student computes total displacement as (5×3) + (3×2) = 15 + 6 = 21 m.`,
      error: `The student added both areas as positive. The second phase (v < 0) contributes negative displacement. The signed area below the t-axis is −6 m, not +6 m.`,
      fix: `Δx = +15 m + (−6 m) = +9 m. The object ended up 9 m ahead, not 21 m. Distance traveled = 15 + 6 = 21 m (always positive). Displacement = +9 m (signed).`,
      prevention: `Always shade areas below the axis differently and assign them negative signs. Check: does the object return toward start? Then some displacement is negative.`,
    },
  ],

  mastery: {
    targetLevel: `You can extract velocity from slope, acceleration from the slope of v–t, and displacement from the area under v–t — all by eye from a graph, without solving equations. You can also construct the x–t or v–t graph from a motion description.`,
    checklistItems: [
      `Read instantaneous velocity from the slope of an x–t graph at any point`,
      `Read instantaneous acceleration from the slope of a v–t graph`,
      `Compute displacement from the area under a v–t graph (rectangles, triangles, trapezoids)`,
      `Identify turning points (v = 0 crossing), periods of rest (flat v–t), and direction reversals`,
      `Recognise the "constant acceleration signature": a–t flat, v–t straight, x–t parabola`,
      `Assign correct sign to areas above and below the v–t axis`,
    ],
    commonStruggles: [
      `Confusing height with slope on x–t — always ask "what is the slope?" not "how high is it?"`,
      `Treating v = 0 as permanent stop rather than instantaneous crossing`,
      `Adding all areas as positive — areas below the t-axis are negative displacement`,
      `Confusing which operation applies to which graph type (area works on v–t; slope works on x–t)`,
    ],
    nextSteps: [
      `Lesson 6 (Vectors vs Scalars): velocity has direction — the sign on graphs is a 1D vector`,
      `Chapter 2 (Kinematics): formal graph analysis, including non-constant acceleration curves`,
      `Chapter 1 (Calculus Tools): integration makes the area-under-curve idea exact`,
    ],
  },

  quiz: [
    {
      id: 'graphs-q1',
      type: 'choice',
      text: 'An x–t graph is a straight line with positive slope. This means:',
      options: [
        'The object is accelerating',
        'The object has constant positive velocity',
        'The object is at rest',
        'The object is decelerating',
      ],
      answer: 'The object has constant positive velocity',
      hints: ['Straight x–t line = constant slope = constant velocity = zero acceleration.'],
      reviewSection: 'Intuition — graph shapes',
    },
    {
      id: 'graphs-q2',
      type: 'input',
      text: 'A v–t graph shows v rising from 0 to 30 m/s over 6 s. What is the displacement (in meters)? (Triangle area.)',
      answer: '90',
      hints: ['Triangle: ½ × base × height = ½ × 6 × 30 = 90 m.'],
      reviewSection: 'Math — displacement from v–t',
    },
    {
      id: 'graphs-q3',
      type: 'choice',
      text: 'On a v–t graph, where the curve crosses zero (v = 0), what is happening physically?',
      options: [
        'The object is at its starting position',
        'The object is momentarily at rest and reversing direction',
        'The acceleration is zero',
        'The object has reached maximum velocity',
      ],
      answer: 'The object is momentarily at rest and reversing direction',
      hints: ['v = 0 means the object stopped for an instant. Before: moving one way. After: moving the other.'],
      reviewSection: 'Intuition — reading motion stories from graphs',
    },
    {
      id: 'graphs-q4',
      type: 'choice',
      text: 'What is the slope of a v–t graph equal to?',
      options: ['velocity', 'acceleration', 'displacement', 'position'],
      answer: 'acceleration',
      hints: ['Slope of v–t = Δv/Δt = acceleration. Just as slope of x–t = Δx/Δt = velocity.'],
      reviewSection: 'Intuition — the two fundamental graph relationships',
    },
    {
      id: 'graphs-q5',
      type: 'input',
      text: 'A v–t graph shows v = 10 m/s for 3 s, then drops linearly to 0 over 2 s more. Total displacement?',
      answer: '40',
      hints: [
        'Phase 1: rectangle = 10 × 3 = 30 m.',
        'Phase 2: triangle = ½ × 2 × 10 = 10 m.',
        'Total = 30 + 10 = 40 m.',
      ],
      reviewSection: 'Examples — two-phase motion',
    },
    {
      id: 'graphs-q6',
      type: 'choice',
      text: 'An x–t graph that curves upward (concave up) indicates:',
      options: [
        'Constant velocity',
        'Decreasing velocity',
        'Positive acceleration (velocity increasing)',
        'Negative acceleration',
      ],
      answer: 'Positive acceleration (velocity increasing)',
      hints: ['Concave up = slope is increasing = velocity is increasing = positive acceleration.'],
      reviewSection: 'Rigor — concavity and the second derivative',
    },
    {
      id: 'graphs-q7',
      type: 'choice',
      text: 'The AREA under a v–t graph represents:',
      options: ['acceleration', 'velocity', 'displacement', 'time'],
      answer: 'displacement',
      hints: ['v × Δt = displacement. Summing all v × Δt = total area = total displacement.'],
      reviewSection: 'Math — displacement from area',
    },
    {
      id: 'graphs-q8',
      type: 'choice',
      text: 'Which of these is the "constant acceleration signature" on an x–t graph?',
      options: [
        'Straight line with positive slope',
        'Parabola (quadratic curve)',
        'Horizontal line',
        'Straight line with negative slope',
      ],
      answer: 'Parabola (quadratic curve)',
      hints: ['x = v₀t + ½at² is a quadratic — a parabola. The t² term creates the curvature.'],
      reviewSection: 'Math — constant-acceleration case on graphs',
    },
  ],

  formulas: [
    {
      id: 'p0-005-f1',
      latex: 'v(t) = \\frac{dx}{dt}',
      description: 'Instantaneous velocity equals the slope (derivative) of the position–time graph at any point.',
      variables: {
        'v(t)': 'instantaneous velocity at time t (m/s)',
        'dx': 'infinitesimal change in position (m)',
        'dt': 'infinitesimal change in time (s)',
      },
    },
    {
      id: 'p0-005-f2',
      latex: 'a(t) = \\frac{dv}{dt}',
      description: 'Instantaneous acceleration equals the slope (derivative) of the velocity–time graph at any point.',
      variables: {
        'a(t)': 'instantaneous acceleration at time t (m/s²)',
        'dv': 'infinitesimal change in velocity (m/s)',
        'dt': 'infinitesimal change in time (s)',
      },
    },
    {
      id: 'p0-005-f3',
      latex: '\\Delta x = \\int_{t_1}^{t_2} v(t)\\,dt',
      description: 'Displacement equals the signed area under the velocity–time graph — above the axis is positive displacement, below is negative.',
      variables: {
        '\\Delta x': 'displacement from t₁ to t₂ (m)',
        'v(t)': 'velocity as a function of time (m/s)',
        't_1,\\,t_2': 'start and end times (s)',
      },
    },
    {
      id: 'p0-005-f4',
      latex: '\\Delta x = \\tfrac{1}{2}(v_i + v_f)\\,\\Delta t',
      description: 'Trapezoid area formula — displacement under a straight-line v–t segment (constant acceleration). Reduces to rectangle (v_i = v_f) or triangle (v_i = 0).',
      variables: {
        'v_i': 'velocity at start of interval (m/s)',
        'v_f': 'velocity at end of interval (m/s)',
        '\\Delta t': 'duration of interval (s)',
      },
    },
    {
      id: 'p0-005-f5',
      latex: 'x(t) = x_0 + \\int_0^t v(\\tau)\\,d\\tau',
      description: 'Position at time t equals initial position plus the accumulated area under the v–t curve from 0 to t. Fundamental Theorem of Calculus applied to kinematics.',
      variables: {
        'x_0': 'initial position at t = 0 (m)',
        'v(\\tau)': 'velocity at intermediate time τ (m/s)',
        't': 'current time (s)',
      },
    },
  ],
}
