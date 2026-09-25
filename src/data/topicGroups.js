import { getAllCourses } from '../courses/courseLoader.js'
import { LABS } from '../labs/labRegistryLoader.js'
import { GAMES } from '../games/registry.js'
import { completeTopics } from './catalogNavigation.js'

// Curated topic → subtopic tree for the home page's "Explore" section.
// Two-level nav: pick a topic (Mathematics, Science, ...), then a subtopic
// within it (Linear Algebra, Calculus, ...) — see TopicFilterHeader.jsx.
//
// This is a GRAPH, not a tree: the same course/lab/game key can appear
// under more than one subtopic when it genuinely teaches more than one
// thing (e.g. `asteroids-la` is real Linear Algebra practice AND real
// Physics practice — listing it once and hiding the other half is the
// same "no visible structure" problem the audit flagged in the first
// place). Only `kind`/`key`/`differentiator` are stored here — cosmetic
// fields (emoji, color, tags, description) are resolved live from
// courseLoader.js / labs/labRegistryLoader.js / games/registry.js at render time
// (see TopicTable.jsx), so this file can never go stale relative to those
// registries. Standalone tools (calculator, grapher-2d, terminal-hub, ...)
// are deliberately excluded — see ux-audit-plan.md Phase 4.
//
// completeTopics adds any discovered entries missing from this curated list.
// Unknown subjects go under General; All content always includes every entry.
// Adding content therefore does not require editing this navigation file.
const CURATED_TOPICS = {
  mathematics: {
    label: 'Mathematics',
    icon: '∑',
    color: 'indigo',
    subtopics: {
      precalculus: {
        label: 'Precalculus',
        color: 'sky',
        items: [
          { kind: 'course', key: 'precalculus',
            differentiator: 'Structured curriculum — algebra, trigonometry, exponentials, and the foundations everything after this builds on.' },
        ],
      },
      calculus: {
        label: 'Calculus',
        color: 'emerald',
        items: [
          { kind: 'course', key: 'calculus',
            differentiator: 'Structured curriculum — limits, derivatives, integrals, and the mathematics of change, in order.' },
          { kind: 'lab', key: 'openmat',
            differentiator: 'General computation engine — symbolic differentiation/integration alongside its matrix and 3D graphing tools.' },
          { kind: 'lab', key: 'universal-calc',
            differentiator: 'Numerical methods and constants for when you need an answer, not a full symbolic derivation.' },
          { kind: 'game', key: 'basketball',
            differentiator: 'Apply trajectory and calculus to perfect your shot arc.' },
          { kind: 'game', key: 'football',
            differentiator: 'Integration and optimization applied to real routes and trajectories.' },
          { kind: 'game', key: 'vector-command',
            differentiator: 'Its 3D missions lean on integrals as much as linear algebra to intercept moving targets.' },
        ],
      },
      geometry: {
        label: 'Geometry',
        color: 'amber',
        items: [
          { kind: 'course', key: 'geometry',
            differentiator: 'Structured curriculum — angles, proofs, circles, transformations, and geometric reasoning, in order.' },
          { kind: 'lab', key: 'universal-calc',
            differentiator: 'Unit conversion and geometric constants on tap — the calculator you keep open while working proofs.' },
          { kind: 'game', key: 'golf',
            differentiator: 'Geometry and projectile motion, one putt at a time.' },
          { kind: 'game', key: 'vector-command',
            differentiator: '3D missions built on real spatial geometry — reading position, distance, and intercept courses in space.' },
        ],
      },
      'linear-algebra': {
        label: 'Linear Algebra',
        color: 'indigo',
        items: [
          { kind: 'course', key: 'linear-algebra',
            differentiator: 'Structured, sequential curriculum — start here for the full path from vectors to eigenvalues.' },
          { kind: 'lab', key: 'matrix-lab',
            differentiator: 'Code the algorithms yourself — row ops, elimination, determinants, inverse, Gram-Schmidt in JS, Python, or MATLAB.' },
          { kind: 'lab', key: 'matrix-3d-lab',
            differentiator: 'Visual, geometric 3D intuition — manipulate a live 4×4 transform and watch every entry update.' },
          { kind: 'lab', key: 'decomp-lab',
            differentiator: 'See SVD and least squares actually do something — compress a real image, fit a curve to noisy data.' },
          { kind: 'lab', key: 'image-lab',
            differentiator: 'A matrix-on-pixels workspace — inspect RGB values, tune histograms, and design convolution kernels on a real image.' },
          { kind: 'lab', key: 'image-lab-wip',
            differentiator: 'The same pixel-matrix workspace with SVD, FFT, and compression tools added, and a resizable menu-driven layout — actively evolving.' },
          { kind: 'lab', key: 'openmat',
            differentiator: 'A general computation engine — matrices are one part of a bigger symbolic + numeric CAS.' },
          { kind: 'game', key: 'matrix-game',
            differentiator: 'Seven gamified interactive lessons — vectors, transforms, determinants, eigenvectors.' },
          { kind: 'game', key: 'asteroids-la',
            differentiator: 'Arcade application — velocity, dot products, and matrix transforms through ten waves of gameplay.' },
          { kind: 'game', key: 'vector-command',
            differentiator: '3D mission campaign — RREF, cross products, and integrals used to intercept targets.' },
          { kind: 'game', key: 'stem-tetris',
            differentiator: 'Classic Tetris wearing a matrix-ops lens — 2×2 transforms fall with the pieces.' },
          { kind: 'game', key: 'card-quest',
            differentiator: "Cards and dice double as a linear-algebra workout alongside the probability it's primarily about." },
          { kind: 'game', key: 'rubiks-cube',
            differentiator: 'Permutation groups are matrices in disguise — the cube is a hands-on intro to the algebra of transformations.' },
        ],
      },
      'discrete-math': {
        label: 'Discrete Mathematics',
        color: 'violet',
        items: [
          { kind: 'course', key: 'discrete-math',
            differentiator: 'Structured curriculum — logic, sets, graphs, and the mathematics of computing, in order.' },
          { kind: 'game', key: 'rubiks-cube',
            differentiator: "Group theory, permutations, and non-commutativity through the world's most famous puzzle." },
        ],
      },
      statistics: {
        label: 'Statistics & Probability',
        color: 'rose',
        items: [
          { kind: 'course', key: 'applied-statistics',
            differentiator: 'Structured curriculum — statistical thinking, probability, inference, and regression analysis, in order.' },
          { kind: 'course', key: 'discrete-math',
            differentiator: 'Covers discrete probability as part of the broader logic/sets/graphs curriculum — the theory side of the odds you practice elsewhere here.' },
          { kind: 'lab', key: 'odds-lab',
            differentiator: 'Probability and card-counting practice with cards, dice, and blackjack decisions.' },
          { kind: 'game', key: 'card-quest',
            differentiator: 'Counting, probability, permutations, and stats — through cards and dice.' },
          { kind: 'game', key: 'card-academy',
            differentiator: 'Five card games teaching probability, statistics, and neuroscience through play.' },
          { kind: 'game', key: 'stem-tetris',
            differentiator: 'One of its six STEM lenses is straight probability distributions falling in real time.' },
        ],
      },
    },
  },

  science: {
    label: 'Science',
    icon: '⚛',
    color: 'emerald',
    subtopics: {
      physics: {
        label: 'Physics',
        color: 'sky',
        items: [
          { kind: 'course', key: 'physics',
            differentiator: 'Structured curriculum — kinematics, Newtonian mechanics, energy, momentum, and waves, in order.' },
          { kind: 'course', key: 'simulation',
            differentiator: 'Physics simulations, 3D scenes, and real-time interactive systems — the engineering side of "build your own physics."' },
          { kind: 'lab', key: 'sim-lab',
            differentiator: 'Build your own physics simulations from scratch — code it yourself in a Monaco editor with a live 3D sandbox.' },
          { kind: 'lab', key: 'physics',
            differentiator: 'Rigid body dynamics, springs, pendulums, and wave mechanics — a dedicated simulation lab, no code required.' },
          { kind: 'lab', key: 'universal-calc',
            differentiator: 'Physical constants and unit conversion on tap while you work a problem.' },
          { kind: 'game', key: 'reality-runner',
            differentiator: 'Arcade runner — dodge and react to physics simulations in real time.' },
          { kind: 'game', key: 'basketball',
            differentiator: 'Trajectory and arc, framed as a shot you have to make.' },
          { kind: 'game', key: 'pool',
            differentiator: 'Collision physics and bank angles, played out on the felt.' },
          { kind: 'game', key: 'golf',
            differentiator: 'Projectile motion, one putt at a time.' },
          { kind: 'game', key: 'football',
            differentiator: 'Routes and trajectories, framed as a play you have to read.' },
          { kind: 'game', key: 'asteroids-la',
            differentiator: 'Velocity and momentum through arcade dogfighting, matrix transforms included.' },
          { kind: 'game', key: 'open-craft',
            differentiator: 'A physics-based voxel sandbox — build and break things and watch the physics engine react.' },
          { kind: 'game', key: 'vector-command',
            differentiator: 'Missions play out as real physics — intercept courses, velocity, and 3D space navigation.' },
        ],
      },
      chemistry: {
        label: 'Chemistry',
        color: 'fuchsia',
        items: [
          { kind: 'course', key: 'chemistry',
            differentiator: 'Structured curriculum — atomic structure, bonding, reactions, and chemical systems, in order.' },
          { kind: 'lab', key: 'chemistry',
            differentiator: 'Hands-on reactions, periodic table data, and molecular structure — no code required.' },
        ],
      },
    },
  },

  programming: {
    label: 'Programming',
    icon: '⌨',
    color: 'orange',
    subtopics: {
      python: {
        label: 'Python',
        color: 'yellow',
        items: [
          { kind: 'course', key: 'python',
            differentiator: 'Structured curriculum — core syntax through data science, OOP, and vectorization, in order.' },
          { kind: 'lab', key: 'notebook-lab',
            differentiator: 'Real Python notebooks in the browser — write code, see output, import/export .ipynb.' },
          { kind: 'lab', key: 'lesson-engine',
            differentiator: 'Runs a full narrated Python lesson series inside its prediction-challenge/checkpoint format.' },
          { kind: 'lab', key: 'visual-code',
            differentiator: 'Drag-and-drop blocks that generate real, runnable Python — see the code as you build it.' },
          { kind: 'lab', key: 'dsa-arrays-lab',
            differentiator: 'Array operations with a live memory visualizer — dual-language, Python included.' },
          { kind: 'lab', key: 'dsa-linked-lists-lab',
            differentiator: 'Linked-list operations with animated pointer tracing — dual-language, Python included.' },
          { kind: 'lab', key: 'dp-lab',
            differentiator: 'Dynamic programming recurrences with a live table-fill visualizer — dual-language, Python included.' },
        ],
      },
      javascript: {
        label: 'JavaScript',
        color: 'amber',
        items: [
          { kind: 'course', key: 'javascript',
            differentiator: 'Structured curriculum — runtime model, async, closures, OOP, and browser APIs, in order.' },
          { kind: 'lab', key: 'codelens',
            differentiator: 'Paste real JavaScript and watch it execute — token stream, AST, heap, call stack, scope chain.' },
          { kind: 'lab', key: 'visual-code',
            differentiator: 'Drag-and-drop blocks that generate real, runnable JavaScript — see the code as you build it.' },
          { kind: 'lab', key: 'lesson-engine',
            differentiator: 'Narrated JavaScript lessons with prediction challenges and live checkpoints.' },
          { kind: 'lab', key: 'abstraction-viz',
            differentiator: 'Step through JavaScript callbacks, HOFs, closures, and DI and watch the abstraction build live.' },
          { kind: 'lab', key: 'sicp-js',
            differentiator: 'SICP, condensed into an interactive JavaScript lesson with narrated checkpoints.' },
        ],
      },
      typescript: {
        label: 'TypeScript',
        color: 'blue',
        items: [
          { kind: 'lab', key: 'ts-lab',
            differentiator: 'Build a real social platform frontend from scratch in vanilla TypeScript against a live REST API — no framework.' },
          { kind: 'lab', key: 'dsa-patterns',
            differentiator: 'Data structures and classic design patterns, written in TypeScript throughout.' },
        ],
      },
      cpp: {
        label: 'C++',
        color: 'indigo',
        items: [
          { kind: 'course', key: 'c-plus-plus',
            differentiator: 'Structured curriculum — foundations through the standard library to advanced techniques, in order.' },
          { kind: 'lab', key: 'visual-code',
            differentiator: 'Block-based programming that can generate real, runnable C++ alongside JS and Python.' },
          { kind: 'lab', key: 'lesson-engine',
            differentiator: 'Runs narrated lessons in this general-purpose teaching runtime — usable for C++ content too.' },
        ],
      },
      'web-development': {
        label: 'Web Development',
        color: 'rose',
        items: [
          { kind: 'course', key: 'web',
            differentiator: 'Structured curriculum — HTML and CSS through async JavaScript, ending in a capstone project.' },
          { kind: 'lab', key: 'html-lab',
            differentiator: 'Drag, drop, and style real HTML elements on a live canvas — the code panel syncs both ways as you go.' },
          { kind: 'lab', key: 'html-lessons',
            differentiator: 'Guided step series building one real page — semantic HTML first, then styling, then DOM scripting.' },
          { kind: 'lab', key: 'css-mastery',
            differentiator: "Deep-dive into the browser's layout engine — Box Model, Flexbox, Grid, and Stacking Contexts through interactive challenges." },
          { kind: 'lab', key: 'react-mastery',
            differentiator: '27 narrated lessons — JSX through hooks, context, reducers, and Suspense with live sandboxes.' },
          { kind: 'lab', key: 'ts-lab',
            differentiator: 'A real frontend build, in TypeScript, against a live REST API — the "put it together" project for this topic.' },
          { kind: 'lab', key: 'vue-studio',
            differentiator: 'Build a real Vue 3 project from scratch — real .vue files, live component tree as you write.' },
          { kind: 'lab', key: 'backend-lab',
            differentiator: 'Build a real backend from scratch — routes, middleware, services, a database — test your own endpoints.' },
          { kind: 'course', key: 'cyber-lab',
            differentiator: 'The security half of web development — real Web Crypto API hashing, salting, and cost factors, live in the browser.' },
        ],
      },
      'graphics-programming': {
        label: 'Canvas & Graphics Programming',
        color: 'purple',
        items: [
          { kind: 'course', key: 'canvas',
            differentiator: 'Structured curriculum — 2D graphics programming with the HTML Canvas API, in order.' },
          { kind: 'course', key: 'three-js',
            differentiator: 'Structured curriculum — 3D graphics from WebGL fundamentals to Three.js scenes and shaders.' },
          { kind: 'lab', key: 'svg-studio',
            differentiator: 'Browser-based vector drawing tool — draw, transform, and export as SVG or PNG, no boilerplate.' },
        ],
      },
      'command-line': {
        label: 'Command Line & Git',
        color: 'slate',
        items: [
          { kind: 'course', key: 'command-line-interface',
            differentiator: 'Structured curriculum — command line fundamentals and terminal mastery, in order.' },
          { kind: 'course', key: 'git',
            differentiator: 'Structured curriculum — version control with Git from fundamentals to internals and logic.' },
        ],
      },
    },
  },

  'computer-science': {
    label: 'Computer Science',
    icon: '⊕',
    color: 'blue',
    subtopics: {
      dsa: {
        label: 'Data Structures & Algorithms',
        color: 'emerald',
        items: [
          { kind: 'course', key: 'data-structures-and-algorithms',
            differentiator: 'Structured curriculum covering arrays through graphs, in order.' },
          { kind: 'course', key: 'dynamic-programming',
            differentiator: 'Structured curriculum focused entirely on DP patterns and algorithmic problem solving.' },
          { kind: 'lab', key: 'dsa-arrays-lab',
            differentiator: 'Implement array operations yourself — get/insert/delete/search — with live memory visualization and a step tracer.' },
          { kind: 'lab', key: 'dsa-linked-lists-lab',
            differentiator: 'Build linked-list operations yourself — nodes, reverse, cycle detection — with animated pointer visualization.' },
          { kind: 'lab', key: 'dp-lab',
            differentiator: 'Write six DP recurrences yourself and watch the table fill cell-by-cell — a hands-on companion to the course\'s much broader 31-lesson pattern catalogue (bitmask, tree, digit, state-machine DP).' },
          { kind: 'lab', key: 'dsa-patterns',
            differentiator: 'Data structures and classic design patterns taught together as one guided lesson series.' },
          { kind: 'lab', key: 'lesson-engine',
            differentiator: 'Runs a narrated DSA-in-Python lesson series inside its prediction-challenge/checkpoint format.' },
        ],
      },
      'logic-digital': {
        label: 'Logic & Digital Fundamentals',
        color: 'cyan',
        items: [
          { kind: 'course', key: 'logic',
            differentiator: 'Boolean logic and combinational circuit design, applied through problem sets rather than a linear course arc.' },
          { kind: 'course', key: 'digital-fundamentals',
            differentiator: 'Structured curriculum — binary, logic gates, boolean algebra, and digital circuits, in order.' },
          { kind: 'lab', key: 'logic-sim',
            differentiator: 'Design and simulate digital logic circuits gate-by-gate with truth tables — build what the courses describe.' },
        ],
      },
      runtime: {
        label: 'Runtime & Program Execution',
        color: 'amber',
        items: [
          { kind: 'lab', key: 'abstraction-viz',
            differentiator: 'Step through callbacks, higher-order functions, closures, and DI and watch the abstraction build in the editor.' },
          { kind: 'lab', key: 'codelens',
            differentiator: 'Paste any JavaScript and watch AST, heap, call stack, and scope chain execute step by step.' },
          { kind: 'lab', key: 'visual-code',
            differentiator: 'Block-based programming — see how blocks compile down to real, runnable code.' },
          { kind: 'lab', key: 'lesson-engine',
            differentiator: 'General-purpose interactive teaching runtime — prediction challenges, concept labs, quizzes, checkpoints.' },
          { kind: 'lab', key: 'sicp-js',
            differentiator: 'Structure and Interpretation of Computer Programs, condensed into an interactive, narrated lesson.' },
        ],
      },
      security: {
        label: 'Security',
        color: 'rose',
        items: [
          { kind: 'course', key: 'cyber-lab',
            differentiator: 'Interactive security labs — hash real passwords, attack a precomputed table, reproduce a real MD5 collision, and feel a real password-hashing cost factor, all live in the browser.' },
        ],
      },
    },
  },

  engineering: {
    label: 'Engineering',
    icon: '⚙',
    color: 'amber',
    subtopics: {
      cnc: {
        label: 'CNC',
        color: 'slate',
        items: [
          { kind: 'course', key: 'cnc',
            differentiator: 'Structured curriculum — CNC macro programming, G-code systems, and toolpath math, in order.' },
          { kind: 'course', key: 'gcode-parser',
            differentiator: 'Math and geometry foundations underneath CNC toolpaths — for understanding what the G-code numbers mean, not just running the simulator.' },
          { kind: 'lab', key: 'cnc-sim',
            differentiator: 'Program and simulate CNC toolpaths on their own — live 3D backplot and fixture management.' },
          { kind: 'lab', key: 'five-axis',
            differentiator: '5-axis kinematics visualizer — homogeneous transforms, surface normals, lead/lag angles on parametric shapes.' },
          { kind: 'lab', key: 'cad-cnc',
            differentiator: 'CAD and CNC combined — draw geometry and send it straight to the simulator as G-code, both panels live side by side.' },
        ],
      },
      cad: {
        label: 'CAD',
        color: 'blue',
        items: [
          { kind: 'lab', key: 'cad-pro',
            differentiator: 'Design the part first — parametric 3D modelling with constraint-based tools, no machining involved.' },
          { kind: 'lab', key: 'cad-cnc',
            differentiator: 'Draw geometry and immediately see it as a toolpath — CAD with the CNC step built in.' },
        ],
      },
      'plc-automation': {
        label: 'PLC & Automation',
        color: 'lime',
        items: [
          { kind: 'course', key: 'programmable-logic-controllers',
            differentiator: 'Structured curriculum — PLC programming fundamentals and industrial automation systems, in order.' },
          { kind: 'lab', key: 'plc-lab',
            differentiator: 'Hands-on ladder logic simulator — 8 exercises from motor start/stop to full FSM state machines, Allen-Bradley naming.' },
        ],
      },
      robotics: {
        label: 'Robotics',
        color: 'orange',
        items: [
          { kind: 'lab', key: 'robot-arm-sim',
            differentiator: 'Robot programming from zero — trig, FK/IK, 4×4 transforms, obstacle avoidance, 19 missions on a 2D and 6-DOF 3D arm.' },
          { kind: 'lab', key: 'drone-lab',
            differentiator: 'Program a self-flying drone — 10 missions on displacement vectors, rotation matrices, Bézier paths, and PID control.' },
        ],
      },
      electronics: {
        label: 'Electronics',
        color: 'amber',
        items: [
          { kind: 'course', key: 'electronics',
            differentiator: 'Structured curriculum — electrical fundamentals through semiconductors, RF, and systems integration.' },
          { kind: 'course', key: 'digital-fundamentals',
            differentiator: 'Binary, logic gates, and boolean algebra — the digital-logic prerequisite underneath analog/RF electronics.' },
          { kind: 'lab', key: 'logic-sim',
            differentiator: 'Gate-level circuit simulation — the hardware layer underneath the electronics course.' },
        ],
      },
      metrology: {
        label: 'Metrology',
        color: 'teal',
        items: [
          { kind: 'lab', key: 'cmm-lab',
            differentiator: 'Simulate a coordinate measuring machine — probe circles, planes, cylinders, and read a real GD&T report.' },
          { kind: 'lab', key: 'universal-calc',
            differentiator: 'Unit conversion and constants for the numbers a GD&T report actually needs.' },
        ],
      },
    },
  },

  'data-ai': {
    label: 'Data & AI',
    icon: '⟁',
    color: 'teal',
    subtopics: {
      'data-science': {
        label: 'Data Science',
        color: 'blue',
        items: [
          { kind: 'course', key: 'data-science',
            differentiator: 'Structured curriculum — computational methods for data analysis and scientific exploration, in order.' },
          { kind: 'lab', key: 'notebook-lab',
            differentiator: 'Real Python notebooks in the browser — the actual environment data science work happens in.' },
        ],
      },
      ai: {
        label: 'AI & Machine Learning',
        color: 'violet',
        items: [
          { kind: 'lab', key: 'ml-lab',
            differentiator: 'Start from Python basics and algebra — derive gradients, inspect real training, write NumPy, and evaluate a model against a baseline.' },
          { kind: 'course', key: 'ai-engineering',
            differentiator: 'Structured curriculum — machine learning, LLMs, and AI systems from foundations to deployment.' },
          { kind: 'lab', key: 'notebook-lab',
            differentiator: 'Run real ML code in a notebook — the same format most model training actually happens in.' },
        ],
      },
      sql: {
        label: 'SQL',
        color: 'sky',
        items: [
          { kind: 'course', key: 'sql',
            differentiator: 'Structured curriculum — SQL mastery from zero to advanced queries and Python integration.' },
        ],
      },
      nosql: {
        label: 'NoSQL',
        color: 'emerald',
        items: [
          { kind: 'course', key: 'nosql',
            differentiator: 'Structured curriculum — NoSQL database systems and document-oriented data design.' },
        ],
      },
    },
  },

  creative: {
    label: 'Creative',
    icon: '∇',
    color: 'pink',
    subtopics: {
      design: {
        label: 'Design',
        color: 'pink',
        items: [
          { kind: 'course', key: 'design',
            differentiator: 'Structured curriculum — interface design systems, typography, and visual hierarchy.' },
        ],
      },
      music: {
        label: 'Music',
        color: 'indigo',
        items: [
          { kind: 'lab', key: 'music-lab',
            differentiator: 'Beat machine meets DAW — sequencer, synth, FX chain, mixer, and piano roll, powered by Tone.js.' },
        ],
      },
      'vector-graphics': {
        label: 'SVG & Vector Graphics',
        color: 'amber',
        items: [
          { kind: 'lab', key: 'svg-studio',
            differentiator: 'Freehand pencil, shape tools, layers, and SVG/PNG export — a real drawing tool, not just a code panel.' },
        ],
      },
      'game-dev': {
        label: 'Game Development',
        color: 'purple',
        items: [
          { kind: 'course', key: 'tetris',
            differentiator: 'Build Tetris from scratch — game loop, collision, and polish, structured as a course.' },
        ],
      },
      'creative-tools': {
        label: 'Build Your Own Tools',
        color: 'teal',
        items: [
          { kind: 'lab', key: 'lesson-builder',
            differentiator: 'Build and preview interactive lessons yourself — code cells, prose, visualizations, checkpoints.' },
          { kind: 'lab', key: 'viz-builder',
            differentiator: 'Build custom data visualizations and interactive diagrams for lessons and labs.' },
        ],
      },
    },
  },

  general: {
    label: 'General & Multi-Subject',
    icon: '✦',
    color: 'slate',
    subtopics: {
      'arcade-practice': {
        label: 'Arcade & Practice',
        color: 'rose',
        items: [
          { kind: 'game', key: 'arkanoid',
            differentiator: "Break bricks by answering math questions — general practice, not tied to one subject." },
          { kind: 'game', key: 'stem-quest',
            differentiator: 'An adventure map packed with challenges pulled from every subject at once.' },
        ],
      },
    },
  },
}

