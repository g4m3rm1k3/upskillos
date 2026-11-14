export default {
  id: 'precalc5-003',
  slug: 'vectors-2d',
  chapter: 'precalc-5',
  order: 3,
  title: 'Vectors: Quantities That Have Both Size and Direction',
  subtitle: 'A vector is an arrow. Its length is magnitude, its direction is heading. Components are just that arrow described with coordinates — one description, two representations.',
  tags: ['vectors', '2D vectors', 'vector addition', 'scalar multiplication', 'unit vector', 'magnitude', 'direction angle', 'component form', 'resultant', 'i j notation'],
  aliases: 'vector 2D magnitude direction component form addition subtraction scalar multiplication unit vector i j resultant angle bearing',

  hook: {
    question: 'A plane flies northeast at 400 km/h while wind blows due east at 80 km/h. What is the plane\'s actual velocity? You cannot add 400 + 80 because the directions are different. Vectors are the tool for adding quantities that have both size and direction.',
    realWorldContext: 'Force, velocity, acceleration, electric and magnetic fields — all are vector quantities. In structural engineering, every joint in a truss has forces acting on it in multiple directions; they must balance as vectors. In robotics, a robotic arm is described by joint angles and link lengths — the tip position is computed by adding vectors. In game physics, every collision, every trajectory, every lighting calculation is a vector operation.',
    previewVisualizationId: 'VectorOperationsViz',
  },

  intuition: {
    prose: [
      '**Where you are in the story:** You have mastered exponentials and logarithms (Precalc-4). Now the chapter turns to quantities that cannot be fully described by a single number — quantities that have both size and direction. Vectors are the language for this, and every physics, engineering, and graphics application uses them.',
      'A vector is an arrow. It has a tail (where it starts) and a tip (where it ends). Its magnitude is the length of the arrow. Its direction is which way the arrow points. Two vectors are equal if they have the same length and the same direction — position in the plane does not matter. You can slide the arrow anywhere and it is still the same vector.',
      'Adding two vectors follows the tip-to-tail rule: place the tail of the second vector at the tip of the first. The result (the resultant) goes from the first tail to the second tip. Order does not matter — $\\vec{u} + \\vec{v} = \\vec{v} + \\vec{u}$ because the diagonal of the parallelogram is the same regardless of which side you traverse first.',
      'Component form $\\langle a, b \\rangle$ is just the arrow described by its horizontal and vertical shadows. The component $a$ is how far the arrow goes right, and $b$ is how far it goes up. Once you have components, vector addition becomes ordinary addition: $\\langle a_1, b_1 \\rangle + \\langle a_2, b_2 \\rangle = \\langle a_1+a_2, b_1+b_2 \\rangle$. Adding the shadows gives the shadow of the resultant.',
      'Walk 3 km north, then 4 km east. Where are you? Not 7 km from the start — you are 5 km from the start (Pythagoras: $\\sqrt{9+16}=5$) at some angle northeast. Your total displacement is a vector: it has the magnitude 5 km and a direction. This is exactly what vector addition computes. The north walk is $\\langle 0, 3\\rangle$ and the east walk is $\\langle 4, 0\\rangle$. Their sum is $\\langle 4, 3\\rangle$, magnitude $\\sqrt{16+9}=5$ km. The path you took (north then east) does not matter — only the net displacement (the resultant arrow) does. This is also why the commutative law holds: walking north then east puts you in the same place as walking east then north.',
      '**Where this is heading:** Once you can add vectors and find their magnitudes, you will learn a new operation — the dot product — that measures how much two vectors agree in direction. That opens the door to projections, work in physics, and eventually the gradient in calculus.',
    ],
    callouts: [
      {
        type: 'sequencing',
        title: 'Precalc-5 arc — Lesson 1 of 4',
        body: '← (Precalc-4: Exponentials & Logs) | **2D Vectors** | Dot Product & Applications →',
      },
      {
        type: 'insight',
        title: 'Two representations of the same arrow',
        body: '\\text{Magnitude-direction form: } (|\\vec{v}|, \\theta) \\\\ \\text{Component form: } \\vec{v} = \\langle a, b \\rangle = a\\mathbf{i}+b\\mathbf{j} \\\\ \\text{Converting between them:} \\\\ a = |\\vec{v}|\\cos\\theta \\quad b = |\\vec{v}|\\sin\\theta \\quad (\\text{same triangle as polar coordinates!}) \\\\ |\\vec{v}| = \\sqrt{a^2+b^2} \\quad \\theta = \\arctan(b/a)',
      },
      {
        type: 'definition',
        title: 'Vector operations in component form',
        body: '\\vec{u}+\\vec{v} = \\langle u_1+v_1, u_2+v_2\\rangle \\quad \\text{(add components)} \\\\ c\\vec{v} = \\langle cv_1, cv_2\\rangle \\quad \\text{(scale each component)} \\\\ |\\vec{v}| = \\sqrt{v_1^2+v_2^2} \\quad \\hat{v} = \\vec{v}/|\\vec{v}| \\quad \\text{(unit vector)}',
      },
      {
        type: 'warning',
        title: 'Vectors are not numbers — you cannot just add magnitudes',
        body: '|\\vec{u}+\\vec{v}| \\neq |\\vec{u}|+|\\vec{v}| \\text{ in general.} \\\\ \\text{Example: } |\\langle3,0\\rangle+\\langle0,4\\rangle| = |\\langle3,4\\rangle| = 5 \\neq 3+4=7. \\\\ \\text{Adding magnitudes is only valid when both vectors point the same direction.}',
      },
      {
        type: 'insight',
        title: 'Displacement vs distance — a critical distinction',
        body: '\\text{Distance: total length of path (a scalar).} \\\\ \\text{Displacement: net change in position (a vector).} \\\\ \\text{Walk 5 km north then 5 km south: distance = 10 km, displacement = 0.} \\\\ |\\vec{u}+\\vec{v}| \\leq |\\vec{u}| + |\\vec{v}| \\quad \\text{(triangle inequality — path} \\geq \\text{displacement)}',
      },
    ],
    visualizations: [
      {
        id: 'VectorOperationsViz',
        title: 'Drag Two Vectors — Tip-to-Tail Addition',
        mathBridge: '1. Drag $\\vec{u}$ to any position and note its components $\\langle u_1, u_2 \\rangle$. 2. Drag $\\vec{v}$ and observe the tip-to-tail construction forming. 3. The parallelogram diagonal is the resultant — swap the order and it is unchanged (commutativity). 4. Switch to scalar multiplication mode and drag the scalar through negative values to see direction reverse. The key lesson: the geometric tip-to-tail rule and the algebraic component-addition rule always give the same answer because they describe the same underlying triangle.',
        caption: 'The resultant is the diagonal of the parallelogram formed by the two vectors.',
      },
    ],
  },

  rigor: {
    title: 'Proving that geometric addition = component addition',
    proofSteps: [
      {
        expression: '\\text{Let } \\vec{u} = \\langle u_1,u_2\\rangle \\text{ and } \\vec{v} = \\langle v_1,v_2\\rangle.',
        annotation: 'Both vectors start at the origin. $\\vec{u}$ ends at $(u_1,u_2)$. $\\vec{v}$ ends at $(v_1,v_2)$.',
      },
      {
        expression: '\\text{Tip-to-tail: place tail of } \\vec{v} \\text{ at tip of } \\vec{u} = (u_1,u_2).',
        annotation: "Slide $\\vec{v}$ so its tail is at $(u_1,u_2)$. Since a vector's identity is its length and direction, sliding does not change $\\vec{v}$. Shifted $\\vec{v}$ goes from $(u_1,u_2)$ to $(u_1+v_1, u_2+v_2)$.",
      },
      {
        expression: '\\text{Resultant: from } (0,0) \\text{ to } (u_1+v_1, u_2+v_2).',
        annotation: 'The resultant arrow goes from the original tail to the final tip. This is exactly the vector $\\langle u_1+v_1, u_2+v_2 \\rangle$ — which is what component addition gives.',
      },
      {
        expression: '\\therefore \\text{tip-to-tail} = \\langle u_1+v_1, u_2+v_2\\rangle = \\vec{u}+\\vec{v}. \\qquad \\blacksquare',
        annotation: 'The geometric rule and the algebraic rule produce identical results. Components are coordinates of the endpoint. Adding the endpoints gives the resultant endpoint.',
      },
    ],
  },

  math: {
    prose: [
      'Every real physics or engineering vector problem uses the same process: decompose each vector into components, add the components, reconstruct. Here is every step annotated so no symbol floats free.',
      'The horizontal component $F_x = |\\vec{F}|\\cos\\theta$: draw the force vector as the hypotenuse of a right triangle. The horizontal leg is adjacent to $\\theta$, so it equals hypotenuse × cosine. This is the definition of cosine: $\\cos\\theta = \\text{adjacent}/\\text{hypotenuse}$, rearranging to $F_x = |\\vec{F}|\\cos\\theta$.',
      'The vertical component $F_y = |\\vec{F}|\\sin\\theta$: same triangle — opposite leg over hypotenuse is sine.',
      'The resultant components $R_x = \\sum F_x$, $R_y = \\sum F_y$: horizontal and vertical are perpendicular, so vectors in those directions do not interfere. Adding horizontal shadows gives the horizontal shadow of the resultant.',
      'Back to magnitude: $|\\vec{R}| = \\sqrt{R_x^2+R_y^2}$ — the two components are perpendicular legs, Pythagorean theorem gives the hypotenuse. The direction $\\theta_R = \\arctan(R_y/R_x)$ uses the same quadrant check as in polar coordinates.',
      'Summary: Decompose → add components → reconstruct. The components are just shadows of the arrows onto the coordinate axes. Shadows add because shadows are numbers, not arrows.',
    ],
    callouts: [
      {
        type: 'proof-map',
        title: 'Resultant of multiple forces — the algorithm',
        body: '1.\\; F_x = |F|\\cos\\theta, \\; F_y = |F|\\sin\\theta \\text{ for each force} \\\\ 2.\\; R_x = \\sum F_x, \\; R_y = \\sum F_y \\\\ 3.\\; |R| = \\sqrt{R_x^2+R_y^2}, \\; \\theta_R = \\arctan(R_y/R_x) \\text{ (adjust quadrant)}',
      },
      {
        type: 'warning',
        title: 'Bearing vs standard angle — they measure differently',
        body: '\\text{Standard: CCW from positive }x\\text{-axis (east).} \\\\ \\text{Bearing: CW from north (positive }y\\text{-axis).} \\\\ \\text{N60°E means: start north, rotate 60° toward east.} \\\\ \\text{Standard equivalent: } 90°-60° = 30°. \\\\ \\text{Always draw a sketch before decomposing.}',
      },
    ],
    visualizations: [
      {
        id: 'VectorOperationsViz',
        title: 'Scalar Multiplication — Scale the Arrow',
        mathBridge: '1. Switch to scalar multiplication mode. 2. Set the scalar to 2 and observe the arrow double in length. 3. Drag the scalar to a negative value and watch the direction reverse. 4. Set scalar to 0 — the vector collapses to a point. The key lesson: scalar multiplication changes only the magnitude (and possibly direction); the component formula $c\\langle v_1, v_2\\rangle = \\langle cv_1, cv_2\\rangle$ captures this exactly.',
        caption: 'Multiplying by 2 doubles the arrow. Multiplying by −1 reverses it. Multiplying by 0 collapses it to a point.',
      },
    ],
  },

  examples: [
    {
      id: 'ch5-003-ex1',
      title: 'Form 1: Finding a vector from two points',
      problem: '\\text{Find } \\vec{AB} \\text{ where } A=(2,-1), B=(-3,4). \\text{ Find magnitude and unit vector.}',
      steps: [
        {
          expression: '\\vec{AB} = \\langle -3-2,\\, 4-(-1)\\rangle = \\langle -5,5\\rangle',
          annotation: 'Terminal minus initial: $B - A$. Always terminal minus initial.',
          hint: 'The vector from $A$ to $B$ always uses the formula terminal point minus initial point, component by component.',
        },
        {
          expression: '|\\vec{AB}| = \\sqrt{25+25} = 5\\sqrt{2}',
          annotation: 'Pythagorean theorem on components.',
          hint: 'Square each component, add, take the square root.',
        },
        {
          expression: '\\hat{u} = \\frac{\\langle-5,5\\rangle}{5\\sqrt{2}} = \\langle-\\tfrac{1}{\\sqrt{2}},\\tfrac{1}{\\sqrt{2}}\\rangle',
          annotation: 'Divide by magnitude. Verify: $(-1/\\sqrt{2})^2+(1/\\sqrt{2})^2 = 1$ ✓',
          hint: 'A unit vector is the original vector divided by its own magnitude. Its magnitude should be exactly 1.',
        },
      ],
      conclusion: 'The vector from $A$ to $B$ is $\\langle -5, 5\\rangle$ with magnitude $5\\sqrt{2}$. The unit vector is $\\langle -1/\\sqrt{2}, 1/\\sqrt{2}\\rangle$. Watch for: the vector from $A$ to $B$ is $B - A$, not $A - B$. Subtracting in the wrong order gives the opposite direction.',
    },
    {
      id: 'ch5-003-ex2',
      title: 'Form 2: Resultant of two forces',
      problem: '\\text{Force 1: 500 N at 30°. Force 2: 300 N at 120°. Find the resultant.}',
      steps: [
        {
          expression: 'F_{1x}=500\\cos30°=433.0,\\; F_{1y}=500\\sin30°=250.0',
          annotation: 'Decompose F1.',
          hint: 'Use $F_x = |F|\\cos\\theta$ and $F_y = |F|\\sin\\theta$ with the standard angle measured from the positive $x$-axis.',
        },
        {
          expression: 'F_{2x}=300\\cos120°=-150.0,\\; F_{2y}=300\\sin120°=259.8',
          annotation: '$\\cos120°=-1/2$, $\\sin120°=\\sqrt{3}/2$.',
          hint: '120° is in QII. Reference angle is 60°, but cosine is negative in QII. Always check the sign from the quadrant, not just the reference angle.',
        },
        {
          expression: 'R_x=283.0,\\; R_y=509.8 \\quad |R|=\\sqrt{283^2+509.8^2}\\approx584\\text{ N}',
          annotation: 'Add components, find magnitude.',
          hint: 'Add the $x$-components together, then the $y$-components. Then apply the Pythagorean theorem to find the resultant magnitude.',
        },
        {
          expression: '\\theta_R=\\arctan(509.8/283.0)\\approx61°',
          annotation: 'Direction. Both components positive → QI, no adjustment needed.',
          hint: 'Both $R_x$ and $R_y$ are positive, so the resultant is in QI. No quadrant adjustment is needed.',
        },
      ],
      conclusion: 'The resultant force has magnitude approximately 584 N at 61° from the positive $x$-axis.',
    },
    {
      id: 'ch5-003-ex3',
      title: 'Form 3: Bearing problem (navigation)',
      problem: '\\text{Plane heads N60°E at 400 km/h. Wind blows due east at 80 km/h. Find actual velocity.}',
      steps: [
        {
          expression: 'v_{plane} = \\langle 400\\sin60°,\\, 400\\cos60°\\rangle = \\langle 346.4,\\, 200\\rangle',
          annotation: 'N60°E: x-component uses sin (east), y-component uses cos (north).',
          hint: 'For a bearing angle, the east (x) component uses sine and the north (y) component uses cosine — the reverse of standard angle formulas. Draw the compass first.',
        },
        {
          expression: 'v_{wind} = \\langle 80,\\, 0\\rangle',
          annotation: 'Due east = positive x only.',
          hint: 'Due east is the positive $x$-direction, so the wind vector has a nonzero $x$-component only.',
        },
        {
          expression: '|v_{actual}| = |\\langle 426.4,\\, 200\\rangle| \\approx 472\\text{ km/h at N64.9°E}',
          annotation: 'Add components, reconstruct. Bearing angle: $\\arctan(426.4/200) \\approx 64.9°$ east of north = N64.9°E.',
          hint: 'To recover the bearing, compute $\\arctan(\\text{east component}/\\text{north component})$ — the east component goes in the numerator for a bearing.',
        },
      ],
      conclusion: 'The actual velocity is approximately 472 km/h at N64.9°E. For bearing problems, the x-component of a N$\\alpha$°E heading is $|v|\\sin\\alpha$ (east) and y-component is $|v|\\cos\\alpha$ (north) — NOT the standard angle formulas.',
    },
    {
      id: 'ch5-003-ex4',
      title: 'Form 4: Scalar multiplication and unit vectors',
      problem: '\\text{Find a vector of length 7 in the direction of } \\vec{v}=\\langle 3,-4\\rangle.',
      steps: [
        {
          expression: '|\\vec{v}|=\\sqrt{9+16}=5 \\quad \\hat{v}=\\langle 3/5, -4/5\\rangle',
          annotation: 'Find the unit vector in that direction.',
          hint: 'A unit vector is length 1 in the desired direction. Divide every component by the original magnitude.',
        },
        {
          expression: '7\\hat{v} = 7\\langle 3/5, -4/5\\rangle = \\langle 21/5, -28/5\\rangle',
          annotation: 'Scale the unit vector to length 7. Magnitude check: $\\sqrt{(21/5)^2+(28/5)^2} = \\sqrt{441+784}/5 = \\sqrt{1225}/5 = 35/5 = 7$ ✓',
          hint: 'Once you have the unit vector, multiply every component by the desired length. The result has that length and the original direction.',
        },
      ],
      conclusion: 'The vector of length 7 in the direction of $\\vec{v}$ is $\\langle 21/5, -28/5\\rangle$. To get a specific length in a given direction: find the unit vector, then scale it. Never scale the original vector unless you already know its magnitude is 1.',
    },
  ],

  challenges: [
    {
      id: 'ch5-003-ch1',
      difficulty: 'medium',
      problem: '\\text{Three forces act on an object: } \\vec{F_1}=\\langle 2,5\\rangle, \\vec{F_2}=\\langle -3,1\\rangle, \\vec{F_3}=\\langle 1,-4\\rangle. \\text{ Find the force } \\vec{F_4} \\text{ needed for equilibrium (net force = 0).}',
      hint: 'Equilibrium means all forces sum to the zero vector. Find the resultant of the three given forces, then negate it.',
      walkthrough: [
        { expression: '\\vec{F_1}+\\vec{F_2}+\\vec{F_3} = \\langle0,2\\rangle', annotation: 'Sum the three given forces component by component.' },
        { expression: '\\vec{F_4} = -\\langle0,2\\rangle = \\langle0,-2\\rangle', annotation: 'Equilibrant is the negative of the resultant.' },
      ],
      answer: '\\vec{F_4} = \\langle 0,-2\\rangle',
    },
  ],

  crossRefs: [
    { slug: 'polar-coordinates-deep', reason: 'Polar coordinates use the same right-triangle decomposition as vector components — $x = r\\cos\\theta$, $y = r\\sin\\theta$.' },
    { slug: 'vectors-dot-product', reason: 'The dot product is the natural next operation after vector addition and scalar multiplication.' },
  ],

  checkpoints: [
    'Can you convert a vector between magnitude-direction form and component form?',
    'Can you add two vectors by the tip-to-tail rule and verify the result with component addition?',
    'Can you decompose a force at an angle into its $x$ and $y$ components?',
    'Can you find a unit vector and scale it to a desired magnitude?',
    'Do you know why $|\\vec{u}+\\vec{v}| \\neq |\\vec{u}|+|\\vec{v}|$ in general?',
  ],

  semantics: {
    symbols: [
      { symbol: '\\vec{v}', meaning: 'A vector — a quantity with both magnitude and direction, written as a bold or arrow-decorated letter.' },
      { symbol: '\\langle a, b \\rangle', meaning: 'Component form of a vector: $a$ is the horizontal component, $b$ is the vertical component.' },
      { symbol: '|\\vec{v}|', meaning: 'Magnitude (length) of vector $\\vec{v}$; computed as $\\sqrt{v_1^2+v_2^2}$.' },
      { symbol: '\\hat{v}', meaning: 'Unit vector in the direction of $\\vec{v}$; has magnitude 1; computed as $\\vec{v}/|\\vec{v}|$.' },
      { symbol: '\\mathbf{i}, \\mathbf{j}', meaning: 'Standard basis vectors: $\\mathbf{i} = \\langle 1,0\\rangle$ (east) and $\\mathbf{j} = \\langle 0,1\\rangle$ (north).' },
      { symbol: 'c\\vec{v}', meaning: 'Scalar multiplication: scales the magnitude by $|c|$; reverses direction if $c < 0$.' },
    ],
    rulesOfThumb: [
      'Always draw a sketch before decomposing a vector — the diagram tells you which trig function and which sign to use.',
      'Bearing angles use sine for east and cosine for north; standard angles use cosine for $x$ and sine for $y$.',
      'The vector from $A$ to $B$ is $B - A$ (terminal minus initial), never $A - B$.',
      'To achieve a specific length in a given direction: (1) find the unit vector, (2) scale it by the desired length.',
    ],
  },

  spiral: {
    recoveryPoints: [
      { topic: 'Right triangle trigonometry', where: 'trig-ratios-right-triangles', why: 'Component decomposition is just SOH-CAH-TOA applied to the vector triangle.' },
      { topic: 'Pythagorean theorem', where: 'graphs-foundations', why: 'Magnitude formula $|\\vec{v}| = \\sqrt{v_1^2+v_2^2}$ is the Pythagorean theorem on the component right triangle.' },
      { topic: 'Coordinate geometry', where: 'graphs-foundations', why: 'Component form uses the same $(x, y)$ coordinates you have been using since early algebra.' },
    ],
    futureLinks: [
      { topic: 'Dot product', where: 'vectors-dot-product', why: 'The dot product builds directly on component form to measure alignment between two vectors.' },
      { topic: 'Gradient vector', where: 'multivariable-calculus-intro', why: 'The gradient $\\nabla f = \\langle f_x, f_y\\rangle$ is a vector; all operations here carry over to 3D.' },
      { topic: 'Vector-valued functions', where: 'parametric-curves', why: '$\\vec{r}(t) = \\langle x(t), y(t)\\rangle$ describes curves; derivatives give velocity and acceleration vectors.' },
    ],
  },

  assessment: [
    { question: 'What is the magnitude of $\\langle 5, -12\\rangle$?', answer: '13', difficulty: 'quick-fire' },
    { question: 'What is the unit vector in the direction of $\\langle 3, 4\\rangle$?', answer: '\\langle 3/5, 4/5\\rangle', difficulty: 'quick-fire' },
    { question: 'Add $\\langle 2, -3\\rangle + \\langle -5, 1\\rangle$.', answer: '\\langle -3, -2\\rangle', difficulty: 'quick-fire' },
    { question: 'A force of magnitude 10 acts at 45°. What are its $x$ and $y$ components?', answer: '$F_x = 10\\cos45° = 5\\sqrt{2}$, $F_y = 10\\sin45° = 5\\sqrt{2}$', difficulty: 'quick-fire' },
    { question: 'If $\\vec{u} = \\langle 1, 2\\rangle$, what is $3\\vec{u}$?', answer: '\\langle 3, 6\\rangle', difficulty: 'quick-fire' },
  ],

  mentalModel: [
    'A vector is an arrow: its length is magnitude, its direction is heading. Position in the plane does not matter — two arrows of the same length pointing the same way are the same vector.',
    'Components are shadows: the $x$-component is the horizontal shadow of the arrow, the $y$-component is the vertical shadow. Shadows add as ordinary numbers.',
    'Tip-to-tail addition is the same as component addition — the proof shows they describe the same underlying triangle.',
    'Unit vectors are direction only: magnitude exactly 1. Scaling a unit vector by any number gives a vector of that length in that direction.',
    'Bearings and standard angles differ: standard is CCW from east, bearing is CW from north. Always draw the compass before decomposing.',
  ],

  quiz: [
    {
      id: 'v2d-q1',
      type: 'multiple-choice',
      text: 'What is the magnitude of the vector $\\langle -3, 4\\rangle$?',
      options: ['1', '5', '7', '\\sqrt{7}'],
      answer: '5',
      hints: ['Use the Pythagorean theorem on the components: $\\sqrt{(-3)^2 + 4^2}$.'],
      reviewSection: 'Intuition tab — two representations of the same arrow',
    },
    {
      id: 'v2d-q2',
      type: 'multiple-choice',
      text: 'Which of the following correctly computes $\\vec{AB}$ from $A = (1, 3)$ to $B = (4, -1)$?',
      options: ['\\langle 3, 4\\rangle', '\\langle 3, -4\\rangle', '\\langle -3, 4\\rangle', '\\langle 5, 2\\rangle'],
      answer: '\\langle 3, -4\\rangle',
      hints: ['The vector from $A$ to $B$ is terminal minus initial: $B - A$.'],
      reviewSection: 'Examples tab — Form 1: Finding a vector from two points',
    },
    {
      id: 'v2d-q3',
      type: 'multiple-choice',
      text: 'A vector of magnitude 10 points at 30° (standard). What is its $x$-component?',
      options: ['5', '5\\sqrt{3}', '10', '10\\sqrt{3}'],
      answer: '5\\sqrt{3}',
      hints: ['$F_x = |F|\\cos\\theta = 10\\cos30°$. Recall $\\cos30° = \\sqrt{3}/2$.'],
      reviewSection: 'Math tab — resultant of multiple forces',
    },
    {
      id: 'v2d-q4',
      type: 'multiple-choice',
      text: 'What is the unit vector in the direction of $\\vec{v} = \\langle 5, -12\\rangle$?',
      options: ['\\langle 5, -12\\rangle', '\\langle 1/5, -1/12\\rangle', '\\langle 5/13, -12/13\\rangle', '\\langle 5/17, -12/17\\rangle'],
      answer: '\\langle 5/13, -12/13\\rangle',
      hints: ['First find $|\\vec{v}| = \\sqrt{25+144} = 13$, then divide each component by 13.'],
      reviewSection: 'Intuition tab — vector operations in component form',
    },
    {
      id: 'v2d-q5',
      type: 'multiple-choice',
      text: 'If $\\vec{u} = \\langle 4, 1\\rangle$ and $\\vec{v} = \\langle -2, 3\\rangle$, what is $\\vec{u} + \\vec{v}$?',
      options: ['\\langle 2, 4\\rangle', '\\langle 6, -2\\rangle', '\\langle 2, -2\\rangle', '\\langle -8, 3\\rangle'],
      answer: '\\langle 2, 4\\rangle',
      hints: ['Add $x$-components together and $y$-components together separately.'],
      reviewSection: 'Intuition tab — tip-to-tail addition',
    },
    {
      id: 'v2d-q6',
      type: 'multiple-choice',
      text: 'What is the vector of length 6 in the direction of $\\langle 0, -1\\rangle$?',
      options: ['\\langle 0, 6\\rangle', '\\langle 6, 0\\rangle', '\\langle 0, -6\\rangle', '\\langle -6, 0\\rangle'],
      answer: '\\langle 0, -6\\rangle',
      hints: ['$\\langle 0, -1\\rangle$ is already a unit vector (it has magnitude 1). Scale it by 6.'],
      reviewSection: 'Examples tab — Form 4: Scalar multiplication and unit vectors',
    },
    {
      id: 'v2d-q7',
      type: 'multiple-choice',
      text: 'Is $|\\vec{u} + \\vec{v}| = |\\vec{u}| + |\\vec{v}|$ always true?',
      options: ['Yes, always', 'Only when vectors are perpendicular', 'Only when vectors point the same direction', 'Never true'],
      answer: 'Only when vectors point the same direction',
      hints: ['Try $\\vec{u} = \\langle 3,0\\rangle$ and $\\vec{v} = \\langle 0,4\\rangle$: $|\\vec{u}+\\vec{v}| = 5$ but $|\\vec{u}|+|\\vec{v}| = 7$.'],
      reviewSection: 'Intuition tab — vectors are not numbers',
    },
    {
      id: 'v2d-q8',
      type: 'multiple-choice',
      text: 'A force of 300 N at 120° standard and a force of 400 N at 30° standard act on a point. Which of the following is the $x$-component of the resultant?',
      options: ['\\approx 196', '\\approx 346', '\\approx -150 + 346', '700'],
      answer: '\\approx -150 + 346',
      hints: ['Decompose each force: $F_{1x} = 300\\cos120°$ and $F_{2x} = 400\\cos30°$. Then add.'],
      reviewSection: 'Examples tab — Form 2: Resultant of two forces',
    },
    {
      id: 'v2d-q9',
      type: 'multiple-choice',
      text: 'Three forces $\\langle 3,2\\rangle$, $\\langle -1,4\\rangle$, and $\\langle -2,-6\\rangle$ act on an object. What fourth force produces equilibrium?',
      options: ['\\langle 0, 0\\rangle', '\\langle 0, -6\\rangle', '\\langle 0, -4\\rangle', '\\langle -6, 0\\rangle'],
      answer: '\\langle 0, -4\\rangle',
      hints: ['Find the resultant of the three forces by adding components, then negate it.'],
      reviewSection: 'Challenges tab — equilibrium force',
    },
    {
      id: 'v2d-q10',
      type: 'multiple-choice',
      text: 'A plane heads N45°E at 300 km/h. What is the east ($x$) component of its velocity?',
      options: ['300\\cos45°', '300\\sin45°', '300\\tan45°', '300'],
      answer: '300\\sin45°',
      hints: ['For a bearing N$\\alpha$°E, the east component is $|v|\\sin\\alpha$ (not cosine — bearing angles swap sin/cos compared to standard).'],
      reviewSection: 'Examples tab — Form 3: Bearing problem',
    },
  ],
}
