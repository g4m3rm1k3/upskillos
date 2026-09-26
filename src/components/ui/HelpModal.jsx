// HelpModal.jsx — Interactive contributor tutorial system
// A full in-app documentation site for contributors of all skill levels.
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTour } from "../../context/TourContext.jsx";
import {
  X,
  Download,
  BookOpen,
  Code2,
  Terminal,
  Layers,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Check,
  MousePointer,
  Play,
  FileText,
  Lightbulb,
  GraduationCap,
  Zap,
  Info,
  Eye,
  CheckSquare,
  Bot,
  ClipboardCopy,
  Wrench,
  RotateCcw,
  RefreshCw,
  Heart,
  Shield,
  Github,
  Bug,
} from "lucide-react";
import ReportBugButton from "./ReportBugButton.jsx";
import SuggestionBoxButton from "./SuggestionBoxButton.jsx";
import { useFeedbackBoard } from "../../hooks/useFeedbackBoard.js";
import { buildLessonPrompt, BUG_LESSON_CONTRACT } from "../../utils/lessonPrompt.js";
import { useDesktop } from "../desktop/DesktopProvider.jsx";
import { getLabEntry } from "../../labs/labLoader.js";

// ─── TEMPLATE STRINGS ────────────────────────────────────────────────────────

const TPL_MATH = `// math-lesson-template.js
// ================================================================
// MATH / CALCULUS LESSON TEMPLATE  —  open-calc
// ================================================================
// Lines starting with // are INSTRUCTIONS. Delete when done.
// ================================================================

export default {

  // ── IDENTITY (REQUIRED) ─────────────────────────────────────
  id: 'ch1-your-topic',
  //  ^ Unique label. Format: ch{N}-topic-name
  //    Example: 'ch0-real-numbers'   'ch3-chain-rule'
  //    IMPORTANT: Must be unique — no two lessons share one.

  slug: 'your-topic',
  //   ^ Appears in the URL: /chapter/1/your-topic

  chapter: 1,
  //       ^ Chapter NUMBER. Must match chapter file exactly.

  order: 0,
  //     ^ Position in chapter list (0 = first).

  title: 'Your Lesson Title',
  subtitle: 'One sentence describing what this teaches.',
  tags: ['keyword1', 'keyword2'],

  // ── HOOK ────────────────────────────────────────────────────
  hook: {
    question: 'What question does this lesson answer?',
    realWorldContext: 'One or two sentences of real-world motivation.',
  },

  // ── INTUITION ───────────────────────────────────────────────
  intuition: {
    text: \`
Write your explanation here.

Formatting: **bold** *italic* \\\`code\\\` $f(x)$ inline math $display math$

Tip: Explain the concept as if talking to a curious 16-year-old.
Don't introduce the formula yet — build the IDEA first.
    \`,

    visualizations: [
      // { id: 'ComponentName', props: {} }
      // Common: PythonNotebook, JSNotebook, RiemannSum, UnitCircle
    ],
  },

  // ── FORMAL MATH (optional) ──────────────────────────────────
  math: {
    definition: 'Formal statement. LaTeX: $f\'(x) = \\\\lim_{h \\\\to 0} \\\\frac{f(x+h)-f(x)}{h}$',
    examples: [
      {
        problem:  'Find the derivative of $f(x) = x^2$.',
        solution: 'Using the power rule: $f\'(x) = 2x$.',
      },
    ],
  },

  // ── UNDERSTANDING CHECK (ungraded) ───────────────────────────
  assessment: {
    questions: [
      {
        question: 'In your own words, what does this concept mean?',
        answer:   'Expected answer here.',
        hint:     'Think about... (a nudge toward the answer)',
      },
    ],
  },

  // ── SCORED QUIZ ──────────────────────────────────────────────
  quiz: {
    questions: [
      {
        question: 'What is the derivative of $x^3$?',
        answer:   '$3x^2$',
        hints: [
          'Try the power rule.',
          'Multiply by the exponent, then reduce it by 1.',
        ],
      },
    ],
  },

}
`;

const TPL_PYTHON = `// python-lesson-template.js
// ================================================================
// PYTHON / CODING LESSON TEMPLATE  —  open-calc
// ================================================================

export default {
  id: 'py1-your-topic',
  slug: 'your-topic',
  chapter: 1,
  order: 0,
  title: 'Your Python Lesson Title',
  subtitle: 'What will students build or learn to do?',
  tags: ['python', 'your-topic'],

  hook: {
    question: 'What will students be able to do by the end of this?',
    realWorldContext: 'Why is this Python skill useful in the real world?',
  },

  intuition: {
    text: \`
Explain the concept here — BEFORE any code.

What is the big idea? What problem are we solving?
Then the notebook below lets students try it themselves.
    \`,
    visualizations: [
      // PythonNotebook adds an interactive Python editor right here.
      { id: 'PythonNotebook', props: {} },
    ],
  },

  assessment: {
    questions: [
      {
        question: 'What does this code print?  print(2 ** 10)',
        answer: '1024',
        hint: '** is the Python exponentiation operator.',
      },
    ],
  },

  quiz: {
    questions: [
      {
        question: 'How do you define a function in Python?',
        answer: 'Use: def function_name(parameters): then indent the body.',
        hints: ['Start with the keyword: def', 'def add(a, b): return a + b'],
      },
    ],
  },
}
`;

const TPL_PROOF = `// proof-lesson-template.js
// ================================================================
// PROOF / GEOMETRY LESSON TEMPLATE  —  open-calc
// ================================================================

export default {
  id: 'geo1-your-proof',
  slug: 'your-proof',
  chapter: 1,
  order: 0,
  title: 'Your Theorem Name',
  subtitle: 'What surprising result does this prove?',
  tags: ['proof', 'geometry', 'theorem'],

  hook: {
    question: 'What surprising or useful result are we about to prove?',
    realWorldContext: 'Where is this theorem used in the real world?',
  },

  intuition: {
    text: \`
Before the proof, explain WHY this result should be true.

Draw a picture in words. Walk the student through the
geometric or intuitive argument first.
    \`,
    visualizations: [],
  },

  math: {
    definition: \`
**Theorem:** State the theorem formally here.

**Given:** What we are starting with (the hypothesis).

**Prove:** What we need to show (the conclusion).
    \`,
    examples: [],
  },

  rigor: {
    text: \`
**Proof:**

**Step 1:** First step.
*Justification: why this step is valid.*

**Step 2:** Second step. ...

**Therefore:** Final conclusion. $\\\\square$
    \`,
    examples: [],
  },

  assessment: {
    questions: [
      {
        question: 'Can you state the theorem in your own words?',
        answer: 'Student should describe the core result in plain language.',
        hint: 'Focus on what the theorem guarantees, not the proof steps.',
      },
    ],
  },
}
`;

const TPL_VIZ = `// MyVizComponent.jsx
// ================================================================
// VIZ COMPONENT (prose + toggles)  —  open-calc
// ================================================================

import { useState, useEffect } from 'react'
import { useThemeColors } from '../../../hooks/useThemeColors'
// ── COLORS HOOK: shared across every viz — import it, don't copy it. ──
// (Adding a color? Edit src/hooks/useThemeColors.js once and every viz gets it.)

// IMPORTANT: Function name must EXACTLY match filename and VizFrame.jsx key.
export default function MyVizComponent({ params = {} }) {
  const C = useThemeColors()

  return (
    <div style={{ fontFamily: 'var(--font-sans)', padding: '.5rem 0', maxWidth: 740 }}>
      <div style={{ background: C.surface, border: \`1px solid \${C.border}\`, borderRadius: 12, padding: '16px 20px' }}>
        <p style={{ color: C.text, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          Replace this with your content.
        </p>
      </div>
    </div>
  )
}

// NEXT STEPS:
// 1. Register in VizFrame.jsx:
//    MyVizComponent: lazy(() => import('./react/MyVizComponent.jsx')),
// 2. Use in a lesson:
//    visualizations: [{ id: 'MyVizComponent', props: {} }]
`;

const TPL_CANVAS = `// MyCanvasViz.jsx
// ================================================================
// VIZ COMPONENT (HTML5 Canvas)  —  open-calc
// ================================================================

import { useState, useEffect, useRef } from 'react'
import { useThemeColors } from '../../../hooks/useThemeColors'
// ── COLORS HOOK: shared across every viz — import it, don't copy it. ──
// (Adding a color? Edit src/hooks/useThemeColors.js once and every viz gets it.)

function MyCanvas({ value, C }) {
  const canvasRef = useRef(null)  // PART A: named canvasRef (not ref or cvRef)
  const roRef     = useRef(null)  // PART B: ResizeObserver ref

  useEffect(() => {
    const draw = () => {
      const cv = canvasRef.current
      if (!cv) return

      // PART C: set dimensions INSIDE draw(), every time
      const canvasW = cv.offsetWidth || 500
      const canvasH = 300
      cv.width  = canvasW
      cv.height = canvasH

      const ctx = cv.getContext('2d')
      const pl = 50, pr = 20, pt = 20, pb = 40
      const iw = canvasW - pl - pr
      const canvasIH = canvasH - pt - pb  // NOTE: not 'ih' or 'H'

      const xMax = 10, yMax = 100
      const toX = v => pl + (v / xMax) * iw
      const toY = v => pt + canvasIH - (v / yMax) * canvasIH

      ctx.clearRect(0, 0, canvasW, canvasH)

      ctx.strokeStyle = C.blue
      ctx.lineWidth = 2.5
      ctx.beginPath()
      for (let x = 0; x <= xMax; x += 0.1) {
        const y = x * x
        if (x === 0) ctx.moveTo(toX(x), toY(y))
        else         ctx.lineTo(toX(x), toY(y))
      }
      ctx.stroke()

      const dotX = toX(value), dotY = toY(value * value)
      ctx.fillStyle = C.amber
      ctx.beginPath()
      ctx.arc(dotX, dotY, 6, 0, Math.PI * 2)
      ctx.fill()
    }

    draw()
    // PART D: observe parentElement (not the canvas itself!)
    roRef.current = new ResizeObserver(draw)
    roRef.current.observe(canvasRef.current.parentElement)
    // PART E: cleanup (prevents memory leak)
    return () => { roRef.current?.disconnect(); roRef.current = null }
  }, [value, C])  // ALL variables used in draw() must be in deps

  return <canvas ref={canvasRef} style={{ width: '100%', display: 'block', borderRadius: 8 }} />
}

export default function MyCanvasViz({ params = {} }) {
  const C = useThemeColors()
  const [value, setValue] = useState(5)

  return (
    <div style={{ fontFamily: 'var(--font-sans)', padding: '.5rem 0', maxWidth: 740 }}>
      <div style={{ background: C.surface, border: \`1px solid \${C.border}\`, borderRadius: 12, overflow: 'hidden' }}>
        <MyCanvas value={value} C={C} />
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: C.muted }}>Value</span>
        <input type="range" min={0} max={10} step={0.1} value={value}
          onChange={e => setValue(Number(e.target.value))} style={{ flex: 1 }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: C.text, minWidth: 32 }}>
          {value.toFixed(1)}
        </span>
      </div>
    </div>
  )
}
`;

// ─── DOWNLOAD HELPER ─────────────────────────────────────────────────────────
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── ZONE COLORS (full strings — Tailwind JIT safe) ──────────────────────────
const ZC = {
  blue: {
    active: "border-blue-400 bg-blue-50 dark:bg-blue-950/25",
    idle: "border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-700",
    label: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
    dot: "bg-blue-400",
  },
  amber: {
    active: "border-amber-400 bg-amber-50 dark:bg-amber-950/25",
    idle: "border-slate-200 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-700",
    label: "text-amber-600 dark:text-amber-400",
    badge:
      "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-400",
  },
  green: {
    active: "border-green-400 bg-green-50 dark:bg-green-950/25",
    idle: "border-slate-200 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-700",
    label: "text-green-600 dark:text-green-400",
    badge:
      "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
    dot: "bg-green-400",
  },
  teal: {
    active: "border-teal-400 bg-teal-50 dark:bg-teal-950/25",
    idle: "border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-700",
    label: "text-teal-600 dark:text-teal-400",
    badge: "bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300",
    dot: "bg-teal-400",
  },
  orange: {
    active: "border-orange-400 bg-orange-50 dark:bg-orange-950/25",
    idle: "border-slate-200 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-700",
    label: "text-orange-600 dark:text-orange-400",
    badge:
      "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300",
    dot: "bg-orange-400",
  },
};