// Explicit placements for additions; registry completion below also protects
// future entries until their author chooses a more specific subject.
const additions = [
  ['programming', 'cpp', 'course', 'cpp-from-scratch'],
  ['programming', 'cpp', 'course', 'cpp-patterns'],
  ['computer-science', 'dsa', 'course', 'cpp-dsa'],
  ['programming', 'python', 'course', 'guttag-python'],
  ['programming', 'python', 'course', 'pyside6'],
  ['programming', 'web-development', 'course', 'css-masterclass'],
  ['programming', 'web-development', 'course', 'css-masterclass-advanced'],
  ['programming', 'web-development', 'lab', 'resource-lab'],
  ['programming', 'web-development', 'lab', 'code-typing'],
  ['data-ai', 'ai', 'course', 'machine-learning'],
  ['computer-science', 'runtime', 'course', 'native-languages'],
  ['computer-science', 'runtime', 'lab', 'little-schemer'],
  ['creative', 'creative-tools', 'lab', 'canvas-notes'],
  ['creative', 'creative-tools', 'lab', 'project-studio'],
  ['creative', 'game-dev', 'lab', 'sprite-forge'],
  ['creative', 'game-dev', 'lab', 'tile-mapper'],
]
for (const [topic, subtopic, kind, key] of additions) {
  const items = CURATED_TOPICS[topic].subtopics[subtopic].items
  if (!items.some(i => i.kind === kind && i.key === key)) items.push({ kind, key })
}

