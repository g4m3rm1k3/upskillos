export default {
  id: 'precalc5-004',
  slug: 'vectors-dot-product',
  chapter: 'precalc-5',
  order: 4,
  title: 'The Dot Product: Measuring How Much Two Vectors Agree',
  subtitle: 'The dot product answers one question: how much of $\\vec{u}$ points in the direction of $\\vec{v}$? The answer is a single number — and it encodes the angle, projection, and work all at once.',
  tags: ['dot product', 'scalar product', 'angle between vectors', 'orthogonal', 'projection', 'vector projection', 'scalar projection', 'work', 'cosine similarity'],
  aliases: 'dot product scalar product inner product angle between vectors orthogonal perpendicular projection work component cosine similarity',

  hook: {
    question: 'You push a lawnmower with 60 N of force at 30° below horizontal. How much of that force actually moves the mower forward? You cannot just use 60 N — direction matters. The dot product extracts exactly the part of one vector that acts along another.',
    realWorldContext: 'Work in physics is $W = \\vec{F} \\cdot \\vec{d}$ — only the component of force in the direction of motion counts. In machine learning, how similar are two documents? Cosine similarity is a dot product. In 3D graphics, how bright is a surface? Lambert\'s law is a dot product between the light direction and the surface normal. In navigation, how efficiently is your velocity taking you toward your destination? Dot product. One formula, everywhere.',
    previewVisualizationId: 'DotProductViz',
  },

  intuition: {
    prose: [
      '**Where you are in the story:** You know how to add vectors and scale them. Now comes the first truly new operation: a way to multiply two vectors and get a number. That number tells you something no other operation can — how much two vectors agree in direction.',
      'Imagine two arrows pinned at the same point. The dot product is a measure of how much they point in the same direction. If they point exactly the same way, the dot product is large and positive. If they are perpendicular, it is zero — they share no direction at all. If they point opposite ways, it is negative.',
      'There is a physical way to see this. Drop a perpendicular from the tip of $\\vec{u}$ onto the line of $\\vec{v}$. The length of the shadow that $\\vec{u}$ casts on $\\vec{v}$ is the scalar projection. The dot product is that shadow length times $|\\vec{v}|$. When the shadow is long (vectors nearly parallel), the dot product is large. When the shadow is zero (vectors perpendicular), the dot product is zero.',
      'This shadow interpretation is not a metaphor — it is the definition. Formally: $\\vec{u} \\cdot \\vec{v} = |\\vec{u}||\\vec{v}|\\cos\\theta$, where $\\theta$ is the angle between them. The $\\cos\\theta$ captures exactly how much of $\\vec{u}$\'s length is acting along $\\vec{v}$\'s direction.',
      'You already know work intuitively: pushing a box across the floor does work; holding it still does not. Lifting it vertically while walking horizontally — the lift does no work on the horizontal motion. Why? Because the lift force is perpendicular to the direction of travel. This is the dot product. $W = \\vec{F} \\cdot \\vec{d} = |\\vec{F}||\\vec{d}|\\cos\\theta$. When $\\theta = 0°$: full force does work. When $\\theta = 90°$: zero work. When $\\theta = 180°$ (friction opposes motion): negative work. The formula $W = Fd\\cos\\theta$ in physics textbooks is exactly $\\vec{F}\\cdot\\vec{d}$.',
      '**Where this is heading:** The dot product is the inner product of Euclidean space. In polar coordinates (next lesson), angles describe direction just as they do here. In calculus, the directional derivative $D_{\\hat{u}}f = \\nabla f \\cdot \\hat{u}$ is a dot product: it measures how fast $f$ changes in the direction $\\hat{u}$.',
    ],
    callouts: [
      {
        type: 'sequencing',
        title: 'Precalc-5 arc — Lesson 2 of 4',
        body: '← 2D Vectors | **Dot Product & Applications** | Polar Coordinates →',
      },
      {
        type: 'insight',
        title: 'Before any formula: the shadow test',
        body: '\\text{Point the two vectors from the same origin.} \\\\ \\text{Drop a perpendicular from the tip of } \\vec{u} \\text{ onto } \\vec{v}. \\\\ \\text{The shadow is positive (same side as } \\vec{v}\\text{): dot product} > 0 \\\\ \\text{No shadow (perpendicular): dot product} = 0 \\\\ \\text{Shadow on opposite side: dot product} < 0',
      },
      {
        type: 'definition',
        title: 'The dot product — two equivalent forms',
        body: '\\vec{u} \\cdot \\vec{v} = |\\vec{u}||\\vec{v}|\\cos\\theta \\quad \\text{(angle form — geometric meaning)} \\\\ \\vec{u} \\cdot \\vec{v} = u_1 v_1 + u_2 v_2 \\quad \\text{(component form — easy to compute)} \\\\ \\text{The proof that these are equal is in the Rigor section.}',
      },
      {
        type: 'warning',
        title: 'The dot product is NOT a vector',
        body: '\\vec{u} \\cdot \\vec{v} \\in \\mathbb{R} \\quad \\text{(a number, not an arrow)} \\\\ \\text{Adding a dot product to a vector is meaningless: } \\vec{u} + (\\vec{u}\\cdot\\vec{v}) \\text{ makes no sense.} \\\\ \\text{This trips up students constantly — the result has no direction.}',
      },
      {
        type: 'insight',
        title: 'Why holding a suitcase does zero work',
        body: '\\text{Force: upward (to counteract gravity). Displacement: horizontal (walking).} \\\\ \\theta = 90° \\Rightarrow \\cos 90° = 0 \\Rightarrow W = |\\vec{F}||\\vec{d}| \\cdot 0 = 0 \\\\ \\text{Perpendicular force and displacement: zero dot product, zero work.} \\\\ \\text{Your arms get tired, but physically no work is done on the suitcase horizontally.}',
      },
      {
        type: 'insight',
        title: 'The lawnmower — connecting back to the hook',
        body: 'F = 60 \\text{ N at } 30° \\text{ below horizontal.} \\quad d = \\text{horizontal.} \\\\ W = 60 \\cdot d \\cdot \\cos(30°) = 60 \\cdot d \\cdot \\frac{\\sqrt{3}}{2} \\approx 51.96 d \\text{ J} \\\\ \\text{Only 51.96 N of the 60 N actually moves the mower forward.} \\\\ \\text{The remaining 8 N pushes into the ground — perpendicular to motion.}',
      },
    ],
    visualizations: [
      {
        id: 'DotProductViz',
        title: 'Drag Two Vectors — Watch the Shadow',
        mathBridge: '1. Drag both vectors and observe the dot product updating live. 2. Rotate one vector toward the other — the dot product grows. 3. Make them perpendicular — the dot product hits zero and the shadow vanishes. 4. Continue rotating past 90° — the dot product goes negative. 5. Switch to projection mode to see the shadow arrow explicitly. The key lesson: the sign of the dot product tells you the angle relationship without any computation — positive means acute, zero means perpendicular, negative means obtuse.',
        caption: 'When vectors are perpendicular, the shadow vanishes and the dot product becomes zero — no computation needed.',
      },
    ],
  },

  rigor: {
    title: 'Proving $u_1v_1 + u_2v_2 = |\\vec{u}||\\vec{v}|\\cos\\theta$',
    proofSteps: [
      {
        expression: '\\text{Place } \\vec{u} \\text{ and } \\vec{v} \\text{ tail-to-tail at the origin.}',
        annotation: 'The three vectors $\\vec{u}$, $\\vec{v}$, and $\\vec{u}-\\vec{v}$ form a triangle. $\\theta$ is the angle at the origin. The Law of Cosines relates all three sides to this angle — which is exactly what we want.',
      },
      {
        expression: '|\\vec{u}-\\vec{v}|^2 = |\\vec{u}|^2 + |\\vec{v}|^2 - 2|\\vec{u}||\\vec{v}|\\cos\\theta',
        annotation: 'Apply Law of Cosines to the triangle. The side opposite $\\theta$ has length $|\\vec{u}-\\vec{v}|$. Law of Cosines is just a generalisation of the Pythagorean theorem.',
      },
      {
        expression: '|\\vec{u}-\\vec{v}|^2 = (u_1-v_1)^2+(u_2-v_2)^2 = u_1^2-2u_1v_1+v_1^2+u_2^2-2u_2v_2+v_2^2',
        annotation: 'Expand the left side using the magnitude formula. Pure algebra.',
      },
      {
        expression: '= (u_1^2+u_2^2) + (v_1^2+v_2^2) - 2(u_1v_1+u_2v_2) = |\\vec{u}|^2 + |\\vec{v}|^2 - 2(u_1v_1+u_2v_2)',
        annotation: 'Regroup. Recognise $u_1^2+u_2^2 = |\\vec{u}|^2$ and $v_1^2+v_2^2 = |\\vec{v}|^2$. The group $u_1v_1+u_2v_2$ is what the component formula computes — it is about to be identified as $|\\vec{u}||\\vec{v}|\\cos\\theta$.',
      },
      {
        expression: '|\\vec{u}|^2 + |\\vec{v}|^2 - 2(u_1v_1+u_2v_2) = |\\vec{u}|^2 + |\\vec{v}|^2 - 2|\\vec{u}||\\vec{v}|\\cos\\theta',
        annotation: 'Both sides equal $|\\vec{u}-\\vec{v}|^2$. Set them equal.',
      },
      {
        expression: '\\therefore u_1v_1+u_2v_2 = |\\vec{u}||\\vec{v}|\\cos\\theta \\qquad \\blacksquare',
        annotation: 'Cancel the common terms $|\\vec{u}|^2 + |\\vec{v}|^2$. The two formulas are provably equal — connected by the Law of Cosines and the Pythagorean theorem. Neither is more fundamental; they are the same geometric fact in two languages.',
      },
    ],
  },

  math: {
    prose: [
      'The projection formula is where most students lose the thread. Here is every step annotated so no symbol is floating free.',
      'We want the vector projection of $\\vec{u}$ onto $\\vec{v}$: the arrow in the direction of $\\vec{v}$ that has the same shadow as $\\vec{u}$. Start from the shadow length (scalar projection), then multiply by the unit vector in the direction of $\\vec{v}$ to get the arrow.',
      'Step 1 — Scalar projection (the shadow length): $|\\vec{u}|\\cos\\theta$. This is just geometry: the length of the shadow $\\vec{u}$ casts on $\\vec{v}$ is $|\\vec{u}|$ times $\\cos\\theta$ (adjacent over hypotenuse in the right triangle).',
      'Step 2 — Replace $\\cos\\theta$: $= |\\vec{u}| \\cdot \\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{u}||\\vec{v}|}$. Rearranging $\\vec{u}\\cdot\\vec{v} = |\\vec{u}||\\vec{v}|\\cos\\theta$ gives $\\cos\\theta = \\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{u}||\\vec{v}|}$.',
      'Step 3 — Cancel $|\\vec{u}|$: the scalar projection simplifies to $\\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|}$. Just the dot product divided by the length of $\\vec{v}$.',
      'Step 4 — Vector projection: multiply the scalar projection by $\\hat{v} = \\vec{v}/|\\vec{v}|$ to turn the length into an arrow pointing in the direction of $\\vec{v}$. Result: $\\text{proj}_{\\vec{v}}\\vec{u} = \\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|^2}\\vec{v}$.',
      'Summary: the formula $\\text{proj}_{\\vec{v}}\\vec{u} = \\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|^2}\\vec{v}$ is not magic — it is shadow length (dot product / $|\\vec{v}|$) times the unit vector of $\\vec{v}$ (= $\\vec{v}/|\\vec{v}|$), combined into one expression.',
    ],
    callouts: [
      {
        type: 'proof-map',
        title: 'Projection formulas — unpacked',
        body: '\\text{Scalar projection (a number): } \\text{comp}_{\\vec{v}}\\vec{u} = \\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|} \\\\ \\text{Vector projection (an arrow): } \\text{proj}_{\\vec{v}}\\vec{u} = \\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|^2}\\vec{v} \\\\ \\text{Perpendicular part: } \\vec{u}_{\\perp} = \\vec{u} - \\text{proj}_{\\vec{v}}\\vec{u}',
      },
      {
        type: 'warning',
        title: 'proj$_{\\vec{v}}\\vec{u}$ is NOT the same as proj$_{\\vec{u}}\\vec{v}$',
        body: '\\text{Order matters. } \\text{proj}_{\\vec{v}}\\vec{u} \\text{ is the shadow of } \\vec{u} \\text{ on } \\vec{v}. \\\\ \\text{proj}_{\\vec{u}}\\vec{v} \\text{ is the shadow of } \\vec{v} \\text{ on } \\vec{u}. \\\\ \\text{These have different lengths unless } |\\vec{u}|=|\\vec{v}|.',
      },
    ],
    visualizations: [
      {
        id: 'DotProductViz',
        title: 'Projection Mode — Shadow Made Explicit',
        mathBridge: '1. Switch to projection mode. 2. Drag $\\vec{u}$ — the yellow arrow (proj) updates immediately. 3. Look at the green dashed arrow ($\\vec{u}_{\\perp}$) — it always meets $\\vec{v}$ at a right angle. 4. Verify: drag so that $\\vec{u}$ is perpendicular to $\\vec{v}$ — the projection collapses to zero and $\\vec{u}_{\\perp} = \\vec{u}$. The key lesson: projection + perpendicular component always reconstructs the original vector exactly, confirming $\\vec{u} = \\text{proj}_{\\vec{v}}\\vec{u} + \\vec{u}_{\\perp}$.',
        caption: 'proj + perp = original vector. They always add back to $\\vec{u}$ exactly.',
      },
    ],
  },

  examples: [
    {
      id: 'ch5-004-ex1',
      title: 'Form 1: Basic dot product and what its sign means',
      problem: '\\vec{u} = \\langle 4, -1 \\rangle, \\; \\vec{v} = \\langle 2, 3 \\rangle. \\text{ Compute } \\vec{u}\\cdot\\vec{v} \\text{ and describe the angle.}',
      steps: [
        {
          expression: '\\vec{u}\\cdot\\vec{v} = (4)(2)+(-1)(3) = 8-3 = 5',
          annotation: 'Multiply matching components, add.',
          hint: 'Pair first components together and second components together: $(u_1)(v_1) + (u_2)(v_2)$.',
        },
        {
          expression: '\\text{Dot product} = 5 > 0 \\Rightarrow \\theta < 90° \\text{ (vectors lean toward each other)}',
          annotation: 'Positive → acute angle. No need to compute $\\theta$ to know this.',
          hint: 'The sign of the dot product immediately tells you whether the angle is acute (positive), right (zero), or obtuse (negative).',
        },
      ],
      conclusion: 'The dot product is 5, which is positive, so the angle is acute. Students often compute $(4)(-1) + (2)(3)$ instead — mixing up which components pair. Always pair position by position: first×first, second×second.',
    },
    {
      id: 'ch5-004-ex2',
      title: 'Form 2: Finding the angle',
      problem: '\\text{Find the angle between } \\vec{u}=\\langle 3,-1\\rangle \\text{ and } \\vec{v}=\\langle 2,4\\rangle.',
      steps: [
        {
          expression: '\\vec{u}\\cdot\\vec{v} = 6-4 = 2 \\qquad |\\vec{u}|=\\sqrt{10} \\qquad |\\vec{v}|=2\\sqrt{5}',
          annotation: 'Three separate computations. Do them one at a time.',
          hint: 'Compute the dot product, then each magnitude separately before combining.',
        },
        {
          expression: '\\cos\\theta = \\frac{2}{\\sqrt{10}\\cdot2\\sqrt{5}} = \\frac{2}{2\\sqrt{50}} = \\frac{1}{\\sqrt{50}}',
          annotation: 'Angle formula: divide dot product by product of magnitudes.',
          hint: 'Use $\\cos\\theta = \\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{u}||\\vec{v}|}$.',
        },
        {
          expression: '\\theta = \\arccos\\!\\left(\\frac{1}{\\sqrt{50}}\\right) \\approx 81.9°',
          annotation: 'arccos gives the angle. Range is always $[0°, 180°]$.',
          hint: 'arccos always returns a value in $[0°, 180°]$, which is the correct range for the angle between two vectors.',
        },
      ],
      conclusion: 'The angle between the two vectors is approximately 81.9°. arccos always returns angles in $[0°, 180°]$ — you will never get a negative angle or one over 180°.',
    },
    {
      id: 'ch5-004-ex3',
      title: 'Form 3: Testing for perpendicularity',
      problem: '\\text{Are } \\vec{u}=\\langle 3,-2\\rangle \\text{ and } \\vec{v}=\\langle 4,6\\rangle \\text{ perpendicular?}',
      steps: [
        {
          expression: '\\vec{u}\\cdot\\vec{v} = (3)(4)+(-2)(6) = 12-12 = 0',
          annotation: 'If the dot product is zero, the vectors are perpendicular.',
          hint: 'No arccos needed — a dot product of exactly zero is sufficient to conclude perpendicularity.',
        },
        {
          expression: '\\text{Yes, } \\vec{u} \\perp \\vec{v}.',
          annotation: 'Perpendicularity test: dot product = 0. The quickest check there is.',
          hint: 'This is the most efficient perpendicularity test — faster than computing the angle.',
        },
      ],
      conclusion: 'The vectors are perpendicular. In many problems (finding a normal vector, checking an answer), this dot product test is all you need.',
    },
    {
      id: 'ch5-004-ex4',
      title: 'Form 4: Vector projection onto a given direction',
      problem: '\\text{Find } \\text{proj}_{\\vec{v}}\\vec{u} \\text{ where } \\vec{u}=\\langle 4,3\\rangle \\text{ and } \\vec{v}=\\langle 2,1\\rangle.',
      steps: [
        {
          expression: '\\vec{u}\\cdot\\vec{v} = 8+3=11 \\qquad |\\vec{v}|^2 = 4+1=5',
          annotation: 'Two preliminary numbers. Use $|\\vec{v}|^2$, not $|\\vec{v}|$ — avoids a square root.',
          hint: 'Compute the dot product and $|\\vec{v}|^2 = v_1^2 + v_2^2$ as two separate steps before combining.',
        },
        {
          expression: '\\text{proj}_{\\vec{v}}\\vec{u} = \\frac{11}{5}\\langle 2,1\\rangle = \\langle\\tfrac{22}{5}, \\tfrac{11}{5}\\rangle',
          annotation: 'Scale $\\vec{v}$ by $\\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|^2}$. The result is a vector in the direction of $\\vec{v}$.',
          hint: 'The projection formula is $\\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|^2}\\vec{v}$ — multiply every component of $\\vec{v}$ by the scalar.',
        },
        {
          expression: '\\vec{u}_{\\perp} = \\vec{u} - \\text{proj}_{\\vec{v}}\\vec{u} = \\langle 4-\\tfrac{22}{5}, 3-\\tfrac{11}{5}\\rangle = \\langle -\\tfrac{2}{5}, \\tfrac{4}{5}\\rangle',
          annotation: 'Perpendicular part: subtract the projection from the original.',
          hint: 'Subtract the projection component by component.',
        },
        {
          expression: '\\text{Check: } \\vec{u}_{\\perp}\\cdot\\vec{v} = (-\\tfrac{2}{5})(2)+(\\tfrac{4}{5})(1) = 0 \\checkmark',
          annotation: 'Always verify: the perpendicular part should have zero dot product with $\\vec{v}$.',
          hint: 'Dot the perpendicular part with $\\vec{v}$ — it must be zero. If not, you made an arithmetic error.',
        },
      ],
      conclusion: 'The projection is $\\langle 22/5, 11/5\\rangle$. Use $|\\vec{v}|^2$ in the denominator, NOT $|\\vec{v}|$. Students often write $\\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|}$ which gives the scalar projection — a number, not the vector.',
    },
    {
      id: 'ch5-004-ex5',
      title: 'Form 5: Work done by a force',
      problem: '\\text{Force } \\vec{F}=\\langle 6,2\\rangle \\text{ N. Displacement } \\vec{d}=\\langle 4,0\\rangle \\text{ m. Find the work done.}',
      steps: [
        {
          expression: 'W = \\vec{F}\\cdot\\vec{d} = (6)(4)+(2)(0) = 24 \\text{ J}',
          annotation: 'Work is a dot product. One computation.',
          hint: 'Apply the component dot product formula directly.',
        },
        {
          expression: '\\text{The 2 N vertical component of force does zero work on horizontal motion.}',
          annotation: 'The $(2)(0)$ term confirms it — zero displacement in the vertical direction means the vertical force component contributes nothing.',
          hint: 'The $(2)(0)$ term is zero because the displacement has no vertical component.',
        },
      ],
      conclusion: 'The work done is 24 J. Work can be negative when force opposes motion ($\\theta > 90°$) — negative work means the force removes energy from the system, like friction or braking.',
    },
    {
      id: 'ch5-004-ex6',
      title: 'Form 6: Finding an unknown component to satisfy a dot product condition',
      problem: '\\text{Find } k \\text{ so that } \\langle k, 3\\rangle \\perp \\langle 2, k-1\\rangle.',
      steps: [
        {
          expression: '\\langle k,3\\rangle \\cdot \\langle 2,k-1\\rangle = 0 \\Rightarrow 2k + 3(k-1) = 0',
          annotation: 'Set up perpendicularity condition: dot product = 0.',
          hint: 'Perpendicular means dot product = 0. Write out the component formula and set it equal to zero.',
        },
        {
          expression: '2k + 3k - 3 = 0 \\Rightarrow 5k = 3 \\Rightarrow k = \\tfrac{3}{5}',
          annotation: 'Solve the linear equation.',
          hint: 'Expand, collect $k$ terms, and solve.',
        },
      ],
      conclusion: 'The value $k = 3/5$ makes the two vectors perpendicular. This type of problem appears often: "find the parameter so two vectors are perpendicular/parallel." Perpendicular → dot product = 0. Parallel → one is a scalar multiple of the other.',
    },
  ],

  challenges: [
    {
      id: 'ch5-004-ch1',
      difficulty: 'medium',
      problem: '\\text{Find all vectors } \\vec{v}=\\langle x,y\\rangle \\text{ perpendicular to } \\langle 3,-2\\rangle \\text{ with magnitude 5.}',
      hint: 'Two conditions: dot product = 0 gives one equation, magnitude = 5 gives another. Two equations, two unknowns — expect two solutions.',
      walkthrough: [
        {
          expression: '3x-2y=0 \\Rightarrow y = \\tfrac{3x}{2}',
          annotation: 'Perpendicularity condition.',
        },
        {
          expression: 'x^2+\\tfrac{9x^2}{4}=25 \\Rightarrow \\tfrac{13x^2}{4}=25 \\Rightarrow x=\\pm\\tfrac{10}{\\sqrt{13}}',
          annotation: 'Magnitude condition.',
        },
        {
          expression: '\\vec{v} = \\pm\\langle\\tfrac{10}{\\sqrt{13}}, \\tfrac{15}{\\sqrt{13}}\\rangle',
          annotation: 'Two answers — one pointing each perpendicular direction.',
        },
      ],
      answer: '\\vec{v} = \\pm\\left\\langle\\dfrac{10}{\\sqrt{13}}, \\dfrac{15}{\\sqrt{13}}\\right\\rangle',
    },
    {
      id: 'ch5-004-ch2',
      difficulty: 'hard',
      problem: '\\text{A sled is pulled by a rope at 25° above horizontal with 80 N force over 12 m. Find work done. What angle minimises rope tension for the same horizontal work?}',
      hint: 'Part 1: work = force dot displacement. Part 2: express horizontal work in terms of angle; for fixed $W$ and $d$, minimise $|F|$.',
      walkthrough: [
        {
          expression: 'W = 80\\cos25° \\cdot 12 \\approx 72.5 \\cdot 12 = 870 \\text{ J}',
          annotation: 'Displacement is horizontal so $\\vec{d} = \\langle 12, 0\\rangle$.',
        },
        {
          expression: '|F| = \\frac{W}{d\\cos\\theta} = \\frac{870}{12\\cos\\theta}',
          annotation: 'Express required force for target work 870 J.',
        },
        {
          expression: '\\text{Minimum when } \\cos\\theta = 1 \\Rightarrow \\theta = 0°. \\text{ Pull horizontally.}',
          annotation: 'Horizontal pull is most efficient — all force goes into work.',
        },
      ],
      answer: 'W \\approx 870 \\text{ J; minimum tension at } \\theta = 0°',
    },
  ],

  crossRefs: [
    { slug: 'vectors-2d', reason: 'Component form and magnitude are prerequisites — the dot product formula $u_1v_1+u_2v_2$ uses them directly.' },
    { slug: 'trig-ratios-right-triangles', reason: 'The scalar projection is the right-triangle relationship $|\\vec{u}|\\cos\\theta$ — SOH-CAH-TOA in vector language.' },
    { slug: 'solving-triangles', reason: 'The proof that component form equals angle form uses the Law of Cosines.' },
    { slug: 'polar-coordinates-deep', reason: 'Polar coordinates introduce $r$ and $\\theta$ — the same modulus and angle used in the dot product\'s angle form.' },
  ],

  checkpoints: [
    'Can you compute the dot product of two vectors in component form in one step?',
    'Can you determine whether two vectors are perpendicular without computing the angle?',
    'Can you find the angle between two vectors using the dot product formula?',
    'Can you find the vector projection of $\\vec{u}$ onto $\\vec{v}$ and verify it with a dot product check?',
    'Can you compute the work done by a force vector over a displacement vector?',
  ],

  semantics: {
    symbols: [
      { symbol: '\\vec{u} \\cdot \\vec{v}', meaning: 'Dot product of $\\vec{u}$ and $\\vec{v}$; equals $|\\vec{u}||\\vec{v}|\\cos\\theta = u_1v_1+u_2v_2$; always a scalar (number).' },
      { symbol: '\\theta', meaning: 'The angle between two vectors when placed tail-to-tail; always in $[0°, 180°]$.' },
      { symbol: '\\text{comp}_{\\vec{v}}\\vec{u}', meaning: 'Scalar projection: signed length of shadow of $\\vec{u}$ onto $\\vec{v}$; equals $\\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|}$.' },
      { symbol: '\\text{proj}_{\\vec{v}}\\vec{u}', meaning: 'Vector projection: arrow in direction of $\\vec{v}$ equal to the shadow of $\\vec{u}$; equals $\\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|^2}\\vec{v}$.' },
      { symbol: '\\vec{u}_{\\perp}', meaning: 'Perpendicular component: $\\vec{u} - \\text{proj}_{\\vec{v}}\\vec{u}$; orthogonal to $\\vec{v}$.' },
      { symbol: 'W = \\vec{F}\\cdot\\vec{d}', meaning: 'Work: dot product of force and displacement vectors; positive when force aids motion, negative when it opposes.' },
    ],
    rulesOfThumb: [
      'Positive dot product → acute angle; zero → perpendicular; negative → obtuse. Read the sign before doing any computation.',
      'Use $|\\vec{v}|^2$ (not $|\\vec{v}|$) in the projection denominator — it avoids a square root and is less error-prone.',
      'Always verify a projection by checking that the perpendicular part has zero dot product with $\\vec{v}$.',
      'Projection order matters: proj$_{\\vec{v}}\\vec{u}$ (shadow of $\\vec{u}$ on $\\vec{v}$) is different from proj$_{\\vec{u}}\\vec{v}$ (shadow of $\\vec{v}$ on $\\vec{u}$).',
    ],
  },

  spiral: {
    recoveryPoints: [
      { topic: 'Law of Cosines', where: 'solving-triangles', why: 'The proof that component = angle form of dot product uses the Law of Cosines as its key step.' },
      { topic: 'Vector magnitude and components', where: 'vectors-2d', why: 'The dot product formula $u_1v_1+u_2v_2$ requires fluency with component form from the previous lesson.' },
      { topic: 'Unit vectors', where: 'vectors-2d', why: 'The vector projection formula uses $\\hat{v} = \\vec{v}/|\\vec{v}|$ — dividing by magnitude to get unit length.' },
    ],
    futureLinks: [
      { topic: 'Directional derivative', where: 'multivariable-calculus-intro', why: '$D_{\\hat{u}}f = \\nabla f \\cdot \\hat{u}$ is a dot product measuring how fast $f$ changes in direction $\\hat{u}$.' },
      { topic: 'Cosine similarity', where: 'machine-learning-foundations', why: 'In ML, document similarity is the dot product of normalised feature vectors — the same formula, in higher dimensions.' },
      { topic: 'Cross product (3D)', where: 'vectors-3d', why: 'The dot product and cross product together form the complete algebra of 3D vectors.' },
    ],
  },

  assessment: [
    { question: 'Compute $\\langle 3, -4\\rangle \\cdot \\langle 1, 2\\rangle$.', answer: '3 + (-8) = -5', difficulty: 'quick-fire' },
    { question: 'If $\\vec{u}\\cdot\\vec{v} = 0$, what is the angle between them?', answer: '90°', difficulty: 'quick-fire' },
    { question: 'What does a negative dot product tell you about the angle?', answer: 'The angle is obtuse (greater than 90°).', difficulty: 'quick-fire' },
    { question: 'Find $k$ so that $\\langle 1, k\\rangle \\perp \\langle 2, -3\\rangle$.', answer: '$2 - 3k = 0 \\Rightarrow k = 2/3$', difficulty: 'quick-fire' },
    { question: 'What is the formula for the vector projection of $\\vec{u}$ onto $\\vec{v}$?', answer: '$\\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|^2}\\vec{v}$', difficulty: 'quick-fire' },
  ],

  mentalModel: [
    'The dot product measures alignment: how much of $\\vec{u}$ is pulling in the same direction as $\\vec{v}$. Positive = same side, zero = perpendicular, negative = opposite side.',
    'The shadow picture is physical: drop a perpendicular from the tip of $\\vec{u}$ to the line of $\\vec{v}$. The dot product is that shadow length times $|\\vec{v}|$.',
    'Two formulas, one value: $u_1v_1+u_2v_2 = |\\vec{u}||\\vec{v}|\\cos\\theta$. The component form is easy to compute; the angle form reveals the geometry. They are the same by the Law of Cosines proof.',
    'Projection = shadow as a vector: take the shadow length and aim it in the direction of $\\vec{v}$. The formula $\\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|^2}\\vec{v}$ does this in one step.',
    'Work in physics IS a dot product: $W = \\vec{F}\\cdot\\vec{d}$. Perpendicular force does zero work. Opposing force does negative work. The formula you learned in physics is the same formula.',
  ],

  quiz: [
    {
      id: 'dp-q1',
      type: 'multiple-choice',
      text: 'Compute $\\langle 2, 5\\rangle \\cdot \\langle -3, 1\\rangle$.',
      options: ['-1', '11', '-11', '1'],
      answer: '-1',
      hints: ['$(2)(-3) + (5)(1) = -6 + 5$.'],
      reviewSection: 'Examples tab — Form 1: Basic dot product',
    },
    {
      id: 'dp-q2',
      type: 'multiple-choice',
      text: 'If $\\vec{u}\\cdot\\vec{v} < 0$, which is true?',
      options: ['The angle is acute', 'The vectors are parallel', 'The angle is obtuse', 'The vectors are perpendicular'],
      answer: 'The angle is obtuse',
      hints: ['$\\vec{u}\\cdot\\vec{v} = |\\vec{u}||\\vec{v}|\\cos\\theta$. A negative dot product means $\\cos\\theta < 0$, which means $\\theta > 90°$.'],
      reviewSection: 'Intuition tab — before any formula: the shadow test',
    },
    {
      id: 'dp-q3',
      type: 'multiple-choice',
      text: 'Are $\\langle 4, -3\\rangle$ and $\\langle 3, 4\\rangle$ perpendicular?',
      options: ['Yes', 'No', 'Only if scaled', 'Cannot determine'],
      answer: 'Yes',
      hints: ['Compute the dot product: $(4)(3) + (-3)(4)$.'],
      reviewSection: 'Examples tab — Form 3: Testing for perpendicularity',
    },
    {
      id: 'dp-q4',
      type: 'multiple-choice',
      text: 'Find the angle between $\\vec{u} = \\langle 1, 0\\rangle$ and $\\vec{v} = \\langle 0, 1\\rangle$.',
      options: ['0°', '45°', '90°', '180°'],
      answer: '90°',
      hints: ['The dot product is $(1)(0)+(0)(1) = 0$. A dot product of zero means the angle is 90°.'],
      reviewSection: 'Examples tab — Form 2: Finding the angle',
    },
    {
      id: 'dp-q5',
      type: 'multiple-choice',
      text: 'What is the scalar projection of $\\langle 3, 4\\rangle$ onto $\\langle 1, 0\\rangle$?',
      options: ['3', '4', '5', '0'],
      answer: '3',
      hints: ['Scalar projection $= \\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|}$. Here $\\vec{v} = \\langle 1,0\\rangle$ has magnitude 1.'],
      reviewSection: 'Math tab — projection formulas unpacked',
    },
    {
      id: 'dp-q6',
      type: 'multiple-choice',
      text: 'What is $\\text{proj}_{\\vec{v}}\\vec{u}$ when $\\vec{u} = \\langle 3, 4\\rangle$ and $\\vec{v} = \\langle 1, 0\\rangle$?',
      options: ['\\langle 3, 0\\rangle', '\\langle 0, 4\\rangle', '\\langle 3, 4\\rangle', '\\langle 1, 0\\rangle'],
      answer: '\\langle 3, 0\\rangle',
      hints: ['$\\text{proj}_{\\vec{v}}\\vec{u} = \\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|^2}\\vec{v}$. The dot product is 3 and $|\\vec{v}|^2 = 1$.'],
      reviewSection: 'Examples tab — Form 4: Vector projection',
    },
    {
      id: 'dp-q7',
      type: 'multiple-choice',
      text: 'Force $\\vec{F} = \\langle 0, 10\\rangle$ N acts on an object that moves with displacement $\\vec{d} = \\langle 5, 0\\rangle$ m. How much work is done?',
      options: ['50 J', '0 J', '10 J', '5 J'],
      answer: '0 J',
      hints: ['$W = \\vec{F}\\cdot\\vec{d} = (0)(5)+(10)(0) = 0$. Force is vertical, motion is horizontal — they are perpendicular.'],
      reviewSection: 'Examples tab — Form 5: Work done by a force',
    },
    {
      id: 'dp-q8',
      type: 'multiple-choice',
      text: 'Find $k$ so that $\\langle k, 2\\rangle \\perp \\langle 3, -1\\rangle$.',
      options: ['k = 2/3', 'k = 6', 'k = 3/2', 'k = -6'],
      answer: 'k = 2/3',
      hints: ['Set the dot product to zero: $3k + (2)(-1) = 0$.'],
      reviewSection: 'Examples tab — Form 6: Finding an unknown component',
    },
    {
      id: 'dp-q9',
      type: 'multiple-choice',
      text: 'Which formula gives the VECTOR projection (an arrow), not the scalar projection (a number)?',
      options: [
        '\\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|}',
        '\\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|^2}\\vec{v}',
        '\\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{u}||\\vec{v}|}',
        '|\\vec{u}|\\cos\\theta',
      ],
      answer: '\\frac{\\vec{u}\\cdot\\vec{v}}{|\\vec{v}|^2}\\vec{v}',
      hints: ['The vector projection must be an arrow (a vector), so the result must have a $\\vec{v}$ factor. The scalar projection is just a number.'],
      reviewSection: 'Math tab — projection formulas unpacked',
    },
    {
      id: 'dp-q10',
      type: 'multiple-choice',
      text: 'After computing $\\text{proj}_{\\vec{v}}\\vec{u}$, how do you verify your answer?',
      options: [
        'Check that $|\\text{proj}_{\\vec{v}}\\vec{u}| = |\\vec{u}|$',
        'Check that $(\\vec{u} - \\text{proj}_{\\vec{v}}\\vec{u}) \\cdot \\vec{v} = 0$',
        'Check that $\\text{proj}_{\\vec{v}}\\vec{u} = \\vec{u}$',
        'Check that the projection has the same direction as $\\vec{u}$',
      ],
      answer: 'Check that $(\\vec{u} - \\text{proj}_{\\vec{v}}\\vec{u}) \\cdot \\vec{v} = 0$',
      hints: ['The perpendicular component $\\vec{u} - \\text{proj}_{\\vec{v}}\\vec{u}$ must be perpendicular to $\\vec{v}$, meaning their dot product is zero.'],
      reviewSection: 'Examples tab — Form 4: Vector projection',
    },
  ],
}