// ─── LESSON ZONES ────────────────────────────────────────────────────────────
const LESSON_ZONES = [
  {
    id: "identity",
    color: "blue",
    label: "Identity",
    badge: "Required",
    explanation:
      "These 4 fields are required — without them the app can't find, display, or link to your lesson. They're simple: just short words and numbers.",
    tips: [
      "The id must be unique across the entire app — no two lessons share one.",
      "The slug appears in the URL — keep it short, lowercase, and hyphenated.",
      "The chapter number must exactly match the chapter file your lesson is inside.",
      "order controls where it appears in the chapter list (0 = first lesson).",
    ],
    code: `  id: 'ch1-derivatives',
  slug: 'derivatives',
  chapter: 1,
  order: 0,
  title: 'What is a Derivative?',
  subtitle: 'The instantaneous rate of change',
  tags: ['derivative', 'slope', 'rate'],`,
    renderMockup: () => (
      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Appears in the sidebar as:
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-700">
          <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-600 shrink-0" />
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
            What is a Derivative?
          </span>
        </div>
        <div className="text-[10px] text-slate-400 pl-1">
          URL: /chapter/1/derivatives
        </div>
      </div>
    ),
  },
  {
    id: "hook",
    color: "amber",
    label: "Hook",
    badge: "Recommended",
    explanation:
      "The very first thing a student sees. Its job is to create curiosity before you've taught anything. The best hooks describe a situation the student can picture and a question they'd genuinely want answered.",
    tips: [
      "Write the question as something a real person would wonder — not a textbook exercise.",
      "The realWorldContext should feel relevant: science, engineering, nature, or everyday life.",
      "If the hook doesn't make YOU curious, rewrite it until it does.",
    ],
    code: `  hook: {
    question: 'How fast is a car going at exactly
  2:14:37 PM — not over a time range, but
  at that precise instant?',
    realWorldContext: 'GPS systems calculate instantaneous
  velocity thousands of times per second using
  the same principle...',
  },`,
    renderMockup: () => (
      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1.5">
          Opening Question
        </div>
        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug mb-1.5">
          "How fast is a car going at exactly 2:14:37 PM?"
        </div>
        <div className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
          GPS systems calculate instantaneous velocity thousands of times per
          second...
        </div>
      </div>
    ),
  },
  {
    id: "intuition",
    color: "green",
    label: "Intuition",
    badge: "Recommended",
    explanation:
      "Your main lesson body — a prose explanation of the concept plus optional interactive visualizations. Write without formulas first. Build the mental model before the math.",
    tips: [
      "Explain as if talking to a smart non-expert. No jargon until they're ready for it.",
      "Add a visualization with { id: 'ComponentName', props: {} } in the visualizations array.",
      "Text supports **bold**, *italic*, `code`, and $LaTeX$ math.",
      "You can embed multiple visualizations — they appear in order.",
    ],
    code: `  intuition: {
    text: \`
Imagine zooming into a curve so far that it
looks like a straight line. The **derivative**
is the slope of that imaginary tiny line.

The closer you zoom, the more accurate the slope.
Zoom infinitely close: $f'(x)$.
    \`,
    visualizations: [
      { id: 'SecantToTangent', props: {} },
    ],
  },`,
    renderMockup: () => (
      <div className="space-y-2">
        <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          Imagine zooming into a curve so far that it looks like a straight
          line. The <strong>derivative</strong> is the slope of that imaginary
          tiny line...
        </div>
        <div className="h-14 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
          <span className="text-[11px] text-slate-400 italic">
            SecantToTangent visualization
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "math",
    color: "blue",
    label: "Formal Math",
    badge: "Optional",
    explanation:
      "The precise definition box and worked examples — shown AFTER the intuition section. Because students have context first, the formal definition lands much better.",
    tips: [
      "Write the definition with LaTeX: $f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}$",
      "Examples work best as a clear problem statement with step-by-step solution.",
      "Leave examples: [] if you only want a definition box with no worked examples.",
    ],
    code: `  math: {
    definition: \`The **derivative** $f'(x)$ is:
$f'(x) = \\\\lim_{h \\\\to 0} \\\\frac{f(x+h)-f(x)}{h}$\`,

    examples: [
      {
        problem:  'Find the derivative of $f(x) = x^2$.',
        solution: 'Power rule: $f\'(x) = 2x$.',
      },
    ],
  },`,
    renderMockup: () => (
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 p-3 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
          Definition
        </div>
        <div className="text-xs text-blue-900 dark:text-blue-200 font-mono">
          f′(x) = lim(h→0) [f(x+h)−f(x)] / h
        </div>
        <div className="border-t border-blue-200 dark:border-blue-800 pt-2">
          <div className="text-[10px] font-bold text-blue-500 mb-0.5">
            Example
          </div>
          <div className="text-[11px] text-blue-800 dark:text-blue-300">
            Find derivative of x² → 2x
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "assessment",
    color: "teal",
    label: "Understanding Check",
    badge: "Optional",
    explanation:
      "Ungraded reflection questions shown in teal. No score, no pressure. Students type an answer and then see the model answer. Great for consolidating understanding before the scored quiz.",
    tips: [
      'Use this for open-ended "explain in your own words" questions.',
      "Each question has one hint: field — a single string with one nudge.",
      "Students see the model answer after they submit.",
    ],
    code: `  assessment: {
    questions: [
      {
        question: 'In your own words: what does the
  derivative of a function tell you?',
        answer: 'The instantaneous rate of change —
  how fast the output is changing at one point.',
        hint: 'Think about the slope of the tangent
  line at a single point.',
      },
    ],
  },`,
    renderMockup: () => (
      <div className="rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-700 p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-teal-500 mb-1.5">
          Understanding Check
        </div>
        <div className="text-xs text-teal-800 dark:text-teal-200 mb-2">
          In your own words: what does the derivative tell you?
        </div>
        <div className="h-6 rounded bg-white/60 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-700 flex items-center px-2">
          <span className="text-[10px] text-teal-400">Type your answer...</span>
        </div>
      </div>
    ),
  },
  {
    id: "quiz",
    color: "orange",
    label: "Scored Quiz",
    badge: "Optional",
    explanation:
      "The scored quiz shown in orange. Answering at least 80% correctly marks the lesson complete with a star (★) in the sidebar. Each question can have up to 3 hints that reveal one at a time.",
    tips: [
      "Write questions with a single definitive correct answer.",
      "Hints are an array — they reveal one at a time as the student needs help.",
      "The quiz result (★ master / partial / needs review) appears in the sidebar permanently.",
    ],
    code: `  quiz: {
    questions: [
      {
        question: 'What is the derivative of $f(x) = x^3$?',
        answer: '$3x^2$',
        hints: [
          'Use the power rule.',
          'Multiply the exponent by the coefficient,
  then reduce the exponent by 1.',
        ],
      },
    ],
  },`,
    renderMockup: () => (
      <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-700 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-orange-500">
            Lesson Quiz
          </div>
          <span className="text-[10px] text-orange-400">
            ★ earn completion at ≥80%
          </span>
        </div>
        <div className="text-xs text-orange-800 dark:text-orange-200 mb-1.5">
          What is the derivative of f(x) = x³?
        </div>
        <div className="flex gap-1 flex-wrap">
          {["3x²", "3x³", "x²", "2x"].map((o) => (
            <span
              key={o}
              className="text-[10px] px-2 py-0.5 rounded bg-white/60 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300"
            >
              {o}
            </span>
          ))}
        </div>
      </div>
    ),
  },
];

// ─── SHARED PRIMITIVES ───────────────────────────────────────────────────────

function Cb({ children }) {
  return (
    <code className="font-mono text-[12px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
      {children}
    </code>
  );
}
function CodeBlock({ children }) {
  return (
    <pre className="text-[12px] font-mono bg-slate-900 dark:bg-slate-950 text-slate-200 rounded-xl p-4 overflow-x-auto leading-relaxed border border-slate-700 my-3">
      {children}
    </pre>
  );
}
function Note({ children, color = "blue" }) {
  const s = {
    blue: "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300",
    amber:
      "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300",
    green:
      "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300",
    red: "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300",
  };
  return (
    <div
      className={`text-[12px] border-l-2 rounded-r-xl px-3 py-2.5 mb-3 leading-relaxed ${s[color]}`}
    >
      {children}
    </div>
  );
}
function SectionHeading({ children, sub }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
        {children}
      </h2>
      {sub && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{sub}</p>
      )}
    </div>
  );
}
function H2({ children }) {
  return (
    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-3">
      {children}
    </h2>
  );
}
function H3({ children }) {
  return (
    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-6 mb-2">
      {children}
    </h3>
  );
}
function Para({ children }) {
  return (
    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
      {children}
    </p>
  );
}

// ─── DOWNLOAD CARD ───────────────────────────────────────────────────────────