const registries = { course: getAllCourses(), lab: LABS, game: GAMES }
export const TOPICS = completeTopics(CURATED_TOPICS, registries)
TOPICS.all = {
  label: 'All content', icon: '▦', color: 'indigo',
  subtopics: Object.fromEntries([
    ['everything', 'Everything', Object.entries(registries).flatMap(([kind, items]) => items.map(i => ({ kind, key: i.key })))],
    ...Object.entries(registries).map(([kind, items]) => [kind, kind === 'course' ? 'Courses' : kind === 'lab' ? 'Labs & tools' : 'Games', items.map(i => ({ kind, key: i.key }))]),
  ].map(([id, label, items]) => [id, { label, color: 'indigo', items }])),
}

export const TOPIC_ORDER = [
  'all', 'mathematics', 'science', 'programming', 'computer-science',
  'engineering', 'data-ai', 'creative', 'general',
]

export function getTopic(topicId) {
  return TOPICS[topicId] ?? null
}

export function getSubtopicGroup(topicId, subtopicId) {
  const topic = TOPICS[topicId]
  const subtopic = topic?.subtopics?.[subtopicId]
  return subtopic ? { label: subtopic.label, items: subtopic.items } : null
}

export function firstSubtopicId(topicId) {
  const topic = TOPICS[topicId]
  return topic ? Object.keys(topic.subtopics)[0] ?? null : null
}

// Every course/lab/game, undifferentiated — used for global search, which
// deliberately bypasses the topic/subtopic filter entirely (a filter that
// only searches its own bucket defeats the point of a search box: you
// should be able to find "Drone Lab" by name even while looking at Physics).
// No `differentiator` field — TopicTable falls back to each item's own
// real description when one isn't provided.
export const ALL_ITEMS = [
  ...getAllCourses().map(c => ({ kind: 'course', key: c.key })),
  ...LABS.map(l => ({ kind: 'lab', key: l.key })),
  ...GAMES.map(g => ({ kind: 'game', key: g.key })),
]