function DownloadCard({ icon, title, filename, desc, template }) {
  const [done, setDone] = useState(false);
  const handle = () => {
    downloadFile(filename, template);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:shadow-md dark:hover:shadow-slate-900/60 transition-shadow mb-3">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start gap-2 mb-1">
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {title}
          </span>
          <code className="text-[11px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            {filename}
          </code>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
          {desc}
        </p>
        <button
          onClick={handle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${done ? "bg-emerald-500 text-white" : "bg-brand-600 hover:bg-brand-700 text-white"}`}
        >
          {done ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {done ? "Downloaded!" : `Download ${filename}`}
        </button>
      </div>
    </div>
  );
}

// ─── STEP WIZARD ─────────────────────────────────────────────────────────────

function StepWizard({ steps }) {
  const [step, setStep] = useState(0);
  const cur = steps[step];
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            title={s.title}
            className={`shrink-0 rounded-full transition-all ${i === step ? "w-7 h-2.5 bg-brand-500" : i < step ? "w-2.5 h-2.5 bg-brand-300 dark:bg-brand-700" : "w-2.5 h-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300"}`}
          />
        ))}
        <span className="text-[11px] text-slate-400 ml-1 shrink-0">
          Step {step + 1} / {steps.length}
        </span>
      </div>

      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-9 h-9 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
            {step + 1}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {cur.title}
            </h3>
            {cur.sub && (
              <p className="text-xs text-slate-400 mt-0.5">{cur.sub}</p>
            )}
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
          {cur.desc}
        </p>
        {cur.note && <Note color={cur.noteColor ?? "amber"}>{cur.note}</Note>}
        {cur.code && <CodeBlock>{cur.code}</CodeBlock>}
        {cur.bullets && (
          <ul className="space-y-1.5 mb-4">
            {cur.bullets.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
              >
                <ChevronRight className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        {cur.download && (
          <button
            onClick={() =>
              downloadFile(cur.download.filename, cur.download.content)
            }
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors mt-2"
          >
            <Download className="w-4 h-4" /> Download {cur.download.filename}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>
        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="flex items-center gap-1.5 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
            <Check className="w-4 h-4" /> You're ready!
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HOVERABLE LESSON PREVIEW ────────────────────────────────────────────────

function HoverLessonPreview() {
  const [active, setActive] = useState(null);
  const zone = LESSON_ZONES.find((z) => z.id === active);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-5">
      <div className="space-y-2">
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-3">
          <MousePointer className="w-3.5 h-3.5" />
          What students see — hover a section
        </p>
        {LESSON_ZONES.map((z) => {
          const c = ZC[z.color];
          const isActive = active === z.id;
          return (
            <div
              key={z.id}
              onMouseEnter={() => setActive(z.id)}
              onMouseLeave={() => setActive(null)}
              className={`cursor-pointer rounded-xl border-2 p-3.5 transition-all duration-150 ${isActive ? c.active : c.idle}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${c.label}`}
                >
                  {z.label}
                </span>
                <span
                  className={`ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${c.badge}`}
                >
                  {z.badge}
                </span>
              </div>
              {z.renderMockup()}
            </div>
          );
        })}
      </div>

      <div>
        {zone ? (
          <div className="sticky top-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-base font-bold ${ZC[zone.color].label}`}>
                {zone.label}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${ZC[zone.color].badge}`}
              >
                {zone.badge}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
              {zone.explanation}
            </p>
            <CodeBlock>{zone.code}</CodeBlock>
            <ul className="space-y-2 mt-3">
              {zone.tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="hidden md:flex h-full min-h-[280px] items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="text-center py-8">
              <MousePointer className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                Hover any section
              </p>
              <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
                See the code that creates it
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SECTION: FEEDBACK & BUGS ─────────────────────────────────────────────────

function feedbackTimeAgo(ts) {
  if (!ts?.toDate) return ''
  const diffMs = Date.now() - ts.toDate().getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return ts.toDate().toLocaleDateString()
}

function FeedbackRow({ item, onOpenPrompt }) {
  const isBug = item.kind === 'bug'

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 mb-2.5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {isBug ? (
            <Bug className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          ) : (
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          )}
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug truncate">
            {item.title}
          </h4>
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          {item.status === 'closed' ? 'Closed' : 'Open'}
        </span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap mb-2">
        {item.description}
      </p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          {item.displayName || 'Anonymous'} · {feedbackTimeAgo(item.createdAt)}
        </p>
        <button
          onClick={() => onOpenPrompt(item)}
          className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title="Get a prompt for an AI coding agent to turn this into a lesson"
        >
          <Bot className="w-3 h-3" />
          Lesson Prompt
        </button>
      </div>
    </div>
  )
}

function LessonPromptModal({ item, onClose }) {
  const [downloaded, setDownloaded] = useState(false)
  if (!item) return null

  const handleDownload = () => {
    const prefix = item.kind === 'suggestion' ? 'suggestion' : 'bug'
    downloadFile(`${prefix}-${item.id}-lesson-prompt.md`, buildLessonPrompt(item))
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-[0_16px_64px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-white/10 bg-gradient-to-r from-brand-50/80 to-white/80 dark:from-brand-500/10 dark:to-slate-900/40">
          <div className="bg-brand-500/20 p-1.5 rounded-lg shrink-0">
            <Bot className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <h2 className="flex-1 text-sm font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase">
            Lesson Prompt
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
            for: {item.title}
          </p>

          <H3>What this is</H3>
          <Para>
            A text file that turns{' '}
            {item.kind === 'suggestion' ? 'this idea' : 'this bug'} into a{' '}
            <strong>lesson</strong> — not a fix, not a feature PR — with an
            AI's help. Built for a <strong>free</strong> chat AI (ChatGPT,
            Claude.ai), not a paid coding agent — no repo access or tools
            required on the AI's side, just you copying files back and
            forth.
          </Para>

          <H3>Why it exists</H3>
          <Para>
            UpSkillOS teaches by showing real work. Every bug and every
            feature idea is real material for the{' '}
            <strong>How to Contribute</strong> lessons — this turns the
            app's own maintenance into content instead of throwing it away
            once it's fixed.
          </Para>

          <Note color="amber">
            <strong>Do the "How to Contribute" lessons first</strong> if you
            haven't — this only works if you can find your way around an
            unfamiliar file and know basic Git. The prompt says so too, but
            it's worth knowing before you start.
          </Note>

          <H3>How to use it</H3>
          <ol className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed list-decimal list-inside space-y-1 mb-3">
            <li>Download the file below.</li>
            <li>Paste its full contents into any free AI chat.</li>
            <li>It'll ask for the real code it needs — that part is brief.</li>
            <li>Then it teaches: what each piece is, why it exists, how it connects — the actual contract, not a summary.</li>
            <li>Review the lesson it writes, then open a PR.</li>
          </ol>

          <button
            onClick={handleDownload}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${downloaded ? 'bg-emerald-500 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white'}`}
          >
            {downloaded ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            {downloaded ? 'Downloaded!' : 'Download Lesson Prompt'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionFeedback() {
  const { open, closed } = useFeedbackBoard()
  const [tab, setTab] = useState('open')
  const [promptItem, setPromptItem] = useState(null)
  const items = tab === 'open' ? open : closed
  const { openWindow } = useDesktop()

  // Opens the same way every lab does from the Start Menu — a floating
  // window over the desktop, not a route change. A plain <a href="#/lab/...">
  // here would navigate the whole app away from wherever the learner was,
  // with no way back except guessing. This keeps them exactly where they were.
  const openContributorLessons = async () => {
    const entry = await getLabEntry('lesson-engine')
    if (entry?.component) {
      openWindow({ id: 'lesson-engine', label: 'Lesson Engine', emoji: '📖', Component: entry.component, backTo: '/' })
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500 leading-tight mb-2 flex items-center gap-3">
          <Bug className="w-8 h-8 text-rose-500" />
          Feedback & Bugs
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Found a bug, have an idea, or want to fix something yourself?
        </p>
      </div>

      <Para>
        Every bug and idea reported here is public — anyone can see what's
        been flagged and what's already been dealt with, signed in or not.
        Filing one takes an account; browsing doesn't.
      </Para>

      <div className="flex flex-wrap gap-3 my-5">
        <ReportBugButton />
        <SuggestionBoxButton />
      </div>

      <Note color="blue">
        <strong>Want to fix it yourself instead?</strong> The{' '}
        <strong>How to Contribute</strong> lessons cover Markdown, Git,
        branches &amp; PRs, reading unfamiliar code, and making your first
        pull request — no prior experience assumed.{' '}
        <button onClick={openContributorLessons} className="font-bold underline">
          → Open the lessons
        </button>
        {' · '}
        <button
          onClick={() => downloadFile('BUG_LESSON_CONTRACT.md', BUG_LESSON_CONTRACT)}
          className="font-bold underline"
          title="The teaching contract itself, on its own — no specific bug or suggestion attached"
        >
          → Download the contract
        </button>
      </Note>

      <H3>What's been reported</H3>

      <div className="flex gap-2 mb-4">
        {[
          { id: 'open', label: 'Open' },
          { id: 'closed', label: 'Closed' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
              tab === t.id
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {items === null && (
        <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
      )}
      {items !== null && items.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">
          {tab === 'open' ? 'Nothing open right now.' : 'Nothing closed yet.'}
        </p>
      )}
      {items?.map(item => (
        <FeedbackRow key={`${item.kind}-${item.id}`} item={item} onOpenPrompt={setPromptItem} />
      ))}

      <LessonPromptModal item={promptItem} onClose={() => setPromptItem(null)} />
    </div>
  )
}

// ─── SECTION: OVERVIEW ───────────────────────────────────────────────────────

function SectionOverview({ onNavigate }) {
  return (
    <div>
      <SectionHeading sub="Two paths to contribute — pick the one that fits.">
        How to Contribute
      </SectionHeading>
      <Para>
        UpSkillOS is an open-source interactive STEM learning platform. Every
        topic is a <strong>lesson</strong>. Lessons are grouped into{" "}
        <strong>chapters</strong>. There are three tools for building content:
      </Para>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
        <div className="p-5 rounded-2xl border-2 border-amber-400/50 bg-amber-50/60 dark:bg-amber-950/20">
          <div className="text-2xl mb-2">🔨</div>
          <div className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">
            Lesson Builder
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed mb-3">
            Visual editor built into the app. Add cells, preview instantly, no
            setup needed.
          </div>
          <Link
            to="/lesson-builder"
            onClick={onNavigate}
            className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline"
          >
            → Open Lesson Builder
          </Link>
        </div>
        <div className="p-5 rounded-2xl border-2 border-sky-400/50 bg-sky-50/60 dark:bg-sky-950/20">
          <div className="text-2xl mb-2">🔭</div>
          <div className="text-sm font-bold text-sky-800 dark:text-sky-300 mb-1">
            Viz Builder
          </div>
          <div className="text-xs text-sky-700 dark:text-sky-400 leading-relaxed mb-3">
            Build interactive visualizations and diagrams. Export directly into
            any lesson.
          </div>
          <Link
            to="/viz-builder"
            onClick={onNavigate}
            className="text-xs font-bold text-sky-700 dark:text-sky-300 hover:underline"
          >
            → Open Viz Builder
          </Link>
        </div>
        <div className="p-5 rounded-2xl border-2 border-slate-300/50 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
          <div className="text-2xl mb-2">💻</div>
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
            Code Editor (Git)
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
            Clone the repo, edit <Cb>.js</Cb> files directly, run{" "}
            <Cb>npm run dev</Cb> to preview. Full control, all lesson types.
          </div>
          <a
            href="https://github.com/g4m3rm1k3/upskillos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline"
          >
            → GitHub Repo
          </a>
        </div>
      </div>

      <Note color="green">
        <strong>New contributor?</strong> Start with the{" "}
        <strong>Lesson Builder</strong> — head to{" "}
        <strong>Your First Lesson</strong> in the sidebar for a step-by-step
        walkthrough.
      </Note>

      <H3>How lessons become content</H3>
      <div className="flex flex-wrap items-center gap-2 my-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        {[
          {
            icon: "🔨",
            label: "Build in Lesson Builder",
            cls: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40",
          },
          null,
          {
            icon: "📤",
            label: "Export as .js file",
            cls: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",
          },
          null,
          {
            icon: "🔀",
            label: "Submit a PR",
            cls: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40",
          },
          null,
          {
            icon: "🎓",
            label: "Students learn!",
            cls: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40",
          },
        ].map((item, i) =>
          item === null ? (
            <ArrowRight
              key={i}
              className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0"
            />
          ) : (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl ${item.cls}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-xs font-semibold">{item.label}</span>
            </div>
          ),
        )}
      </div>

      <H3>Community</H3>
      <div className="flex flex-wrap gap-3 mt-3">
        <a
          href="https://discord.gg/epd2kYBDVt"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-sm font-semibold hover:bg-sky-100 dark:hover:bg-sky-950/50 transition-colors"
        >
          🎮 Join Discord
        </a>

        <a
          href="https://github.com/g4m3rm1k3/upskillos"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          ⭐ GitHub
        </a>
      </div>
    </div>
  );
}

// ─── SECTION: FIRST LESSON ───────────────────────────────────────────────────

const FIRST_LESSON_STEPS = [
  {
    title: "Open the Lesson Builder",
    desc: "Click the Start Menu (^ logo, top-left) and choose 'Lesson Builder' — or navigate directly to /lesson-builder. No setup, no install.",
    note: "The Lesson Builder works entirely in your browser. You can build and preview a complete lesson without touching any code.",
    bullets: [
      "Start Menu → Lesson Builder",
      "Or navigate to /lesson-builder in the URL bar",
      "The page opens with a blank lesson ready to fill in",
    ],
  },
  {
    title: "Set your lesson title and subtitle",
    desc: "At the top of the builder, click the title field and type your lesson title. Add a subtitle — one sentence describing what the lesson teaches.",
    note: "The title and subtitle are the first thing students see. Make the title a clear concept name, and the subtitle an active description: 'The instantaneous rate of change', not just 'Derivatives'.",
  },
  {
    title: "Add a Markdown cell for your explanation",
    desc: "Click '+ Add Cell' and choose Markdown. This is your main lesson body. Write the intuitive explanation here — prose, LaTeX math, and formatted text.",
    code: `Write plain text and use:
**bold**   *italic*   \`code\`

Inline math:   $f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}$

Display math:
$$\\int_0^1 x^2 \\, dx = \\frac{1}{3}$$`,
    note: "Not sure how to write a formula? Click the '∫≈ Visual Math…' button in the toolbar to open the visual equation editor — draw or type the formula and it inserts the LaTeX for you.",
    noteColor: "green",
  },
  {
    title: "Add a Quiz cell",
    desc: "Click '+ Add Cell' → Quiz. Add 3–5 questions. Each question has an answer and optional hints (revealed one at a time). Getting ≥80% marks the lesson complete with a ★.",
    code: `Question: What is the derivative of $f(x) = x^3$?
Answer:   $3x^2$
Hint 1:   Use the power rule.
Hint 2:   Multiply the exponent by the coefficient, reduce exponent by 1.`,
    note: "Write questions with a single definitive correct answer. Open-ended reflection questions belong in an Assessment cell (no score, students see model answer).",
    noteColor: "blue",
  },
  {
    title: "Add a Viz cell (optional)",
    desc: "Click '+ Add Cell' → Viz to embed any registered interactive visualization. Type the visualization ID exactly as it appears in the registry.",
    code: `Common IDs:
SecantToTangent     RiemannSum
UnitCircle          PythonNotebook
JSNotebook          ParametricCurve3D`,
    note: "The full list of available IDs is in the 'Using Vizs' section of this guide. IDs are case-sensitive.",
    noteColor: "amber",
  },
  {
    title: "Preview your lesson",
    desc: "Click the eye icon (👁) or the 'Preview' button in the toolbar to see exactly how your lesson will look to students. The preview updates live as you edit.",
    bullets: [
      "LaTeX math renders correctly in preview",
      "Quiz questions are interactive",
      "Any embedded viz loads live",
      "Scroll through to check the full layout",
    ],
  },
  {
    title: "Export and submit a PR",
    desc: "Click 'Export' to download the lesson as a .js file. Then create a GitHub pull request to add it to the right chapter folder in the repository.",
    code: `// Destination path pattern:
src/courses/{subject}/{chapter-folder}/{order}-{topic}.js

// Example:
src/courses/calculus/2-derivatives/005-chain-rule.js`,
    note: "Fork the repo first if you don't have write access. Ask in Discord if you're unsure which folder your lesson belongs in.",
    noteColor: "green",
    bullets: [
      "Open a PR on GitHub — maintainers review and merge",
      "Your lesson appears in the app for all students",
      "Join Discord to announce it to the community",
    ],
  },
];

function SectionFirstLesson() {
  return (
    <div>
      <SectionHeading sub="From blank page to live lesson — using the Lesson Builder.">
        Your First Lesson
      </SectionHeading>
      <Para>
        Follow these steps. By the end you'll have a complete lesson built in
        the app and ready to submit. No code required — just write content.
      </Para>
      <StepWizard steps={FIRST_LESSON_STEPS} />
    </div>
  );
}

// ─── SECTION: CELL TYPES ─────────────────────────────────────────────────────

function SectionAnatomy() {
  return (
    <div>
      <SectionHeading sub="Every lesson is made of cells — pick the right type for each block of content.">
        Cell Types
      </SectionHeading>
      <Para>
        The Lesson Builder composes lessons from cells. Each cell type renders
        differently for students. Add cells in any order — the lesson renders
        top-to-bottom.
      </Para>

      <div className="space-y-4 my-4">
        {[
          {
            icon: "📝",
            label: "Markdown",
            color: "border-blue-300/60 bg-blue-50/50 dark:bg-blue-950/20",
            badge: "text-blue-600 dark:text-blue-400",
            points: [
              "Prose, headings, bold, italic, inline code",
              "Inline math: $f(x)$    Display math: $$\\int$$",
              "Use '∫≈ Visual Math…' toolbar button for WYSIWYG LaTeX",
              "Renders markdown + KaTeX — no HTML needed",
            ],
          },
          {
            icon: "❓",
            label: "Quiz (scored)",
            color: "border-orange-300/60 bg-orange-50/50 dark:bg-orange-950/20",
            badge: "text-orange-600 dark:text-orange-400",
            points: [
              "≥80% earns ★ completion — shown permanently in sidebar",
              "Each question: answer + up to 3 hints (revealed one at a time)",
              "Best for: clear right/wrong questions",
              "Supports LaTeX in both question and answer",
            ],
          },
          {
            icon: "💭",
            label: "Assessment (unscored)",
            color: "border-teal-300/60 bg-teal-50/50 dark:bg-teal-950/20",
            badge: "text-teal-600 dark:text-teal-400",
            points: [
              "No score — zero pressure, open-ended reflection",
              "Students type an answer and then see the model answer",
              "One hint per question (a single nudge, not an array)",
              "Best for: 'explain in your own words' questions",
            ],
          },
          {
            icon: "📊",
            label: "Viz",
            color: "border-violet-300/60 bg-violet-50/50 dark:bg-violet-950/20",
            badge: "text-violet-600 dark:text-violet-400",
            points: [
              "Embeds any registered interactive visualization by ID",
              "ID must exactly match the VIZ_REGISTRY key (case-sensitive)",
              "Pass props to configure the viz: { id: 'RiemannSum', props: { defaultN: 10 } }",
              "Full list in the 'Using Vizs' section",
            ],
          },
          {
            icon: "💻",
            label: "Code (Python / JS)",
            color:
              "border-emerald-300/60 bg-emerald-50/50 dark:bg-emerald-950/20",
            badge: "text-emerald-600 dark:text-emerald-400",
            points: [
              "PythonNotebook: Pyodide, opencalc charts, Shift+Enter to run",
              "JSNotebook: live HTML/CSS output, Monaco editor",
              "Added via a Viz cell with id: 'PythonNotebook' or 'JSNotebook'",
              "opencalc library available automatically in Python cells",
            ],
          },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border ${c.color} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{c.icon}</span>
              <span className={`text-sm font-bold ${c.badge}`}>{c.label}</span>
            </div>
            <ul className="space-y-1">
              {c.points.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400"
                >
                  <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Note color="blue">
        <strong>LaTeX tip:</strong> Use the <strong>∫≈ Visual Math…</strong>{" "}
        button in the Markdown cell toolbar to open a WYSIWYG equation editor.
        Type or draw a formula, click Insert — the LaTeX is written for you.
      </Note>
    </div>
  );
}

// ─── SECTION: LESSON TYPES ───────────────────────────────────────────────────

function SectionTypes() {
  const [active, setActive] = useState("math");
  const types = [
    { id: "math", label: "📐 Math / Calculus" },
    { id: "python", label: "🐍 Python / Code" },
    { id: "proof", label: "📝 Proof / Geometry" },
    { id: "web", label: "🌐 Web / JavaScript" },
    { id: "science", label: "🔬 Science / ScienceNotebook" },
  ];
  const content = {
    math: (
      <div>
        <Para>
          The classic lesson type. Build it in the Lesson Builder: one or more
          Markdown cells for explanation, a Viz cell for the interactive, and a
          Quiz cell at the end. Emphasis on building intuition first, then
          formal definition, then practice.
        </Para>
        <H3>Recommended cell order</H3>
        <CodeBlock>{`Markdown (hook question + real-world context)
Markdown (intuitive explanation, no formulas yet)
Viz      (interactive — SecantToTangent, RiemannSum, etc.)
Markdown (formal definition with LaTeX)
Assessment (open-ended reflection)
Quiz     (scored — ≥80% earns ★)`}</CodeBlock>
        <H3>Inline algebra popovers</H3>
        <Para>
          In any prose string, use <Cb>{"{{"}</Cb>
          <Cb>algebra:id|link text</Cb>
          <Cb>{"}}"}</Cb> to link a term to a pop-up reference card. The link
          text is KaTeX.
        </Para>
        <CodeBlock>{`"Factor using {{algebra:difference-of-squares|difference of squares}}."`}</CodeBlock>
        <Para>
          Available IDs: <Cb>difference-of-squares</Cb>,{" "}
          <Cb>difference-of-cubes</Cb>, <Cb>exponent-rules-multiply</Cb>,{" "}
          <Cb>exponent-rules-power</Cb>, <Cb>log-power-rule</Cb>,{" "}
          <Cb>triangle-inequality</Cb>, <Cb>conjugate-multiplication</Cb>,{" "}
          <Cb>fraction-split</Cb>, <Cb>factoring-fractional-powers</Cb>,{" "}
          <Cb>solve-simple-quadratic</Cb>. Add new ones to{" "}
          <Cb>src/reference/algebraRegistry.js</Cb>.
        </Para>
        <DownloadCard
          icon="📐"
          title="Math Lesson Template (.js)"
          filename="math-lesson-template.js"
          template={TPL_MATH}
          desc="For contributors using a code editor. All sections with commented instructions."
        />
      </div>
    ),
    python: (
      <div>
        <Para>
          For lessons where students write and run Python code. An interactive
          Python notebook (powered by Pyodide — no installation needed) is
          embedded as a Viz cell.
        </Para>
        <H3>In the Lesson Builder</H3>
        <Para>
          Add a Viz cell and set the ID to <Cb>PythonNotebook</Cb>. That's it.
          The cell appears with syntax highlighting and Shift+Enter to run.
          Students edit it live — output appears immediately.
        </Para>
        <H3>opencalc library</H3>
        <Para>
          Every notebook automatically has access to <Cb>opencalc</Cb> — see the{" "}
          <strong>opencalc Library</strong> section for all drawing methods
          including graphs, vectors, and geometry.
        </Para>
        <DownloadCard
          icon="🐍"
          title="Python Lesson Template (.js)"
          filename="python-lesson-template.js"
          template={TPL_PYTHON}
          desc="For contributors using a code editor. Lesson with an embedded Python notebook cell."
        />
      </div>
    ),
    proof: (
      <div>
        <Para>
          For lessons that walk through a mathematical proof step by step. Heavy
          on prose (Markdown cells) — build intuition first, then present the
          formal proof. Often no scored quiz — just an Assessment cell asking
          students to paraphrase the result.
        </Para>
        <H3>Recommended cell order</H3>
        <CodeBlock>{`Markdown (hook — why should this result be true?)
Markdown (intuitive geometric argument, no symbols)
Markdown (formal proof — use **Step 1:**, **Step 2:**)
Assessment (explain the result in your own words)`}</CodeBlock>
        <H3>Writing the proof body in Markdown</H3>
        <CodeBlock>{`**Proof:**

**Step 1:** Since triangle ABC is isosceles, $AB = AC$.

**Step 2:** By the Angle Bisector Theorem...

**Therefore:** $\\angle B = \\angle C$. $\\square$`}</CodeBlock>
        <DownloadCard
          icon="📝"
          title="Proof Lesson Template (.js)"
          filename="proof-lesson-template.js"
          template={TPL_PROOF}
          desc="For contributors using a code editor."
        />
      </div>
    ),
    science: (
      <div>
        <Para>
          Used for chemistry and digital-fundamentals lessons. The entire lesson
          — prose, callouts, steps, and interactive viz — is packaged inside a{" "}
          <Cb>ScienceNotebook</Cb> component. This is <strong>Schema E</strong>.
          Requires a code editor (not available in the Lesson Builder yet).
        </Para>
        <H3>File structure — two exports required</H3>
        <CodeBlock>{`// lesson1-0.js
const LESSON_CHEM_1_0 = { ...full lesson object... }
export { LESSON_CHEM_1_0 }   // named export — for the viz wrapper
export default LESSON_CHEM_1_0  // default export — for the chapter index`}</CodeBlock>
        <H3>Cells in a ScienceNotebook lesson</H3>
        <CodeBlock>{`cells: [
  { type: 'prose',    content: 'Explanation text...' },
  { type: 'callout',  variant: 'key-idea', title: 'Big Idea', body: '...' },
  { type: 'step',     label: '1', content: 'First step...' },
  { type: 'formula',  latex: 'E = mc^2' },
  { type: 'viz',      id: 'MyVizId' },
]`}</CodeBlock>
        <H3>Viz wrapper — required for every ScienceNotebook lesson</H3>
        <Para>
          Create a wrapper file in <Cb>src/components/viz/react/</Cb> that
          self-imports the lesson and passes it to ScienceNotebook. Each lesson
          needs its own wrapper so VizFrame can load it by ID.
        </Para>
        <CodeBlock>{`// src/components/viz/react/WhyChemistry.jsx
import ScienceNotebook from './ScienceNotebook.jsx'
import { LESSON_CHEM_1_0 } from '../../../courses/chemistry/1-elements-atomic-structure/001-lesson1-0.js'

export default function WhyChemistry({ params }) {
  return <ScienceNotebook lesson={LESSON_CHEM_1_0} params={params} />
}`}</CodeBlock>
        <Para>
          Then register it in <Cb>VizFrame.jsx</Cb>:
        </Para>
        <CodeBlock>{`WhyChemistry: lazy(() => import('./react/WhyChemistry.jsx')),`}</CodeBlock>
        <Note color="amber">
          Do NOT set <Cb>previewVisualizationId</Cb> in the lesson's{" "}
          <Cb>hook</Cb> — the viz is rendered from{" "}
          <Cb>intuition.visualizations</Cb> only. Setting it in both causes a
          double-render.
        </Note>
      </div>
    ),
    web: (
      <div>
        <Para>
          For lessons where students write JavaScript, HTML, or CSS. Uses{" "}
          <Cb>JSNotebook</Cb> — students see live output immediately as they
          type.
        </Para>
        <H3>In the Lesson Builder</H3>
        <Para>
          Add a Viz cell and set the ID to <Cb>JSNotebook</Cb>. The Monaco
          editor appears with live HTML/CSS/JS output in a panel beside it.
        </Para>
        <H3>Python vs. JavaScript notebooks</H3>
        <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
          <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-700 text-teal-800 dark:text-teal-300 space-y-1">
            <div className="font-bold">PythonNotebook</div>
            <div>• Pyodide (WebAssembly)</div>
            <div>• opencalc charts built-in</div>
            <div>• Cell-by-cell execution</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 space-y-1">
            <div className="font-bold">JSNotebook</div>
            <div>• Runs native JS</div>
            <div>• Live HTML/CSS output</div>
            <div>• Monaco editor (VS Code-like)</div>
          </div>
        </div>
      </div>
    ),
  };
  return (
    <div>
      <SectionHeading sub="Conventions for which cells to use based on subject matter.">
        Lesson Types
      </SectionHeading>
      <Para>
        "Types" are conventions for cell order and content style based on
        subject. The Lesson Builder supports all types except Science Notebook
        (which requires a code editor). Check ARCHITECTURE.md § 4 for the
        course→schema mapping before starting.
      </Para>
      <div className="flex flex-wrap gap-2 mb-6">
        {types.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${active === t.id ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {content[active]}
    </div>
  );
}

// ─── SECTION: OPENCALC ───────────────────────────────────────────────────────

function SectionOpencalc() {
  return (
    <div>
      <SectionHeading sub="The built-in Python visualization library — no installation needed.">
        opencalc Python Library
      </SectionHeading>
      <Para>
        <strong>opencalc</strong> is available automatically in every Python
        notebook. Students just import it and start drawing.
      </Para>

      <H3>Quick start</H3>
      <CodeBlock>{`from opencalc import Figure, quick_plot

# One-liner: plot a function
print(quick_plot(lambda x: x**2, title='y = x²'))

# Full control:
fig = Figure(xmin=-5, xmax=5, ymin=-2, ymax=10)
fig.grid().axes()
fig.plot(lambda x: x**2, color='blue', label='x²')
fig.point([1, 1], label='(1, 1)')
print(fig.show())   # ← always print()`}</CodeBlock>
      <Note color="amber">
        Always end with <Cb>print(fig.show())</Cb>. Calling <Cb>fig.show()</Cb>{" "}
        alone won't display the figure.
      </Note>

      <H3>Drawing methods (all chainable)</H3>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
        {[
          [".grid(step, color)", "Background grid lines."],
          [
            ".axes(labels, ticks)",
            "X and Y axes with optional tick marks and labels.",
          ],
          [
            ".plot(fn, color, label, fill)",
            "Plot a function y = f(x). fn is a Python lambda or function.",
          ],
          [
            ".parametric(xfn, yfn, tmin, tmax)",
            "Parametric curve (x(t), y(t)) over a t range.",
          ],
          [
            ".scatter(xs, ys, color, radius)",
            "Scatter plot from two lists of numbers.",
          ],
          [".point(pos, color, label)", "Single labeled dot at [x, y]."],
          [".arrow(start, end, color)", "Arrow from [x1,y1] to [x2,y2]."],
          [".vector(v, color, label, origin)", "Vector drawn from origin."],
          [
            ".fill_between(fn_top, fn_bot)",
            "Shaded region between two functions.",
          ],
          [
            ".circle(center, radius, color)",
            "Circle by center point and radius.",
          ],
          [
            ".rect(x, y, w, h, color)",
            "Rectangle at corner (x, y) with given size.",
          ],
          [
            ".polygon(points, color, fill)",
            "Filled polygon from a list of [x,y] points.",
          ],
          [".text(pos, content, color)", "Text label at a coordinate."],
          [
            ".riemann(fn, a, b, n, method)",
            "Riemann sum rectangles (midpoint / left / right).",
          ],
          [".tangent(fn, x0, color)", "Tangent line at x0 with slope label."],
          [
            ".bars(labels, values, color)",
            "Bar chart from label and value lists.",
          ],
          [
            ".transformed_grid(matrix)",
            "Visualize a 2×2 matrix transformation.",
          ],
          [
            ".hline(y) / .vline(x)",
            "Horizontal or vertical dashed reference line.",
          ],
        ].map(([method, desc], i) => (
          <div
            key={i}
            className={`flex gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0 ${i % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-900/30"}`}
          >
            <code className="font-mono text-xs text-teal-600 dark:text-teal-400 shrink-0 w-52">
              {method}
            </code>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {desc}
            </span>
          </div>
        ))}
      </div>

      <H3>Shortcut helpers</H3>
      <CodeBlock>{`quick_plot(lambda x: x**2, xmin=-3, xmax=3, title='Square')
quick_vectors([1, 2], [3, -1], labels=['a', 'b'])
quick_transform([[2, 0], [0, 1]])       # stretch x by 2
quick_transform([[0, -1], [1, 0]])      # 90° rotation`}</CodeBlock>

      <H3>Available colors</H3>
      <div className="flex flex-wrap gap-2 my-3">
        {[
          "blue",
          "amber",
          "green",
          "red",
          "purple",
          "teal",
          "gray",
          "muted",
        ].map((c) => (
          <span
            key={c}
            className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300"
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── SECTION: USING VIZ ──────────────────────────────────────────────────────

function SectionUseViz({ onNavigate }) {
  return (
    <div>
      <SectionHeading sub="Add any existing visualization to a lesson — just one line.">
        Using Existing Visualizations
      </SectionHeading>
      <Para>
        The app has dozens of pre-built interactive visualizations. Adding one
        to your lesson takes exactly one line in the <Cb>visualizations</Cb>{" "}
        array.
      </Para>

      <Note color="green">
        <strong>No code editor?</strong> Open the{" "}
        <Link to="/viz-builder" onClick={onNavigate} className="font-bold underline">Viz Builder</Link>{" "}
        (🔭 in Labs), configure a viz in the Build tab, click{" "}
        <strong>Export →</strong>, then <strong>"Or insert directly into a
        lesson"</strong>. Search for the target lesson, pick a section
        (Intuition / Math / Rigor), and it drops straight into that lesson's
        diff/save/PR flow — the same pipeline lessons already use.
      </Note>

      <H3>How to add a viz</H3>
      <CodeBlock>{`intuition: {
  text: 'Your explanation...',
  visualizations: [
    { id: 'RiemannSum', props: {} },
  ],
},`}</CodeBlock>
      <Para>
        The <Cb>id</Cb> must exactly match the registration name in{" "}
        <Cb>VizFrame.jsx</Cb>. It is case-sensitive.
      </Para>

      <H3>Multiple vizs</H3>
      <CodeBlock>{`visualizations: [
  { id: 'SecantToTangent', props: {} },
  { id: 'PythonNotebook', props: {} },
],`}</CodeBlock>

      <H3>Passing parameters</H3>
      <CodeBlock>{`{ id: 'RiemannSum', props: { defaultN: 10, defaultMethod: 'midpoint' } }`}</CodeBlock>

      <H3>Available visualizations</H3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 my-3">
        {[
          ["SecantToTangent", "Derivative intuition — secant → tangent line"],
          ["RiemannSum", "Integration — Riemann sum explorer"],
          ["LimitApproach", "Limits — approach from both sides"],
          ["EpsilonDelta", "ε-δ definition explorer"],
          ["ChainRulePeeler", "Chain rule decomposition"],
          ["NewtonsMethod", "Root-finding iteration"],
          ["MVTViz", "Mean Value Theorem visualization"],
          ["CurveSketchingBoard", "Full curve sketching tool"],
          ["AreaBetweenCurves", "Integration applications"],
          ["PythagoreanProof", "Visual proof of Pythagorean theorem"],
          ["UnitCircle", "Interactive unit circle"],
          ["UnitCircleMirror", "Sine and cosine from unit circle"],
          ["PythonNotebook", "Interactive Python cell (runs in browser)"],
          ["JSNotebook", "Interactive JavaScript cell"],
          ["ParametricCurve3D", "3D parametric curve (Three.js)"],
          ["TangentPlane3D", "3D tangent plane visualization"],
          ["ForceBlockSim", "Physics — force and acceleration (Matter.js)"],
          ["InclinedPlaneSim", "Physics — inclined plane simulation"],
        ].map(([name, desc]) => (
          <div
            key={name}
            className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            <code className="font-mono text-xs text-brand-600 dark:text-brand-400 shrink-0 mt-0.5">
              {name}
            </code>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {desc}
            </span>
          </div>
        ))}
      </div>
      <Note color="blue">
        For the full list, open <Cb>src/components/viz/VizFrame.jsx</Cb> — every
        registered name is at the top of that file in <Cb>VIZ_REGISTRY</Cb>.
      </Note>
    </div>
  );
}

// ─── SECTION: BUILD VIZ ──────────────────────────────────────────────────────

function SectionBuildViz() {
  const [tpl, setTpl] = useState("prose");
  return (
    <div>
      <SectionHeading sub="Create a new interactive visualization from scratch.">
        Building a Visualization
      </SectionHeading>
      <Para>
        A visualization is a React component file. You write it in JSX, drop it
        in a folder, and register it with one line. Then it's available in any
        lesson.
      </Para>

      <H3>The 3-step process</H3>
      <div className="space-y-3 my-4">
        {[
          {
            n: "1",
            t: "Create the file",
            d: "Make a new .jsx file in src/components/viz/react/. Name it exactly as you want to call it from a lesson.",
          },
          {
            n: "2",
            t: "Register in VizFrame.jsx",
            d: "Add one line to the VIZ_REGISTRY object at the top of VizFrame.jsx.",
          },
          {
            n: "3",
            t: "Use it in a lesson",
            d: "Add { id: 'YourComponentName', props: {} } to the visualizations array in any lesson file.",
          },
        ].map((item) => (
          <div
            key={item.n}
            className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            <div className="w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
              {item.n}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-0.5">
                {item.t}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {item.d}
              </div>
            </div>
          </div>
        ))}
      </div>

      <H3>Register in VizFrame.jsx</H3>
      <CodeBlock>{`// In src/components/viz/VizFrame.jsx, add to VIZ_REGISTRY:
MyVizComponent: lazy(() => import('./react/MyVizComponent.jsx')),`}</CodeBlock>
      <Note color="amber">
        The key is CASE-SENSITIVE and must EXACTLY match the id you use in the
        lesson file and the default export name in the jsx file.
      </Note>

      <H3>Download a template</H3>
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          ["prose", "Prose + toggles"],
          ["canvas", "Canvas (graphs / animation)"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTpl(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tpl === id ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tpl === "prose" ? (
        <DownloadCard
          icon="🧩"
          title="Prose Viz Template"
          filename="MyVizComponent.jsx"
          template={TPL_VIZ}
          desc="For text panels, toggles, step-through explanations, and comparison layouts. No canvas needed."
        />
      ) : (
        <DownloadCard
          icon="🎨"
          title="Canvas Viz Template"
          filename="MyCanvasViz.jsx"
          template={TPL_CANVAS}
          desc="For animated graphs, geometry diagrams, and physics simulations. Includes ResizeObserver and the full 5-part canvas pattern."
        />
      )}

      <H3>Required: the colors hook</H3>
      <Para>
        Import this into every viz component — don't paste the implementation
        in. It makes your component react to dark/light mode and the active
        studio theme automatically, and a fix to the palette only has to happen
        once.
      </Para>
      <CodeBlock>{`import { useThemeColors } from '../../../hooks/useThemeColors'

export default function MyVizComponent() {
  const C = useThemeColors()
  // C.bg, C.surface, C.text, C.blue, C.teal, C.amber, C.green, C.red, C.purple, C.orange ...
}`}</CodeBlock>

      <H3>Canvas: the 5 required parts</H3>
      <div className="space-y-2 my-3">
        {[
          {
            p: "A",
            t: 'canvasRef (not "ref")',
            c: "const canvasRef = useRef(null)",
            d: '"ref" is semi-reserved in React. Name the canvas ref canvasRef — nothing else.',
          },
          {
            p: "B",
            t: "roRef",
            c: "const roRef = useRef(null)",
            d: "The ResizeObserver ref. Keeps the canvas up to date on window resize.",
          },
          {
            p: "C",
            t: "Set size inside draw()",
            c: "cv.width = cv.offsetWidth || 500\ncv.height = 300",
            d: "Must be set INSIDE draw(), every time. Setting width also clears the canvas: that's intentional.",
          },
          {
            p: "D",
            t: "Observe parentElement",
            c: "roRef.current.observe(canvasRef.current.parentElement)",
            d: "Observe the PARENT, not the canvas. The canvas has no CSS width to observe.",
          },
          {
            p: "E",
            t: "Cleanup",
            c: "return () => { roRef.current?.disconnect() }",
            d: "Without cleanup the observer keeps running after the component is gone — memory leak.",
          },
        ].map((item) => (
          <div
            key={item.p}
            className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {item.p}
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {item.t}
              </span>
            </div>
            <div className="px-3 py-2.5">
              <code className="text-xs font-mono text-teal-600 dark:text-teal-400 block mb-1 whitespace-pre">
                {item.c}
              </code>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {item.d}
              </span>
            </div>
          </div>
        ))}
      </div>

      <H3>Common crash causes</H3>
      <div className="space-y-2">
        {[
          {
            icon: "🔴",
            l: "Variable named H",
            f: "Use canvasH — H shadows the Heading component.",
          },
          {
            icon: "🔴",
            l: "Observing canvas instead of parentElement",
            f: "roRef.current.observe(canvasRef.current.parentElement) not canvasRef.current.",
          },
          {
            icon: "🔴",
            l: "Missing cleanup for ResizeObserver",
            f: "Always return () => { roRef.current?.disconnect() } from useEffect.",
          },
          {
            icon: "🟡",
            l: "C not in useEffect deps",
            f: "Colors go stale after dark mode toggle. Include C in the deps array.",
          },
          {
            icon: "🟡",
            l: "Drawing before setting cv.width / cv.height",
            f: "Setting dimensions clears the canvas — always set them first.",
          },
        ].map((item) => (
          <div
            key={item.l}
            className="flex items-start gap-2.5 text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
          >
            <span className="text-base shrink-0">{item.icon}</span>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {item.l}:{" "}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {item.f}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── STANDARDS SECTION ──────────────────────────────────────────────────────

const LESSON_STATES = [
  {
    label: "Draft",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    desc: "Initial content. The schema is valid and the lesson renders. Incomplete sections are allowed.",
  },
  {
    label: "Review-Ready",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    desc: "All required sections present. Prose checked for weak patterns. Math verified. At least one quiz question per learning objective.",
  },
  {
    label: "Complete",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    desc: "Review-Ready plus: all prose quality items pass, KaTeX verified, vizs interactive and referenced from prose, spiral links accurate.",
  },
];

const REQUIREMENTS = [
  {
    zone: "🪪 Identity",
    items: [
      { req: true, text: "id, chapter, title, subject all set" },
      {
        req: true,
        text: "prerequisites[] lists actual lesson ids, not topic names",
      },
      {
        req: false,
        text: 'mentalModel provided (1–2 sentences: what this "is" in plain language)',
      },
    ],
  },
  {
    zone: "🎣 Hook",
    items: [
      {
        req: true,
        text: "hook.question — a real-world question that makes the concept feel necessary",
      },
      {
        req: true,
        text: "hook.setup — 1–3 sentences framing why the question is hard",
      },
      {
        req: false,
        text: "hook.visualization — interactive viz (text-only hooks rarely land)",
      },
    ],
  },
  {
    zone: "🧠 Intuition",
    items: [
      {
        req: true,
        text: "intuition.explanation — 2+ paragraphs building geometric or physical sense",
      },
      {
        req: true,
        text: "At least one interactive visualization tied to the intuition",
      },
      {
        req: false,
        text: "semantics[] markers linking callouts to explanation paragraphs",
      },
    ],
  },
  {
    zone: "🔢 Math",
    items: [
      { req: true, text: "deepDive / proof section with KaTeX-formatted math" },
      {
        req: true,
        text: 'Every step of every proof or derivation is shown — no "it follows that"',
      },
      {
        req: false,
        text: "spiral.forward / spiral.backward links to related lessons",
      },
    ],
  },
  {
    zone: "✅ Assessment",
    items: [
      {
        req: true,
        text: "assessment block present — checks understanding, not just computation",
      },
      {
        req: true,
        text: "quiz[] — at least one question per major learning objective",
      },
      {
        req: true,
        text: "All quiz answers verified correct; partialCredit and hints filled in",
      },
    ],
  },
];

const PROSE_ANTI_PATTERNS = [
  {
    bad: '"This is simply…"',
    fix: "Explain the step; never imply it is obvious.",
  },
  {
    bad: '"You probably know…"',
    fix: "Define it or link to a prerequisite lesson.",
  },
  {
    bad: '"It can be shown that…"',
    fix: "Show it, or move it to a separate callout.",
  },
  {
    bad: 'Passive: "the limit is taken"',
    fix: 'Active: "we take the limit" or "the function approaches".',
  },
  {
    bad: '"Intuitively…" (then says nothing intuitive)',
    fix: 'Follow every "intuitively" with a visual or physical reference.',
  },
  {
    bad: "Wall of LaTeX with no prose",
    fix: "At least one explanatory sentence between every displayed equation.",
  },
];

function SectionStandards() {
  const [open, setOpen] = useState(null);
  return (
    <div className="space-y-6">
      <div>
        <H2>Content Standards</H2>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Every lesson moves through three states before it is considered
          complete. Use these checklists during writing and before opening a
          pull request.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {LESSON_STATES.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border px-4 py-3 ${s.bg} ${s.border}`}
          >
            <span
              className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-2 ${s.badge}`}
            >
              {s.label}
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      <div>
        <H3>Minimum requirements by section</H3>
        <p className="text-xs text-slate-500 dark:text-slate-500 mb-3">
          <span className="font-bold text-red-500 dark:text-red-400">
            ★ Required
          </span>{" "}
          items must be present for Review-Ready.{" "}
          <span className="font-bold text-slate-500">○ Recommended</span> items
          are needed for Complete.
        </p>
        <div className="space-y-2">
          {REQUIREMENTS.map((r) => (
            <div
              key={r.zone}
              className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                onClick={() => setOpen(open === r.zone ? null : r.zone)}
              >
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {r.zone}
                </span>
                <ChevronRight
                  className={`w-4 h-4 text-slate-400 transition-transform ${open === r.zone ? "rotate-90" : ""}`}
                />
              </button>
              {open === r.zone && (
                <div className="px-4 pb-3 pt-2 space-y-1.5">
                  {r.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span
                        className={`shrink-0 font-bold mt-0.5 ${item.req ? "text-red-500 dark:text-red-400" : "text-slate-400"}`}
                      >
                        {item.req ? "★" : "○"}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <H3>Prose quality — patterns to avoid</H3>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="grid grid-cols-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
            <span>Avoid</span>
            <span>Instead</span>
          </div>
          {PROSE_ANTI_PATTERNS.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-2 gap-3 px-3 py-2.5 text-xs border-b border-slate-100 dark:border-slate-800 last:border-0 ${i % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-900/30"}`}
            >
              <span className="text-red-500 dark:text-red-400 font-mono">
                {row.bad}
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                {row.fix}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <H3>Math accuracy checklist</H3>
        <div className="space-y-1.5">
          {[
            "All definitions match the standard textbook definition for this level.",
            "Every theorem includes the full set of hypotheses — no hidden assumptions.",
            "LaTeX renders without errors; fractions use \\dfrac in display math.",
            "Variable names are consistent throughout the lesson (no silent reuse).",
            "Worked examples are computed correctly — verify algebraically, not just visually.",
            "Quiz numerical answers are exact (not rounded) unless the problem says otherwise.",
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
            >
              <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-slate-600 dark:text-slate-400">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 px-4 py-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        <span className="font-bold text-brand-700 dark:text-brand-300">
          Full reference:{" "}
        </span>
        See{" "}
        <code className="font-mono bg-white/60 dark:bg-black/20 px-1 rounded">
          CONTRIBUTING.md
        </code>{" "}
        section&nbsp;1c for the complete standards specification and PR
        checklist.
      </div>
    </div>
  );
}

// ─── SECTION: AI PROMPTS ─────────────────────────────────────────────────────

const AI_PROMPTS = [
  {
    id: "math-lesson",
    label: "Math Lesson",
    color: "blue",
    prompt: `You are generating a lesson for open-calc, an interactive math/STEM platform.

The lesson is a JS file with one default export. File goes in:
  src/courses/{course-id}/{N}-{chapter-slug}/{NNN}-{lesson-slug}.js

Example: src/courses/calculus/3-derivatives/006-product-rule.js

export default {
  id: 'product-rule',              // kebab-case, globally unique (no chapter prefix)
  slug: 'product-rule',            // same as id — used in the URL
  chapter: 3,                      // integer — the leading N in the chapter folder name
  order: 6,                        // integer position within chapter (matches NNN prefix)
  title: 'The Product Rule',
  subtitle: 'One-line plain-English description',
  tags: ['calculus', 'derivatives', 'product-rule'], // lowercase, hyphenated

  hook: {
    question: 'How do you differentiate a product of two functions?',
    realWorldContext: 'One paragraph explaining real-world relevance.',
    previewVisualizationId: 'SecantToTangent', // optional — omit if none
  },

  mentalModel: ['Key takeaway 1.', 'Key takeaway 2.'],

  // triggers: flash-card style recall cues (optional but recommended)
  triggers: [
    { prompt: 'Differentiate f(x)·g(x)', recall: "f'g + fg' — first times derivative of second plus second times derivative of first" },
  ],

  // spiral: links to prerequisite and follow-on lessons (optional but recommended)
  spiral: {
    recoveryPoints: [
      { label: 'Derivative Definition (Lesson 1)', note: 'Review if the limit definition feels shaky.' },
    ],
    futureLinks: [
      { label: 'Quotient Rule (Next Lesson)', note: 'The quotient rule is derived from the product rule.' },
    ],
  },

  intuition: {
    // semantics: symbol glossary — what every variable and notation means (optional)
    semantics: {
      core: [
        { symbol: 'f(x)', meaning: 'first factor' },
        { symbol: 'g(x)', meaning: 'second factor' },
      ],
      rulesOfThumb: [
        "You can't just multiply the individual derivatives — try f=x², g=x² and verify.",
      ],
    },
    // blocks: ordered content blocks — mix prose, images, and visualizations
    blocks: [
      {
        type: 'prose',
        paragraphs: [
          'Paragraph 1 in plain English. No LaTeX here.',
          'Paragraph 2.',
        ],
      },
      // { type: 'image', src: importedSvgUrl, alt: 'Alt text', caption: 'Caption.' },
      // { type: 'viz',   id: 'SecantToTangent', title: 'Display title', props: {} },
      // { type: 'callout', calloutType: 'important', title: 'Key idea', body: 'Explanation.' },
    ],
  },

  examples: [
    {
      title: 'Example: Power functions',
      problem: 'Find the derivative of f(x) = x² · x³.',
      solution: 'Apply the product rule: f\'g + fg\'.',
      latex: 'f\'(x)=2x \\\\cdot x^3 + x^2 \\\\cdot 3x^2 = 5x^4',
    },
  ],

  checkpoints: ['read-intuition'],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'The product rule states that (fg)\\'(x) equals…',
      options: ["f'g + fg'", "f'g'", "f'(x) · g'(x)", "(f+g)'"],
      answer: 0, // 0-indexed correct answer
      explanation: 'Because the derivative distributes across a product as f\'g + fg\'.',
    },
  ],
};

RULES:
- id and slug are the same short kebab-case string — NO chapter prefix, no numbers
- chapter is an integer matching the leading N in the chapter folder name
- prose paragraphs are plain English — NO LaTeX, NO Markdown formatting
- LaTeX goes in: latex fields and callout body strings (use \\\\frac, not \\frac)
- calloutType must be one of: 'important', 'tip', 'warning'
- Do not invent visualization IDs — only use ones explicitly provided to you
- triggers and spiral are optional but strongly recommended for completeness
- id must be unique across the entire codebase`,
  },
  {
    id: "js-playground",
    label: "JS Notebook Lesson",
    color: "amber",
    prompt: `You are generating an interactive JS coding lesson for open-calc using the JSNotebook component.

The file has TWO parts — a notebook cells const, then a lesson metadata export.

PART 1 — Notebook cells (define at module top level):

const LESSON_MY_TOPIC = {
  title: 'Lesson Title',
  subtitle: 'One-line description',
  sequential: true,
  cells: [
    // MARKDOWN cell — explanation/context only, no code
    {
      type: 'markdown',
      instruction: '## Section heading\n\nExplanation prose. Use **bold** for emphasis.',
    },
    // JS cell — live runnable code
    {
      type: 'js',
      instruction: 'What this cell teaches (use backtick code spans for keywords).',
      html: '<div id="output"></div>',
      css: 'body { background: #0f172a; color: #e2e8f0; padding: 12px; font-family: monospace; }',
      startCode: '// Starter code the student sees and can run',
      outputHeight: 300,
    },
    // CHALLENGE cell — student fills in blanks
    {
      type: 'challenge',
      instruction: '**Challenge:** Complete the function...',
      html: '<div id="result"></div>',
      css: 'body { background: #0f172a; color: #e2e8f0; padding: 12px; }',
      startCode: '// Scaffold with YOUR CODE HERE comments',
      solutionCode: '// The complete working solution',
      check: (code) => /expectedPattern/.test(code),
      successMessage: 'Correct! Here is why it works.',
      failMessage: 'Check X and Y in your code.',
      outputHeight: 400,
    },
  ],
};

PART 2 — Lesson metadata export:

// File goes in: src/courses/{course-id}/{N}-{chapter-slug}/{NNN}-{lesson-slug}.js
// Example: src/courses/tetris/1-build-tetris/002-tetris-describing-a-piece.js

export default {
  id: 'tetris-02-describing-a-piece',   // unique kebab-case id
  slug: 'tetris-describing-a-piece',    // used in the URL
  chapter: 1,                           // integer — leading N in the chapter folder name
  order: 2,                             // integer position within chapter (matches NNN)
  title: 'Describing a Piece',
  subtitle: '...',
  tags: ['javascript', 'arrays'],
  hook: { question: '...', realWorldContext: '...', previewVisualizationId: 'JSNotebook' },
  intuition: {
    prose: ['...'],
    callouts: [],
    visualizations: [{ id: 'JSNotebook', title: 'Lesson display title', props: { lesson: LESSON_MY_TOPIC } }],
  },
  math: { prose: [], callouts: [], visualizations: [] },
  rigor: { prose: [], callouts: [], visualizations: [] },
  examples: [],
  challenges: [],
  mentalModel: ['Takeaway 1.', 'Takeaway 2.'],
  checkpoints: ['read-intuition'],
  quiz: [],
};

RULES:
- sequential: true means later cells can use variables declared in earlier cells
- Every js/challenge cell must have: html, css, startCode, outputHeight
- Every challenge cell must also have: solutionCode, check(), successMessage, failMessage
- CSS uses dark theme by default: background #0f172a, text #e2e8f0
- check() receives the student's full code as a string — use regex to verify key patterns
- Keep each cell focused on ONE concept
- Don't import anything — the notebook environment provides the browser globals`,
  },
  {
    id: "viz-component",
    label: "New Viz Component",
    color: "violet",
    prompt: `═══════════════════════════════════════════════
FILL THIS IN — replace before sending
═══════════════════════════════════════════════
TOPIC: [e.g. "The unit circle — interactive, drag the angle point around the circle and watch sin/cos/tan update live"]
STYLE: [canvas (D3 SVG math graph) | prose (sliders, toggles, step-through panels) | both]

═══════════════════════════════════════════════
WHAT YOU ARE BUILDING
═══════════════════════════════════════════════
A self-contained React component that teaches one math/STEM concept visually and interactively.
It renders inside a lesson card — roughly 300–500px tall, full container width.
Students interact with it: drag points, move sliders, step through stages, watch values update live.
The goal is to make the concept physically tangible — not just a static diagram.

File: src/components/viz/react/MyComponent.jsx
One file, one default export. No TypeScript. Vite + React 18 + JSX.
Props: ({ params = {} }) — params is optional config from the lesson.

═══════════════════════════════════════════════
DARK MODE — copy this hook verbatim into the file
═══════════════════════════════════════════════
function useIsDark() {
  const isDark = () => document.documentElement.classList.contains('dark');
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(isDark()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}
// In draw() or render: const dark = useIsDark();
// Then produce a color object branching on dark, e.g.:
// const C = {
//   bg:    dark ? '#0f172a' : '#ffffff',   // slate-900 / white
//   panel: dark ? '#1e293b' : '#f1f5f9',   // slate-800 / slate-100
//   axis:  dark ? '#475569' : '#94a3b8',   // slate-600 / slate-400
//   curve: dark ? '#38bdf8' : '#0284c7',   // sky-400 / sky-600
//   accent:dark ? '#34d399' : '#059669',   // emerald-400 / emerald-600
//   warn:  dark ? '#fbbf24' : '#d97706',   // amber-400 / amber-600
//   point: dark ? '#f472b6' : '#db2777',   // pink-400 / pink-700
//   text:  dark ? '#94a3b8' : '#64748b',   // slate-400 / slate-500
// };

═══════════════════════════════════════════════
CSS VARIABLES (defined in the app — safe to use)
═══════════════════════════════════════════════
var(--color-surface)     // #ffffff light / #0f172a dark — card background
var(--color-border)      // #e2e8f0 light / #334155 dark — borders
var(--color-text-muted)  // #64748b light / #94a3b8 dark — captions

═══════════════════════════════════════════════
CANVAS PATTERN — for math graphs, geometry, animations
═══════════════════════════════════════════════
import { useRef, useEffect, useState } from 'react';

export default function MyComponent({ params = {} }) {
  const dark = useIsDark();
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [value, setValue] = useState(1); // example slider state

  useEffect(() => {
    const draw = () => {
      const C = { bg: dark ? '#0f172a' : '#ffffff', curve: dark ? '#38bdf8' : '#0284c7' /* etc */ };
      const W = containerRef.current?.clientWidth || 480;
      const H = 260;
      // d3 is available globally — do NOT import it
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      svg.attr('width', W).attr('height', H);
      // build scales, draw axes, paths, circles...
    };
    const ro = new ResizeObserver(draw);
    if (containerRef.current) ro.observe(containerRef.current);
    draw();
    return () => ro.disconnect();
  }, [dark, value]); // re-draw on theme change OR state change

  return (
    <div ref={containerRef} style={{ padding: 12 }}>
      <input type="range" min={0} max={10} step={0.1} value={value}
        onChange={e => setValue(+e.target.value)} style={{ width: '100%', accentColor: '#38bdf8' }} />
      <svg ref={svgRef} style={{ width: '100%', display: 'block', borderRadius: 8,
        background: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
    </div>
  );
}

═══════════════════════════════════════════════
PROSE + TOGGLES PATTERN — for step-through, comparisons, interactive panels
═══════════════════════════════════════════════
export default function MyComponent({ params = {} }) {
  const dark = useIsDark();
  const [step, setStep] = useState(0);
  const panel = dark ? '#1e293b' : '#f1f5f9';
  const border = dark ? '#334155' : '#e2e8f0';
  const text   = dark ? '#e2e8f0' : '#1e293b';
  const muted  = dark ? '#94a3b8' : '#64748b';

  const steps = ['Step 1 content', 'Step 2 content', 'Step 3 content'];
  return (
    <div style={{ background: panel, borderRadius: 12, padding: 16, border: \`1px solid \${border}\` }}>
      <p style={{ color: text, fontSize: 14 }}>{steps[step]}</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={() => setStep(s => Math.max(0, s - 1))}
          style={{ padding: '6px 14px', borderRadius: 6, background: dark ? '#334155' : '#e2e8f0', color: text, border: 'none', cursor: 'pointer' }}>← Back</button>
        <button onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
          style={{ padding: '6px 14px', borderRadius: 6, background: '#0284c7', color: '#fff', border: 'none', cursor: 'pointer' }}>Next →</button>
      </div>
    </div>
  );
}

═══════════════════════════════════════════════
AVAILABLE GLOBALS (do NOT import these)
═══════════════════════════════════════════════
d3    — full D3 library (scales, shapes, selections, transitions)
THREE — Three.js for 3D

═══════════════════════════════════════════════
HARD RULES
═══════════════════════════════════════════════
- No CSS files, no CSS modules, no styled-components — inline styles only
- No document.querySelector outside useEffect
- No height: 100vh — use natural heights
- Always return a cleanup: () => { ro.disconnect(); cancelAnimationFrame(raf); }
- Under 500 lines. All sub-components in the same file.
- No TypeScript, no prop-types`,
  },
  {
    id: "new-course",
    label: "New Course",
    color: "green",
    prompt: `You are adding a new course to open-calc. The course system auto-discovers content — NO manual registration in any index or courses file is needed.

DIRECTORY STRUCTURE
src/courses/{course-id}/                    ← course root
  meta.json                                 ← course metadata (required)
  {N}-{chapter-slug}/                       ← one folder per chapter
    {NNN}-{lesson-slug}.js                  ← one file per lesson

Example for a new "statistics" course, chapter 1 "Probability", lesson 1:
  src/courses/statistics/meta.json
  src/courses/statistics/1-probability/001-probability-intro.js

STEP 1 — Create src/courses/{course-id}/meta.json
{
  "icon": "📊",
  "description": "One sentence describing the course.",
  "domain": "math"
}
domain options: "math" | "cs" | "science" | "engineering" | "creative" | "other"

STEP 2 — Create the chapter folder and first lesson
Folder: src/courses/{course-id}/1-{chapter-slug}/
File:   src/courses/{course-id}/1-{chapter-slug}/001-{lesson-slug}.js

Use the Math Lesson schema for the lesson export. Key fields:
  chapter: 1          // integer matching the leading N in the chapter folder name
  order: 1            // integer matching the leading NNN in the filename
  id: 'lesson-slug'   // kebab-case, no chapter prefix, globally unique

STEP 3 — Add additional chapters and lessons as needed
Each new N-{chapter-slug}/ folder is a new chapter.
Each new NNN-{lesson-slug}.js inside it is a new lesson.
courseLoader.js auto-discovers all of them via import.meta.glob.

STEP 4 (only if lessons use new viz components) — Register in VizFrame.jsx
Add the import and a case in the viz switch. Otherwise skip this step.

VALIDATION: Run npm run dev and navigate to /courses to confirm the course appears.
  ✔ Course card shows on the courses page
  ✔ Chapter and lesson nav renders correctly
  ✔ "npm run build" completes with no errors`,
  },
];

function SectionAIPrompts() {
  const [active, setActive] = useState("math-lesson");
  const [copied, setCopied] = useState(false);
  const prompt = AI_PROMPTS.find((p) => p.id === active);

  const copy = () => {
    navigator.clipboard.writeText(prompt.prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const colorMap = {
    blue: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    amber:
      "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    violet:
      "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    green:
      "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
  };

  return (
    <div>
      <SectionHeading sub="Paste into any AI assistant. It already knows the rules.">
        AI Generation Prompts
      </SectionHeading>

      <Para>
        These prompts encode open-calc conventions — the exact lesson schema,
        JSNotebook cell format, viz registration steps, and build validation
        commands. Paste one into ChatGPT, Claude, or Copilot Chat and describe
        what you want to build.
      </Para>

      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 mb-5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
        <span className="font-bold text-amber-700 dark:text-amber-400">
          Why a prompt?
        </span>{" "}
        AI-generated files often deviate from project structure — wrong schema
        fields, bad import paths, invented viz IDs. These prompts front-load the
        rules so the AI follows them from the first response.
      </div>

      {/* Selector tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {AI_PROMPTS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setActive(p.id);
              setCopied(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              active === p.id
                ? colorMap[p.color]
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Prompt display */}
      <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-950 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700">
          <span className="text-xs font-mono text-slate-400">
            {prompt?.label} prompt
          </span>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            {copied ? "Copied!" : "Copy prompt"}
          </button>
        </div>
        <pre className="px-4 py-4 text-xs text-slate-300 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
          {prompt?.prompt}
        </pre>
      </div>

      <H3>How to use</H3>
      <ol className="space-y-3 mt-3">
        {[
          "Pick the prompt matching what you want to build: Math Lesson, JS Notebook, Viz Component, or New Course.",
          "Click Copy and paste the prompt into your AI chat as the first message (system prompt or opening context).",
          'Describe your request: "Write a lesson on the chain rule with 3 worked examples" or "Build an interactive pendulum for the physics course."',
          "Review the AI output against the schema. Check: chapter matches, id is unique, no extra fields, viz IDs are real.",
          "Run npm run build and watch for [open-calc validator] warnings. Fix any chapter mismatches before committing.",
        ].map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {step}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── SECTION: TROUBLESHOOTING ───────────────────────────────────────────────

const STORAGE_KEY = "oc-sticky-notes";

function SectionTroubleshooting() {
  const [resetDone, setResetDone] = useState(false);

  function resetNotes() {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("oc-note-change"));
    setResetDone(true);
    setTimeout(() => setResetDone(false), 3000);
  }

  return (
    <div>
      <SectionHeading sub="Fix common issues without losing your progress.">
        Troubleshooting
      </SectionHeading>

      <div className="space-y-6">
        {/* Reset notes */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                My notes are gone / showing wrong content
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Restores all bundled default notes by clearing your local
                overrides and deleted markers. Any notes you personally wrote
                will also be removed — export them first if you want to keep
                them.
              </p>
            </div>
          </div>
          <button
            onClick={resetNotes}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              resetDone
                ? "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40"
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            {resetDone
              ? "Notes reset — refresh the page"
              : "Reset notes to defaults"}
          </button>
        </div>

        {/* Blank page after update */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Page is blank after an update
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Your browser cached the old version of the app. A hard reload
                fetches the latest files. On most browsers:{" "}
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">
                  Ctrl + Shift + R
                </span>{" "}
                (Windows/Linux) or{" "}
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">
                  ⌘ + Shift + R
                </span>{" "}
                (Mac).
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload page now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SECTION: FORMATTING GUIDE ──────────────────────────────────────────────

const LATEX_CHEATSHEET = [
  { cmd: "\\\\frac{a}{b}", output: "a/b fraction", ex: "\\\\frac{x^2}{2}" },
  { cmd: "\\\\sqrt{x}", output: "Square root", ex: "\\\\sqrt{x+1}" },
  {
    cmd: "\\\\lim_{x \\\\to a}",
    output: "Limit notation",
    ex: "\\\\lim_{x \\\\to 0}",
  },
  { cmd: "x^{2}", output: "Superscript (power)", ex: "e^{x+1}" },
  { cmd: "x_{n}", output: "Subscript", ex: "x_{n+1}" },
  {
    cmd: "\\\\int_a^b",
    output: "Definite integral",
    ex: "\\\\int_0^1 f(x)\\\\,dx",
  },
  {
    cmd: "\\\\sum_{k=1}^{n}",
    output: "Summation",
    ex: "\\\\sum_{k=1}^{n} k^2",
  },
  { cmd: "\\\\infty", output: "Infinity symbol", ex: "x \\\\to \\\\infty" },
  { cmd: "\\\\cdot", output: "Multiplication dot", ex: "a \\\\cdot b" },
  { cmd: "\\\\pm", output: "Plus-or-minus", ex: "x = \\\\pm 3" },
  {
    cmd: "\\\\leq, \\\\geq",
    output: "Less/greater or equal",
    ex: "0 \\\\leq x \\\\leq 1",
  },
  {
    cmd: "\\\\approx",
    output: "Approximately equal",
    ex: "\\\\pi \\\\approx 3.14",
  },
  { cmd: "\\\\neq", output: "Not equal", ex: "x \\\\neq 0" },
  {
    cmd: "\\\\left( \\\\right)",
    output: "Auto-sized brackets",
    ex: "\\\\left( \\\\frac{a}{b} \\\\right)",
  },
  {
    cmd: "\\\\dfrac{a}{b}",
    output: "Display-size fraction",
    ex: "Use in display math for readability",
  },
  {
    cmd: "\\\\text{word}",
    output: "Roman text inside math",
    ex: "\\\\text{where } x > 0",
  },
];

const PIPELINE_ROWS = [
  {
    field: "expression",
    where: "math.examples[].steps[].expression",
    pipeline: "KatexBlock",
    rules:
      "Pure LaTeX. No $…$ delimiters. Backslashes must be doubled in JS strings.",
    example: '"\\\\frac{x^2 - 1}{x - 1}"',
  },
  {
    field: "annotation",
    where: "math.examples[].steps[].annotation",
    pipeline: "parseProse()",
    rules:
      "Mixed prose + math. Wrap EVERY math fragment in $…$. Use **bold**. Write prose, not \\\\n lists.",
    example: '"Substitute $x = 2$ and simplify: **Result** is $3$."',
  },
  {
    field: "Prose fields",
    where: "intuition.text, rigor.text, hook.realWorldContext",
    pipeline: "MarkdownProse",
    rules:
      "Full Markdown + KaTeX. $…$ for inline math, \\[…\\] or $$…$$ for display math. GFM supported.",
    example:
      '"The **limit** $\\\\lim_{x\\\\to 0} \\\\frac{\\\\sin x}{x} = 1$."',
  },
];

function SectionFormatting() {
  const [activeTab, setActiveTab] = useState("rules");
  const tabs = [
    { id: "rules", label: "Rules & Examples" },
    { id: "pipeline", label: "Which Renderer?" },
    { id: "cheatsheet", label: "LaTeX Cheat Sheet" },
  ];
  return (
    <div>
      <SectionHeading sub="How to write math, bold, and formatted text in lesson files.">
        Formatting Guide
      </SectionHeading>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === t.id ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "rules" && (
        <div>
          <H3>Rule 1 — Double every backslash in JS strings</H3>
          <Para>
            LaTeX commands begin with <Cb>\</Cb>. Inside a JavaScript string, a
            single backslash is an escape character — it does NOT produce a
            backslash in the output. Always write two backslashes.
          </Para>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
              <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
                ✗ Wrong
              </div>
              <CodeBlock>{`expression: "\\frac{1}{x}"
// ↑ \\f is a form-feed character
// KaTeX renders garbage or crashes`}</CodeBlock>
            </div>
            <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
              <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                ✓ Correct
              </div>
              <CodeBlock>{`expression: "\\\\frac{1}{x}"
// ↑ \\\\ in JS string = \\ delivered to KaTeX
// KaTeX renders: ½ fraction`}</CodeBlock>
            </div>
          </div>

          <H3>Rule 2 — Wrap annotation math in $…$</H3>
          <Para>
            The <Cb>annotation</Cb> field uses <Cb>parseProse()</Cb>, which
            renders math only where you put <Cb>$</Cb> delimiters. Bare LaTeX
            commands without delimiters appear as raw text.
          </Para>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
              <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
                ✗ Wrong
              </div>
              <CodeBlock>{`annotation: "Substitute \\\\frac{1}{2}"
// Renders as literal text: Substitute \\frac{1}{2}`}</CodeBlock>
            </div>
            <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
              <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                ✓ Correct
              </div>
              <CodeBlock>{`annotation: "Substitute $\\\\frac{1}{2}$"
// Renders: Substitute [rendered fraction]`}</CodeBlock>
            </div>
          </div>

          <H3>Rule 3 — No \\n for line breaks in annotations</H3>
          <Para>
            The <Cb>\\n</Cb> character collapses to a space in HTML. Write
            annotations as natural flowing prose. Use <Cb>**Step 1:**</Cb>{" "}
            inline rather than separate lines for multi-step explanations.
          </Para>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
              <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
                ✗ Wrong
              </div>
              <CodeBlock>{`annotation: "Step 1: factor\\nStep 2: cancel"
// Renders as: Step 1: factor Step 2: cancel`}</CodeBlock>
            </div>
            <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
              <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                ✓ Correct
              </div>
              <CodeBlock>{`annotation: "**Step 1:** factor $(x-1)$, then **Step 2:** cancel the common term."
// Renders bold labels inline with flowing prose`}</CodeBlock>
            </div>
          </div>

          <H3>Rule 4 — No Unicode math symbols</H3>
          <Para>
            Unicode superscripts and subscripts (x², x³, x₁, x₂) are NOT LaTeX —
            KaTeX cannot process them as math. Use LaTeX syntax inside{" "}
            <Cb>$…$</Cb> instead.
          </Para>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
            <div className="grid grid-cols-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
              <span>Avoid (Unicode)</span>
              <span>Use instead (LaTeX)</span>
              <span>In a string</span>
            </div>
            {[
              ["x²", "$x^2$", '"$x^2$"'],
              ["x³", "$x^3$", '"$x^3$"'],
              ["x₁", "$x_1$", '"$x_1$"'],
              ["x₂", "$x_2$", '"$x_2$"'],
              ["π", "$\\pi$", '"$\\\\pi$"'],
              ["→", "$\\to$", '"$\\\\to$"'],
            ].map(([bad, good, str], i) => (
              <div
                key={i}
                className={`grid grid-cols-3 gap-3 px-3 py-2 text-xs border-b border-slate-100 dark:border-slate-800 last:border-0 ${i % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-900/30"}`}
              >
                <span className="text-red-500 dark:text-red-400 font-mono">
                  {bad}
                </span>
                <span className="text-green-600 dark:text-green-400 font-mono">
                  {good}
                </span>
                <code className="text-slate-500 dark:text-slate-400 font-mono">
                  {str}
                </code>
              </div>
            ))}
          </div>

          <H3>Text formatting in annotations and prose</H3>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
            <div className="grid grid-cols-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
              <span>Syntax</span>
              <span>Effect</span>
              <span>Example</span>
            </div>
            {[
              ["$…$", "Inline math (KaTeX)", '"$f(x) = x^2$"'],
              [
                "\\[…\\]",
                "Display / block math",
                '"\\\\[\\\\int_0^1 x\\\\,dx\\\\]"',
              ],
              ["**text**", "Bold", '"**Prerequisite:**"'],
              ["*text*", "Italic", '"*Note:*"'],
              ["`text`", "Inline code (prose only)", '"`parseProse`"'],
            ].map(([syn, effect, ex], i) => (
              <div
                key={i}
                className={`grid grid-cols-3 gap-3 px-3 py-2.5 text-xs border-b border-slate-100 dark:border-slate-800 last:border-0 ${i % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-900/30"}`}
              >
                <code className="font-mono text-teal-600 dark:text-teal-400">
                  {syn}
                </code>
                <span className="text-slate-600 dark:text-slate-400">
                  {effect}
                </span>
                <code className="font-mono text-slate-400">{ex}</code>
              </div>
            ))}
          </div>

          <Note color="amber">
            <strong>Template literal tip:</strong> Use backtick strings (
            <Cb>{`\`...\``}</Cb>) for long multi-line prose fields. Inside a
            template literal, backslashes still need doubling:{" "}
            <Cb>\{"\\\\"}frac</Cb> not <Cb>\{"\\"}frac</Cb>.
          </Note>
        </div>
      )}

      {activeTab === "pipeline" && (
        <div>
          <Para>
            Different fields in a lesson file go through different rendering
            pipelines. Each pipeline has different rules.
          </Para>
          <div className="space-y-3">
            {PIPELINE_ROWS.map((row, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <code className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400">
                    {row.field}
                  </code>
                  <span className="text-xs text-slate-400 font-mono">
                    {row.where}
                  </span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
                    {row.pipeline}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {row.rules}
                  </p>
                  <CodeBlock>{row.example}</CodeBlock>
                </div>
              </div>
            ))}
          </div>
          <Note color="blue">
            <strong>Quick rule:</strong> If the field name contains "expression"
            or "latex" — no delimiters. If the field name is "annotation" — use{" "}
            <Cb>$…$</Cb>. Everything else (long prose) — full Markdown.
          </Note>
        </div>
      )}

      {activeTab === "cheatsheet" && (
        <div>
          <Para>
            Common LaTeX commands for lesson writing. Remember to double all
            backslashes inside JS strings.
          </Para>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-4">
            <div className="grid grid-cols-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
              <span>Command (in LaTeX)</span>
              <span>What it renders</span>
              <span>Example usage</span>
            </div>
            {LATEX_CHEATSHEET.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 gap-3 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0 ${i % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-900/30"}`}
              >
                <code className="font-mono text-xs text-teal-600 dark:text-teal-400 break-all">
                  {row.cmd}
                </code>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {row.output}
                </span>
                <code className="font-mono text-xs text-slate-400 break-all">
                  {row.ex}
                </code>
              </div>
            ))}
          </div>
          <Note color="green">
            <strong>In a JS string:</strong> every <Cb>\</Cb> in the LaTeX
            column above becomes <Cb>\\</Cb>. So <Cb>{"\\frac"}</Cb> → write{" "}
            <Cb>{"\\\\frac"}</Cb> in your file.
          </Note>
          <H3>Full worked example</H3>
          <CodeBlock>{`// In a math example step:
{
  expression: "\\\\frac{x^2 - 1}{x - 1}",       // KatexBlock — no $
  annotation: "Factor the numerator: $(x-1)(x+1)$, "
            + "then cancel **the common** $(x-1)$ term.",
}

// In a prose field (template literal, so no extra escaping needed):
intuition: {
  text: \`The **limit** $\\\\lim_{x \\\\to 1} \\\\frac{x^2-1}{x-1} = 2$
is found by factoring, even though direct substitution gives $\\\\frac{0}{0}$.\`,
},`}</CodeBlock>
        </div>
      )}
    </div>
  );
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────

// ─── SECTION: ABOUT ──────────────────────────────────────────────────────────
function SectionAbout() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          About UpSkillOS
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Project info, license, and how to contribute
        </p>
      </div>

      {/* Created by */}
      <section className="flex items-start gap-4 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20">
        <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-500 dark:text-rose-400 shrink-0">
          <Heart className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Created By
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            UpSkillOS was created by <strong>Michael McLean</strong>, combining
            a passion for rigorous mathematical pedagogy with interactive web
            technology. Built to be free for students everywhere.
          </p>
        </div>
      </section>

      {/* License */}
      <section className="flex items-start gap-4 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20">
        <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-500 dark:text-indigo-400 shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Open Source License — GPL-3.0
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            This project is licensed under <strong>GPL-3.0-or-later</strong> —
            free to use, modify, and distribute. Derivative works must remain
            open source; no proprietary fork is possible by design.
          </p>
        </div>
      </section>

      {/* Community */}
      <section className="p-5 rounded-2xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20 space-y-3">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200">
          Community
        </h3>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://discord.gg/epd2kYBDVt"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-sm font-semibold hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors"
          >
            🎮 Join Discord
          </a>
          <a
            href="https://github.com/g4m3rm1k3/upskillos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Github className="w-4 h-4" /> GitHub
          </a>
        </div>
      </section>

      {/* Contributing */}
      <section className="flex items-start gap-4 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20">
        <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 shrink-0">
          <Github className="w-5 h-5" />
        </div>
        <div className="space-y-3 w-full">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
              How to Contribute
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Use the Lesson Builder to write lessons visually — no setup
              required. For code-level contributions (vizualizations, features,
              bug fixes), clone the repo and open a PR.
            </p>
          </div>
          <a
            href="https://github.com/g4m3rm1k3/upskillos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
          >
            <Github className="w-4 h-4" />
            github.com/g4m3rm1k3/upskillos
          </a>
        </div>
      </section>

      {/* Dev mode tip */}
      <section className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-1.5 shrink-0">
          <kbd className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            Shift
          </kbd>
          <span className="text-slate-400 text-xs">+</span>
          <kbd className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            D
          </kbd>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Toggle <strong>Dev Mode</strong> — shows the component name on every
          visualization to help you find the right file to edit.
        </p>
      </section>
    </div>
  );
}

const SIDEBAR_COLORS = {
  rose: {
    bg: "bg-gradient-to-r from-rose-50 to-orange-50/50 dark:from-rose-500/15 dark:to-orange-500/10",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200/50 dark:border-rose-700/30",
    iconBg: "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400",
    groupHover: "hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300",
    activeGradient: 'bg-gradient-to-r from-rose-500 to-orange-600 shadow-rose-500/20',
  },
  emerald: {
    bg: "bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-emerald-500/15 dark:to-teal-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200/50 dark:border-emerald-700/30",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    groupHover: "hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300",
    activeGradient: 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/20',
  },
  violet: {
    bg: "bg-gradient-to-r from-violet-50 to-purple-50/50 dark:from-violet-500/15 dark:to-purple-500/10",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-200/50 dark:border-violet-700/30",
    iconBg: "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400",
    groupHover: "hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300",
    activeGradient: 'bg-gradient-to-r from-violet-500 to-purple-600 shadow-violet-500/20',
  },
  sky: {
    bg: "bg-gradient-to-r from-sky-50 to-blue-50/50 dark:from-sky-500/15 dark:to-blue-500/10",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-200/50 dark:border-sky-700/30",
    iconBg: "bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400",
    groupHover: "hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300",
    activeGradient: 'bg-gradient-to-r from-sky-500 to-blue-600 shadow-sky-500/20',
  },
  fuchsia: {
    bg: "bg-gradient-to-r from-fuchsia-50 to-pink-50/50 dark:from-fuchsia-500/15 dark:to-pink-500/10",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-fuchsia-200/50 dark:border-fuchsia-700/30",
    iconBg: "bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400",
    groupHover: "hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 hover:text-fuchsia-700 dark:hover:text-fuchsia-300",
    activeGradient: 'bg-gradient-to-r from-fuchsia-500 to-pink-600 shadow-fuchsia-500/20',
  },
  indigo: {
    bg: "bg-gradient-to-r from-indigo-50 to-blue-50/50 dark:from-indigo-500/15 dark:to-blue-500/10",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200/50 dark:border-indigo-700/30",
    iconBg: "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    groupHover: "hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300",
    activeGradient: 'bg-gradient-to-r from-indigo-500 to-blue-600 shadow-indigo-500/20',
  },
  amber: {
    bg: "bg-gradient-to-r from-amber-50 to-yellow-50/50 dark:from-amber-500/15 dark:to-yellow-500/10",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200/50 dark:border-amber-700/30",
    iconBg: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
    groupHover: "hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300",
    activeGradient: 'bg-gradient-to-r from-amber-500 to-yellow-600 shadow-amber-500/20',
  },
  brand: {
    bg: "bg-gradient-to-r from-brand-50 to-indigo-50/50 dark:from-brand-500/10 dark:to-indigo-500/5",
    text: "text-brand-700 dark:text-brand-300",
    border: "border-brand-200/50 dark:border-brand-700/30",
    iconBg: "bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400",
    groupHover: "hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200",
    activeGradient: 'bg-gradient-to-r from-brand-500 to-indigo-600 shadow-brand-500/20',
  }
};

const NAV = [
  {
    group: "Feedback & Bugs",
    items: [{ id: "feedback", label: "Feedback & Bugs", Icon: Bug, color: 'rose' }],
  },
  {
    group: "Start Here",
    items: [
      { id: "overview", label: "How to Contribute", Icon: BookOpen, color: 'emerald' },
      { id: "first-lesson", label: "Your First Lesson", Icon: Play, color: 'emerald' },
      { id: "anatomy", label: "Cell Types", Icon: Eye, color: 'emerald' },
    ],
  },
  {
    group: "Content",
    items: [
      { id: "types", label: "Lesson Types", Icon: Layers, color: 'violet' },
      { id: "formatting", label: "Formatting Guide", Icon: FileText, color: 'violet' },
    ],
  },
  {
    group: "Code & Python",
    items: [{ id: "opencalc", label: "opencalc Library", Icon: Terminal, color: 'sky' }],
  },
  {
    group: "Visualizations",
    items: [
      { id: "use-viz", label: "Using Vizs", Icon: Zap, color: 'fuchsia' },
      { id: "build-viz", label: "Building Vizs", Icon: Code2, color: 'fuchsia' },
    ],
  },
  {
    group: "Quality",
    items: [{ id: "standards", label: "Content Standards", Icon: CheckSquare, color: 'emerald' }],
  },
  {
    group: "AI Generation",
    items: [{ id: "ai-prompts", label: "AI Prompts", Icon: Bot, color: 'indigo' }],
  },
  {
    group: "Help",
    items: [
      { id: "troubleshooting", label: "Troubleshooting", Icon: Wrench, color: 'amber' },
      { id: "about", label: "About", Icon: Heart, color: 'rose' },
    ],
  },
];

const SECTION_MAP = {
  feedback: SectionFeedback,
  overview: SectionOverview,
  "first-lesson": SectionFirstLesson,
  anatomy: SectionAnatomy,
  types: SectionTypes,
  formatting: SectionFormatting,
  opencalc: SectionOpencalc,
  "use-viz": SectionUseViz,
  "build-viz": SectionBuildViz,
  standards: SectionStandards,
  "ai-prompts": SectionAIPrompts,
  troubleshooting: SectionTroubleshooting,
  about: SectionAbout,
};

// ─── MAIN MODAL ──────────────────────────────────────────────────────────────

export default function HelpModal({ isOpen, onClose }) {
  const [activeSection, setActiveSection] = useState("feedback");
  const tour = useTour();

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const ActiveSection = SECTION_MAP[activeSection] ?? SectionOverview;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md transition-all duration-300 ease-out"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[96vh] sm:h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.3)] dark:shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent bar at the top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-400 via-indigo-500 to-purple-500 z-50"></div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-40 relative">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Contributor Guide
              </h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Lesson Builder <span className="opacity-50 mx-1">•</span> Viz Builder <span className="opacity-50 mx-1">•</span> Code path
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Reachable at every screen width, unlike Delta's panel — the one way to reopen the tour on a phone. */}
            {tour && (
              <button
                onClick={() => { onClose(); tour.startTour(); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                Take the tour
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              aria-label="Close docs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden relative bg-slate-50/30 dark:bg-slate-950/30">
          {/* Left nav — desktop */}
          <nav className="hidden sm:block w-64 shrink-0 border-r border-slate-200/60 dark:border-white/5 bg-white/50 dark:bg-slate-900/50 overflow-y-auto py-5 px-3 z-30 sidebar-scroll">
            {NAV.map((group) => (
              <div key={group.group} className="mb-6">
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  {group.group}
                  <span className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></span>
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = activeSection === item.id;
                    const c = SIDEBAR_COLORS[item.color || 'brand'];
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`group flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? `${c.bg} ${c.text} shadow-sm border ${c.border}`
                            : `text-slate-600 dark:text-slate-400 border border-transparent ${c.groupHover}`
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg transition-colors ${isActive ? c.iconBg : "bg-transparent text-slate-400 group-hover:text-inherit"}`}>
                          <item.Icon className="w-4 h-4 shrink-0" />
                        </div>
                        <span className="tracking-tight">{item.label}</span>
                        {isActive && (
                          <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Mobile tabs */}
          <div className="sm:hidden w-full shrink-0 flex gap-2 overflow-x-auto px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md absolute top-0 left-0 z-40 shadow-sm sidebar-scroll">
            {NAV.flatMap((g) => g.items).map((item) => {
              const c = SIDEBAR_COLORS[item.color || 'brand'];
              const isActive = activeSection === item.id;
              return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 border ${
                  isActive 
                    ? `${c.activeGradient} text-white border-transparent shadow-md` 
                    : `bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 ${c.groupHover}`
                }`}
              >
                <item.Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            )})}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 sm:mt-0 mt-[68px] bg-transparent sidebar-scroll">
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ActiveSection key={activeSection} onNavigate={onClose} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
