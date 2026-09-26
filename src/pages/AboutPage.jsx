import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import UniverseBackground from "../components/backgrounds/UniverseBackground.jsx";
// Counts and the course list come from the generated inventory (npm run facts), so they never
// drift from what the app actually contains.
import PROJECT_FACTS from "../data/projectFacts.json";

const COUNTS = PROJECT_FACTS.counts;

// ── Animation hook ─────────────────────────────────────────────────────────────
function useFadeIn(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function FadeSection({ children, className = "", delay = 0 }) {
  const [ref, visible] = useFadeIn();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

function SectionBadge({ children, color = "indigo" }) {
  const cols = {
    indigo: "border-indigo-500/30 bg-indigo-900/20 text-indigo-300",
    cyan: "border-cyan-500/30 bg-cyan-900/20 text-cyan-300",
    violet: "border-violet-500/30 bg-violet-900/20 text-violet-300",
    rose: "border-rose-500/30 bg-rose-900/20 text-rose-300",
    amber: "border-amber-500/30 bg-amber-900/20 text-amber-300",
    emerald: "border-emerald-500/30 bg-emerald-900/20 text-emerald-300",
    fuchsia: "border-fuchsia-500/30 bg-fuchsia-900/20 text-fuchsia-300",
    teal: "border-teal-500/30 bg-teal-900/20 text-teal-300",
  };
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur-sm mb-4 ${cols[color] ?? cols.indigo}`}
    >
      {children}
    </div>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────────

const STATS = [
  {
    value: String(COUNTS.courses),
    label: "Courses",
    icon: "📚",
    color: "text-indigo-300",
    border: "border-indigo-500/25",
    glow: "rgba(99,102,241,0.1)",
  },
  {
    value: String(COUNTS.labs),
    label: "Interactive Labs",
    icon: "🔬",
    color: "text-cyan-300",
    border: "border-cyan-500/25",
    glow: "rgba(6,182,212,0.1)",
  },
  {
    value: String(COUNTS.games),
    label: "STEM Games",
    icon: "🎮",
    color: "text-fuchsia-300",
    border: "border-fuchsia-500/25",
    glow: "rgba(217,70,239,0.1)",
  },
  {
    value: "∞",
    label: "Cost. Forever.",
    icon: "❤️",
    color: "text-rose-300",
    border: "border-rose-500/25",
    glow: "rgba(244,63,94,0.1)",
  },
];

// Real GitHub contributors — add to this list as more PRs land
const CONTRIBUTORS = [
  {
    username: "natural-mess",
    url: "https://github.com/natural-mess",
    avatar: "https://github.com/natural-mess.png",
  },
  {
    username: "John-Swindell",
    url: "https://github.com/John-Swindell",
    avatar: "https://github.com/John-Swindell.png",
  },
];

// Domain headings are hand-written; the courses under each come from each course's meta.json.
const DOMAIN_STYLES = [
  { domain: "math", icon: "∑", label: "Mathematics", color: "text-indigo-300", border: "border-indigo-500/20", bg: "bg-indigo-900/10" },
  { domain: "science", icon: "⚛", label: "Natural Sciences", color: "text-cyan-300", border: "border-cyan-500/20", bg: "bg-cyan-900/10" },
  { domain: "cs", icon: "⌨", label: "Programming", color: "text-emerald-300", border: "border-emerald-500/20", bg: "bg-emerald-900/10" },
  { domain: "data", icon: "⟁", label: "Data & AI", color: "text-violet-300", border: "border-violet-500/20", bg: "bg-violet-900/10" },
  { domain: "engineering", icon: "⚙", label: "Engineering & Hardware", color: "text-amber-300", border: "border-amber-500/20", bg: "bg-amber-900/10" },
  { domain: "creative", icon: "∇", label: "Creative & Project-Driven", color: "text-rose-300", border: "border-rose-500/20", bg: "bg-rose-900/10" },
];
const OTHER_DOMAIN = { icon: "◇", label: "Other", color: "text-slate-300", border: "border-slate-500/20", bg: "bg-slate-900/10" };
const courseLine = (c) => (c.description ? `${c.label} — ${c.description}` : c.label);
const COURSES_BY_DOMAIN = [
  ...DOMAIN_STYLES.map((d) => ({ ...d, courses: PROJECT_FACTS.courses.filter((c) => c.domain === d.domain).map(courseLine) })),
  { ...OTHER_DOMAIN, courses: PROJECT_FACTS.courses.filter((c) => !DOMAIN_STYLES.some((d) => d.domain === c.domain)).map(courseLine) },
].filter((d) => d.courses.length > 0);

const LABS_HIGHLIGHTS = [
  {
    icon: "🔬",
    name: "Sim Lab",
    desc: "Build physics simulations — orbital mechanics, springs, particles — with Monaco + live Three.js sandbox.",
  },
  {
    icon: "🦾",
    name: "Robot Arm Simulator",
    desc: "19 missions. 2D/6-DOF 3D arm. FK, IK, 4×4 transforms, obstacle avoidance, Fanuc TP. Python & MATLAB.",
  },
  {
    icon: "🚁",
    name: "Drone Lab",
    desc: "Program a self-flying drone across 10 missions — vectors, dot/cross products, Bézier paths, PID control.",
  },
  {
    icon: "🏭",
    name: "PLC Ladder Logic Lab",
    desc: "8 exercises from motor start/stop to full FSM state machines. Allen-Bradley XIC, TON, CTU — real industrial.",
  },
  {
    icon: "🔧",
    name: "CNC Simulator",
    desc: "Write G-code, watch a live 3D backplot, manage fixtures. Real machining workflow in the browser.",
  },
  {
    icon: "⚡",
    name: "Logic Suite",
    desc: "Design and simulate digital circuits gate-by-gate with interactive truth tables and propagation.",
  },
  {
    icon: "⊕",
    name: "Matrix 3D Lab",
    desc: "Manipulate a 3D object live — translate, rotate, scale — and watch the 4×4 matrix update in real time.",
  },
  {
    icon: "⊗",
    name: "Decomp Lab",
    desc: "Compress a real image via SVD. Fit curves with least squares. Linear algebra you can see and feel.",
  },
  {
    icon: "🧪",
    name: "Chemistry Lab",
    desc: "Explore reactions, the periodic table, and molecular structures through interactive 3D models.",
  },
  {
    icon: "🎵",
    name: "Music Lab",
    desc: "Step sequencer, synth, piano roll, FX chain, and mixer — a full DAW powered by Tone.js.",
  },
  {
    icon: "🔬",
    name: "CodeLens",
    desc: "Paste JS and watch it execute: token stream, AST, live heap graph, call stack, scope chain explained.",
  },
  {
    icon: "📓",
    name: "Notebook Lab",
    desc: "Run Python notebooks in the browser — write, execute, download .ipynb, or import from GitHub.",
  },
  {
    icon: "⚛️",
    name: "React 0 to Mastery",
    desc: "27 narrated lessons from raw React elements to advanced patterns — hooks, context, reducers, Suspense.",
  },
  {
    icon: "🎨",
    name: "CSS 0 to Mastery",
    desc: "Deep-dive into the browser layout engine through multi-tab challenges — flexbox, grid, stacking contexts.",
  },
  {
    icon: "21",
    name: "Probability Casino Lab",
    desc: "Cards, dice, blackjack — learn expected value, conditional probability, and card counting through play.",
  },
  {
    icon: "⚙️",
    name: "5-Axis Kinematics",
    desc: "Visualize 5-axis CNC live — homogeneous transforms, surface normals, lead/lag angles, swarf cutting.",
  },
  {
    icon: "⚛️",
    name: "OpenMAT",
    desc: "Full math computation engine — symbolic algebra, 3D graphing, matrix tools in one workspace.",
  },
  {
    icon: "🧩",
    name: "DSA + Design Patterns",
    desc: "Arrays, trees, graphs alongside Factory, Iterator, Command patterns. TypeScript throughout.",
  },
];

const GAMES_HIGHLIGHTS = [
  {
    icon: "🎲",
    name: "Rubik's Cube",
    desc: "Group theory, permutations, and non-commutativity through the world's most famous puzzle.",
  },
  {
    icon: "λ",
    name: "Linear Algebra Game",
    desc: "Seven interactive lessons — vectors, transforms, determinants, and eigenvectors through gameplay.",
  },
  {
    icon: "🟦",
    name: "STEM Tetris",
    desc: "Classic Tetris with six STEM lenses: matrix ops, 2×2 transforms, probability distributions.",
  },
  {
    icon: "🌀",
    name: "Vector Asteroids",
    desc: "Blast rocks through 10 waves — velocity, dot products, and matrix transforms via arcade gameplay.",
  },
  {
    icon: "🚀",
    name: "Vector Command 3D",
    desc: "Full 3D mission campaign: use RREF, cross products, and integrals to intercept targets in R³.",
  },
  {
    icon: "🎲",
    name: "Card Quest",
    desc: "Master counting, probability, permutations, statistics, and linear algebra through cards and dice.",
  },
  {
    icon: "🏀",
    name: "Basketball Lab",
    desc: "Trajectory and calculus — tune your arc through real projectile physics.",
  },
  {
    icon: "🎱",
    name: "Physics Pool",
    desc: "Elastic collisions, bank angles, and geometry on the felt.",
  },
  {
    icon: "⛳",
    name: "Mini Golf",
    desc: "Geometry and projectile motion to sink every putt.",
  },
  {
    icon: "🏈",
    name: "Football Calculus",
    desc: "Integration and optimization to analyze routes and optimize trajectories.",
  },
];

const TOOLS = [
  {
    icon: "📈",
    name: "2D Grapher",
    desc: "Plot any function, parametric curve, or inequality with real-time rendering.",
  },
  {
    icon: "🌐",
    name: "3D Grapher",
    desc: "Surface plots, vector fields, and 3D parametric curves powered by Three.js.",
  },
  {
    icon: "🔬",
    name: "JSXGraph Pro",
    desc: "Geometric constructions, live calculus animations, and theorem visualizations.",
  },
  {
    icon: "🐍",
    name: "Python Terminal",
    desc: "Full Python runtime (Pyodide + WebAssembly) with NumPy, Pandas, and the opencalc viz library.",
  },
  {
    icon: "☁️",
    name: "JS Playground",
    desc: "Run JavaScript snippets with live console output, right in the lesson.",
  },
  {
    icon: "📝",
    name: "Scratchpad",
    desc: "Floating math notepad — equations, freehand drawing, and calculation history.",
  },
  {
    icon: "🧮",
    name: "TI Calculator",
    desc: "Fully emulated graphing calculator for quick numerical work.",
  },
  {
    icon: "Σ",
    name: "Sigma Calculator",
    desc: "Summation and series tool — compute partial sums and explore convergence.",
  },
  {
    icon: "⊡",
    name: "Matrix Reducer",
    desc: "Step-by-step RREF — see every row operation annotated and explained.",
  },
  {
    icon: "📓",
    name: "Notebook Lab",
    desc: "Jupyter-compatible Python notebooks — write, run, and download .ipynb files.",
  },
];

const PLATFORM_FEATURES = [
  {
    icon: "🤖",
    title: "AI Tutor — Delta",
    color: "from-indigo-500 to-violet-500",
    border: "border-indigo-500/25",
    glow: "rgba(99,102,241,0.1)",
    desc: "A context-aware AI tutor embedded in every lesson. Delta knows exactly which lesson, which concept, and which visualizations are on screen — giving targeted help rather than generic answers.",
  },
  {
    icon: "📊",
    title: "Progress Tracking",
    color: "from-emerald-500 to-teal-500",
    border: "border-emerald-500/25",
    glow: "rgba(16,185,129,0.1)",
    desc: "Completion tracking across every lesson and quiz. Progress is persisted locally and optionally synced to the cloud (Firebase) so it follows you across devices.",
  },
  {
    icon: "📅",
    title: "Study Calendar",
    color: "from-cyan-500 to-blue-500",
    border: "border-cyan-500/25",
    glow: "rgba(6,182,212,0.1)",
    desc: "A full-featured calendar to schedule study sessions, track deadlines, and see your lesson completions as auto-generated progress events — with browser notifications.",
  },
  {
    icon: "🧠",
    title: "Brain — Flash Workspace",
    color: "from-violet-500 to-purple-500",
    border: "border-violet-500/25",
    glow: "rgba(139,92,246,0.1)",
    desc: "A personal workspace for spaced-repetition notes, concept maps, and review decks — built to reinforce long-term retention alongside active lessons.",
  },
  {
    icon: "❤️",
    title: "Health Tracker",
    color: "from-rose-500 to-pink-500",
    border: "border-rose-500/25",
    glow: "rgba(244,63,94,0.1)",
    desc: "An integrated health and wellness tracker. Log workouts, nutrition, sleep, and recovery. Connects to an RPG workout system that turns fitness into a leveling mechanic.",
  },
  {
    icon: "📐",
    title: "Formula Atlas",
    color: "from-teal-500 to-emerald-500",
    border: "border-teal-500/25",
    glow: "rgba(20,184,166,0.1)",
    desc: "A comprehensive math and science formula reference organized by domain — calculus, linear algebra, statistics, physics, chemistry — fully searchable and rendered with KaTeX.",
  },
  {
    icon: "📺",
    title: "Floating Video Player",
    color: "from-sky-500 to-blue-500",
    border: "border-sky-500/25",
    glow: "rgba(14,165,233,0.1)",
    desc: "Watch supplementary lecture videos in a floating, resizable player while reading the lesson or working through code problems — learn at your own pace.",
  },
];

const PHILOSOPHY = [
  {
    step: "01",
    label: "Hook",
    icon: "🎯",
    color: "from-indigo-400 to-violet-400",
    desc: "A real-world question that makes the concept feel necessary before you study it.",
  },
  {
    step: "02",
    label: "Intuition",
    icon: "💡",
    color: "from-cyan-400 to-blue-400",
    desc: "Geometric or physical reasoning paired with an interactive live visualization.",
  },
  {
    step: "03",
    label: "Math",
    icon: "∑",
    color: "from-violet-400 to-purple-400",
    desc: "Precise definitions, theorems, and worked examples — rigorously grounded.",
  },
  {
    step: "04",
    label: "Rigor",
    icon: "⊢",
    color: "from-rose-400 to-pink-400",
    desc: "Step-by-step proof synchronized with a live visualization to seal the idea in.",
  },
];

const STACK = [
  {
    name: "React 18 + Vite",
    role: "UI framework & fast build pipeline",
    icon: "⚡",
  },
  {
    name: "Three.js",
    role: "3D interactive visualizations & simulations",
    icon: "🌐",
  },
  {
    name: "D3.js",
    role: "2D data visualizations & function graphs",
    icon: "📊",
  },
  { name: "KaTeX", role: "Beautiful, fast math rendering", icon: "∑" },
  {
    name: "Pyodide (WASM)",
    role: "Full Python runtime — no server needed",
    icon: "🐍",
  },
  {
    name: "Monaco Editor",
    role: "VS Code editor embedded in labs",
    icon: "📝",
  },
  { name: "Tone.js", role: "Web audio for the Music Lab", icon: "🎵" },
  {
    name: "Tailwind CSS",
    role: "Utility-first styling with full dark mode",
    icon: "🎨",
  },
  { name: "Firebase", role: "Auth & cross-device progress sync", icon: "☁️" },
  {
    name: "Framer Motion",
    role: "Smooth animations and transitions",
    icon: "✨",
  },
  {
    name: "React Router",
    role: "Client-side routing and code splitting",
    icon: "🗺️",
  },
];

const ROADMAP_DONE = [
  `${COUNTS.courses} courses across math, science, CS, engineering, data, and creative domains`,
  "Python runtime in the browser — no install, real NumPy, Pandas, and opencalc",
  "JavaScript notebooks, Monaco editor, and a full code playground",
  `${COUNTS.labs} interactive labs — simulations, simulators, visualizers, and full environments`,
  `${COUNTS.games} STEM games — arcade, puzzle, sports, and adventure formats`,
  "AI Tutor (Delta) with lesson-aware context in every page",
  "Global course/lab/game search, calendar, brain workspace, health tracker",
  "Formula Atlas for math and science reference",
  "CodeLens — JavaScript AST and execution visualizer",
  "React and CSS mastery interactive learning environments",
  "Drone Lab, Robot Arm Simulator, PLC Lab, 5-Axis Kinematics",
  "Music Lab — step sequencer, synth, piano roll, FX chain",
  "Progress tracking synced to Firebase across devices",
];

const ROADMAP_NEXT = [
  "Deeper proof coverage — real analysis, topology, abstract algebra",
  "Differential equations and advanced probability/statistics",
  "More project-driven courses — build a raytracer, build a physics engine",
  "Ongoing content quality pass — richer visualizations, more worked examples",
];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AboutPage() {
  return (
    <div className="relative min-h-screen -mt-10 -mx-4 sm:-mx-6 lg:-mx-8 -mb-10 overflow-x-hidden">
      <UniverseBackground />
      <div className="relative z-10">
        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <section className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-24">
          <FadeSection>
            <SectionBadge color="indigo">ℹ️ About</SectionBadge>
          </FadeSection>
          <FadeSection delay={80}>
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-none mb-6">
              <span
                className="bg-gradient-to-r from-indigo-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent"
                style={{
                  filter: "drop-shadow(0 0 40px rgba(99,102,241,0.45))",
                }}
              >
                UpSkillOS
              </span>
            </h1>
          </FadeSection>
          <FadeSection delay={140}>
            <p className="text-slate-700 dark:text-slate-300 text-xl sm:text-2xl font-light max-w-2xl leading-relaxed mb-3">
              An open-source, browser-native learning platform for the full
              stack of human knowledge.
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-3xl leading-relaxed mb-10">
              From Pre-Calculus to AI Engineering, from CNC Machining to Digital
              Logic, from CSS to C++ — {COUNTS.courses} courses, {COUNTS.labs} interactive labs,{" "}
              {COUNTS.games} STEM games, a built-in AI tutor, and an entire suite of tools. Runs
              entirely in your browser.{" "}
              <em className="text-indigo-300 not-italic font-semibold">
                Free forever.
              </em>
            </p>
          </FadeSection>
          <FadeSection delay={200}>
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {[
                "Free Forever",
                "Open Source",
                "Runs in Browser",
                "No Install Required",
                "No Account Needed",
                "Dark Mode",
              ].map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-slate-200 dark:border-white/10 bg-slate-900/5 dark:bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 backdrop-blur-sm"
                >
                  {b}
                </span>
              ))}
            </div>
          </FadeSection>
          <FadeSection delay={260}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl w-full">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className={`flex flex-col items-center gap-1 rounded-2xl border ${s.border} bg-slate-900/5 dark:bg-white/4 backdrop-blur-sm px-4 py-5`}
                  style={{ boxShadow: `0 0 20px ${s.glow}` }}
                >
                  <span className="text-2xl mb-1">{s.icon}</span>
                  <span
                    className={`text-3xl font-black leading-none ${s.color}`}
                  >
                    {s.value}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </FadeSection>
        </section>

        {/* ── CREATED BY ────────────────────────────────────────────────────── */}
        <section className="px-4 py-12 max-w-4xl mx-auto">
          <FadeSection>
            <div
              className="relative rounded-3xl border border-rose-200 dark:border-rose-500/20 bg-gradient-to-br from-rose-50 via-white to-indigo-50 dark:from-rose-950/50 dark:via-slate-950/80 dark:to-indigo-950/50 backdrop-blur-sm p-8 sm:p-12 overflow-hidden shadow-xl shadow-rose-500/5 dark:shadow-[0_0_60px_rgba(244,63,94,0.06)]"
            >
              <div className="absolute top-0 right-0 w-72 h-72 bg-rose-500/8 rounded-full blur-[80px] pointer-events-none" />
              <div className="relative z-10 grid sm:grid-cols-[auto_1fr] gap-6 items-start">
                <div className="text-5xl">❤️</div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-1">
                    Created By
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                    Michael McLean
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed mb-3">
                    UpSkillOS started as a small calculus visualizer and grew
                    into a full learning operating system — built by one person
                    with a conviction that{" "}
                    <strong className="text-slate-900 dark:text-white">
                      rigorous, free, world-class education
                    </strong>{" "}
                    should be accessible to everyone, everywhere, without a
                    paywall.
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    Every lesson, lab, game, and tool has been designed from
                    first principles. The platform is non-commercial and
                    provided freely to advance education globally.
                  </p>
                  <a
                    href="https://github.com/g4m3rm1k3/open-calc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-rose-300 hover:text-slate-900 dark:text-white transition-colors"
                  >
                    <span>⭐</span> github.com/g4m3rm1k3/open-calc
                  </a>
                </div>
              </div>
            </div>
          </FadeSection>
        </section>

        {/* ── CONTRIBUTORS ──────────────────────────────────────────────────── */}
        <section className="px-4 pb-12 max-w-4xl mx-auto">
          <FadeSection>
            <div
              className="relative rounded-3xl border border-indigo-200 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-indigo-950/50 dark:via-slate-950/80 dark:to-cyan-950/50 backdrop-blur-sm p-8 sm:p-12 overflow-hidden shadow-xl shadow-indigo-500/5 dark:shadow-[0_0_60px_rgba(99,102,241,0.06)]"
            >
              <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/8 rounded-full blur-[80px] pointer-events-none" />
              <div className="relative z-10 grid sm:grid-cols-[auto_1fr] gap-6 items-start">
                <div className="text-5xl">🙌</div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">
                    Community Contributors
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                    Built with help from real contributors
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed mb-4">
                    UpSkillOS is open source, and people outside the core
                    project have already sent real pull requests. Thank you.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {CONTRIBUTORS.map((c) => (
                      <a
                        key={c.username}
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-500/25 bg-white/60 dark:bg-white/5 pl-1.5 pr-4 py-1.5 hover:border-indigo-400 dark:hover:border-indigo-400/50 transition-colors"
                      >
                        <img
                          src={c.avatar}
                          alt={c.username}
                          className="w-7 h-7 rounded-full"
                        />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {c.username}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeSection>
        </section>

        {/* ── LESSON PHILOSOPHY ─────────────────────────────────────────────── */}
        <section className="px-4 py-20 max-w-6xl mx-auto">
          <FadeSection className="text-center mb-12">
            <SectionBadge color="violet">🧠 Methodology</SectionBadge>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              The 4-Stage Lesson Cycle
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base mt-3 max-w-xl mx-auto">
              Every lesson — from Pre-Calculus to AI Engineering — follows the
              same battle-tested structure. Intuition and rigor are not
              opposites. They reinforce each other.
            </p>
          </FadeSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PHILOSOPHY.map((s, i) => (
              <FadeSection key={s.label} delay={i * 80}>
                <div className="relative rounded-2xl border border-slate-200 dark:border-white/8 bg-white/70 dark:bg-slate-950/70 backdrop-blur-sm p-6 h-full flex flex-col gap-3 hover:border-slate-300 dark:border-white/15 hover:scale-[1.02] transition-all duration-300">
                  <div
                    className={`text-3xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent leading-none`}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <div
                      className={`text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r ${s.color} bg-clip-text text-transparent mb-0.5`}
                    >
                      Step {s.step}
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-white">
                      {s.label}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex-1">
                    {s.desc}
                  </p>
                </div>
              </FadeSection>
            ))}
          </div>
        </section>

        {/* ── COURSES ───────────────────────────────────────────────────────── */}
        <section className="px-4 py-20">
          <div className="max-w-7xl mx-auto">
            <FadeSection className="text-center mb-12">
              <SectionBadge color="indigo">📚 {COUNTS.courses} Courses</SectionBadge>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Every Domain. First Principles.
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base mt-3 max-w-2xl mx-auto">
                Structured from zero — no prerequisites assumed. Each course
                builds from motivation to intuition to proof, with interactive
                code and visualizations throughout.
              </p>
            </FadeSection>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {COURSES_BY_DOMAIN.map((domain, di) => (
                <FadeSection key={domain.label} delay={di * 60}>
                  <div
                    className={`rounded-2xl border ${domain.border} ${domain.bg} backdrop-blur-sm p-6 h-full`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span
                        className={`text-3xl font-mono font-black leading-none ${domain.color}`}
                      >
                        {domain.icon}
                      </span>
                      <h3 className={`text-base font-bold ${domain.color}`}>
                        {domain.label}
                      </h3>
                    </div>
                    <ul className="space-y-1.5">
                      {domain.courses.map((c) => (
                        <li
                          key={c}
                          className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                        >
                          <span className="text-slate-600 shrink-0 mt-0.5">
                            ›
                          </span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── LABS ──────────────────────────────────────────────────────────── */}
        <section className="px-4 py-20">
          <div className="max-w-7xl mx-auto">
            <FadeSection className="text-center mb-12">
              <SectionBadge color="cyan">🔬 {COUNTS.labs} Interactive Labs</SectionBadge>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Hands-On Environments
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base mt-3 max-w-2xl mx-auto">
                Full simulation environments, visual debuggers, industrial
                simulators, coding workstations — not just exercises, but real
                tools you actually use.
              </p>
            </FadeSection>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {LABS_HIGHLIGHTS.map((lab, i) => (
                <FadeSection key={lab.name} delay={Math.floor(i / 3) * 60}>
                  <div className="flex items-start gap-4 rounded-2xl border border-slate-200 dark:border-white/8 bg-slate-900/5 dark:bg-white/4 backdrop-blur-sm px-5 py-4 hover:border-cyan-500/30 hover:bg-cyan-900/8 transition-all duration-300 h-full group">
                    <span className="text-2xl shrink-0 mt-0.5">{lab.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-200 transition-colors">
                        {lab.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {lab.desc}
                      </div>
                    </div>
                  </div>
                </FadeSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── GAMES ─────────────────────────────────────────────────────────── */}
        <section className="px-4 py-20">
          <div className="max-w-7xl mx-auto">
            <FadeSection className="text-center mb-12">
              <SectionBadge color="fuchsia">🎮 {COUNTS.games} STEM Games</SectionBadge>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Learn Through Play
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base mt-3 max-w-2xl mx-auto">
                Real math and science behind every mechanic. Not educational
                games — games that happen to teach, because the concepts are
                built into the core loop.
              </p>
            </FadeSection>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {GAMES_HIGHLIGHTS.map((game, i) => (
                <FadeSection key={game.name} delay={Math.floor(i / 5) * 60}>
                  <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 dark:border-white/8 bg-slate-900/5 dark:bg-white/4 backdrop-blur-sm px-4 py-4 hover:border-fuchsia-500/30 hover:bg-fuchsia-900/8 transition-all duration-300 h-full group">
                    <span className="text-2xl">{game.icon}</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-fuchsia-200 transition-colors">
                      {game.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {game.desc}
                    </div>
                  </div>
                </FadeSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── PLATFORM FEATURES ─────────────────────────────────────────────── */}
        <section className="px-4 py-20">
          <div className="max-w-7xl mx-auto">
            <FadeSection className="text-center mb-12">
              <SectionBadge color="violet">✨ Platform Features</SectionBadge>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                More Than Lessons
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-base mt-3 max-w-2xl mx-auto">
                UpSkillOS is a full learning operating system — with tools,
                tracking, and features built around the learning process itself.
              </p>
            </FadeSection>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLATFORM_FEATURES.map((f, i) => (
                <FadeSection key={f.title} delay={i * 50}>
                  <div
                    className={`relative rounded-2xl border ${f.border} bg-slate-900/5 dark:bg-slate-950/60 backdrop-blur-sm p-6 h-full flex flex-col gap-3 group hover:scale-[1.02] transition-transform duration-300`}
                    style={{ boxShadow: `0 0 20px ${f.glow}` }}
                  >
                    <div
                      className={`text-3xl bg-gradient-to-r ${f.color} bg-clip-text text-transparent`}
                    >
                      {f.icon}
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {f.title}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed flex-1">
                      {f.desc}
                    </p>
                  </div>
                </FadeSection>
              ))}
            </div>
          </div>
        </section>

        {/* ── BUILT-IN TOOLS ────────────────────────────────────────────────── */}
        <section className="px-4 py-20 max-w-6xl mx-auto">
          <FadeSection className="text-center mb-12">
            <SectionBadge color="amber">⚒️ Built-In Tools</SectionBadge>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              The Toolbox
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base mt-3 max-w-xl mx-auto">
              Every tool is available from any page — no context switching. Open
              the grapher, calculator, or terminal without leaving your lesson.
            </p>
          </FadeSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TOOLS.map((t, i) => (
              <FadeSection key={t.name} delay={i * 40}>
                <div className="rounded-2xl border border-slate-200 dark:border-white/8 bg-slate-900/5 dark:bg-white/4 backdrop-blur-sm px-5 py-4 flex flex-col gap-2 hover:border-amber-500/30 hover:bg-amber-900/8 transition-all duration-300 group h-full">
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <code className="font-mono text-xs font-bold text-amber-300 group-hover:text-amber-200 transition-colors">
                      {t.name}
                    </code>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {t.desc}
                    </p>
                  </div>
                </div>
              </FadeSection>
            ))}
          </div>
        </section>

        {/* ── BROWSER NATIVE ────────────────────────────────────────────────── */}
        <section className="px-4 py-16 max-w-6xl mx-auto">
          <FadeSection>
            <div
              className="relative rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50/80 via-slate-50/90 to-cyan-50/80 dark:from-emerald-950/50 dark:via-slate-950/80 dark:to-cyan-950/50 backdrop-blur-sm p-10 sm:p-14 overflow-hidden text-center"
              style={{ boxShadow: "0 0 80px rgba(16,185,129,0.07)" }}
            >
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-emerald-500/8 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-500/8 rounded-full blur-[80px] pointer-events-none" />
              <div className="relative z-10">
                <div className="text-5xl mb-4">🐍</div>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
                  Python. In your browser. Right now.
                </h2>
                <p className="text-slate-700 dark:text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-2">
                  Powered by{" "}
                  <span className="text-emerald-600 dark:text-emerald-300 font-semibold">
                    Pyodide
                  </span>{" "}
                  (WebAssembly), students run real Python — with NumPy, Pandas,
                  and a built-in{" "}
                  <code className="font-mono text-sm bg-slate-900/5 dark:bg-white/10 px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-300">
                    opencalc
                  </code>{" "}
                  visualization library — with a single click. No install. No
                  server. No signup.
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                  JavaScript runs in an isolated sandbox. Python runs in
                  WebAssembly. Both have full consoles, error highlighting, and
                  output panels.
                </p>
              </div>
            </div>
          </FadeSection>
        </section>

        {/* ── TECH STACK ────────────────────────────────────────────────────── */}
        <section className="px-4 py-20 max-w-6xl mx-auto">
          <FadeSection className="text-center mb-12">
            <SectionBadge color="amber">⚡ Technology</SectionBadge>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Built on Modern Tech
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base mt-3 max-w-xl mx-auto">
              A pure static site — no backend, no server, no runtime costs.
              Deploy it anywhere for free.
            </p>
          </FadeSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STACK.map((s, i) => (
              <FadeSection key={s.name} delay={i * 40}>
                <div className="rounded-2xl border border-slate-200 dark:border-white/8 bg-slate-900/5 dark:bg-white/4 backdrop-blur-sm px-5 py-4 flex flex-col gap-2 hover:border-amber-500/25 hover:bg-amber-900/8 transition-all duration-300 group h-full">
                  <span className="text-xl">{s.icon}</span>
                  <div>
                    <code className="font-mono text-xs font-bold text-amber-300 group-hover:text-amber-200 transition-colors">
                      {s.name}
                    </code>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {s.role}
                    </p>
                  </div>
                </div>
              </FadeSection>
            ))}
          </div>
        </section>

        {/* ── OPEN SOURCE ───────────────────────────────────────────────────── */}
        <section className="px-4 py-16 max-w-6xl mx-auto">
          <FadeSection>
            <div
              className="group relative rounded-[32px] border border-indigo-500/30 dark:border-indigo-500/20 bg-indigo-50/80 dark:bg-indigo-950/20 backdrop-blur-xl p-10 sm:p-14 overflow-hidden transition-all duration-500 shadow-[0_8px_40px_rgba(99,102,241,0.1)] hover:shadow-[0_20px_60px_rgba(99,102,241,0.2)] dark:shadow-[0_8px_40px_rgba(99,102,241,0.05)] hover:-translate-y-1"
              style={{ boxShadow: "0 0 80px rgba(99,102,241,0.07)" }}
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/8 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/8 rounded-full blur-[100px] pointer-events-none" />
              <div className="relative z-10 grid sm:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="text-4xl mb-4">🌍</div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">
                    Open Source. Non-Commercial.
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed mb-4">
                    UpSkillOS is provided freely to advance education. It is{" "}
                    <strong className="text-slate-900 dark:text-white">
                      strictly non-commercial
                    </strong>{" "}
                    — you may not use this software, its content, or its
                    visualizations for monetary gain, commercial hosting, or
                    paid product integration.
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                    Content lives in plain JavaScript files, making it trivial
                    to contribute lessons, fix errors, or add visualizations via
                    pull request — no special tooling required.
                  </p>
                  <a
                    href="https://github.com/g4m3rm1k3/open-calc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 hover:text-slate-900 dark:text-white transition-colors"
                  >
                    <span>⭐</span> github.com/g4m3rm1k3/open-calc
                  </a>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    {
                      icon: "📁",
                      title: "Plain JS Content",
                      desc: "Lessons are just .js files — fork, edit, and PR in minutes.",
                    },
                    {
                      icon: "🚀",
                      title: "Deploy Anywhere",
                      desc: "Static site — Netlify, GitHub Pages, Vercel, S3, Cloudflare.",
                    },
                    {
                      icon: "🧪",
                      title: "Shift+D Dev Mode",
                      desc: "Toggle dev labels to find any visualization's source file instantly.",
                    },
                    {
                      icon: "📚",
                      title: "Contributor Docs",
                      desc: "Interactive guided tutorial in the ? menu — no experience required.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-white/8 bg-slate-900/5 dark:bg-white/4 px-4 py-3"
                    >
                      <span className="text-xl shrink-0">{item.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeSection>
        </section>

        {/* ── ROADMAP ───────────────────────────────────────────────────────── */}
        <section className="px-4 py-20 max-w-5xl mx-auto">
          <FadeSection className="text-center mb-12">
            <SectionBadge color="rose">🗺️ Roadmap</SectionBadge>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              What's Built. What's Next.
            </h2>
          </FadeSection>
          <div className="grid sm:grid-cols-2 gap-6">
            <FadeSection>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-900/8 backdrop-blur-sm p-6">
                <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-widest mb-4">
                  ✅ Shipped
                </h3>
                <ul className="space-y-2">
                  {ROADMAP_DONE.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                    >
                      <span className="text-emerald-500 shrink-0 mt-0.5">
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeSection>
            <FadeSection delay={100}>
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-900/8 backdrop-blur-sm p-6">
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-widest mb-4">
                  📅 Coming Next
                </h3>
                <ul className="space-y-2">
                  {ROADMAP_NEXT.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                    >
                      <span className="text-indigo-500 shrink-0 mt-0.5">›</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </FadeSection>
          </div>
        </section>

        {/* ── GET INVOLVED ──────────────────────────────────────────────────── */}
        <section className="px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <FadeSection className="text-center mb-14">
              <SectionBadge color="emerald">🌍 Community</SectionBadge>
              <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                Built by the community.
                <br />
                <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                  For the community.
                </span>
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                UpSkillOS isn't a product built behind closed doors — it's an
                open platform that grows with every person who contributes a
                lesson, finds a bug, or adds a feature. Whether you're a
                student, a self-taught developer, or an educator,{" "}
                <strong className="text-slate-900 dark:text-white">
                  your contribution belongs here.
                </strong>
              </p>
            </FadeSection>

            {/* Community ways to contribute */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
              {[
                {
                  icon: "📝",
                  title: "Write a Lesson",
                  color:
                    "border-emerald-500/25 bg-emerald-900/10 hover:border-emerald-400/40",
                  badge: "text-emerald-300",
                  desc: "Know a subject well? Write a lesson in plain JavaScript. The four-stage format (Hook → Intuition → Math → Rigor) means anyone who's learned something can teach it. No framework expertise required — just knowledge worth sharing.",
                  action: {
                    label: "→ Open Lesson Builder",
                    to: "/lesson-builder",
                  },
                },
                {
                  icon: "🔬",
                  title: "Build a Visualization",
                  color:
                    "border-cyan-500/25 bg-cyan-900/10 hover:border-cyan-400/40",
                  badge: "text-cyan-300",
                  desc: "Have an idea for an interactive that would make a concept click? Use D3, Three.js, or the JSXGraph engine built into the platform. The Viz Builder tool lets you prototype and preview without setting up a dev environment.",
                  action: { label: "→ Open Viz Builder", to: "/viz-builder" },
                },
                {
                  icon: "🐛",
                  title: "Report or Fix a Bug",
                  color:
                    "border-rose-500/25 bg-rose-900/10 hover:border-rose-400/40",
                  badge: "text-rose-300",
                  desc: "Found something broken? A formula that's wrong, a visualization that crashes, a lesson that's confusing? Open a GitHub issue. If you can fix it, open a PR — the codebase is React + Tailwind, no unusual setup.",
                  action: {
                    label: "→ GitHub Issues",
                    href: "https://github.com/g4m3rm1k3/upskillos/issues",
                  },
                },
                {
                  icon: "⭐",
                  title: "Star & Share",
                  color:
                    "border-amber-500/25 bg-amber-900/10 hover:border-amber-400/40",
                  badge: "text-amber-300",
                  desc: "The simplest way to help: star the repo so more learners find it, and share it with someone who's trying to learn calculus, break into tech, or level up their skills. Word of mouth is how this grows.",
                  action: {
                    label: "→ Star on GitHub",
                    href: "https://github.com/g4m3rm1k3/upskillos",
                  },
                },
                {
                  icon: "🌐",
                  title: "Add a Feature",
                  color:
                    "border-violet-500/25 bg-violet-900/10 hover:border-violet-400/40",
                  badge: "text-violet-300",
                  desc: "Have an idea for a new lab, tool, or game? The architecture is modular — labs, games, and tools each have their own registry and can be added without touching the core app. Check the contributor docs in the ? menu.",
                  action: {
                    label: "→ Contributor Docs",
                    href: "https://github.com/g4m3rm1k3/upskillos",
                  },
                },
                {
                  icon: "💬",
                  title: "Improve Existing Content",
                  color:
                    "border-indigo-500/25 bg-indigo-900/10 hover:border-indigo-400/40",
                  badge: "text-indigo-300",
                  desc: "Lessons are just .js files. If you see a proof that's hand-wavy, an explanation that could be clearer, or a quiz question that's ambiguous — fix it and submit a PR. Small improvements compound into something great.",
                  action: {
                    label: "→ Browse Source",
                    href: "https://github.com/g4m3rm1k3/upskillos",
                  },
                },
                {
                  icon: "🎮",
                  title: "Join the Community",
                  color:
                    "border-sky-500/25 bg-sky-900/10 hover:border-sky-400/40",
                  badge: "text-sky-300",
                  desc: "Ask questions, share what you're building, get help with lessons, and connect with other contributors. The Discord server is where the community lives — from first-time learners to core contributors.",
                  action: {
                    label: "→ Join Discord",
                    href: "https://discord.gg/epd2kYBDVt",
                  },
                },
              ].map((card, i) => (
                <FadeSection key={card.title} delay={i * 70}>
                  <div
                    className={`flex flex-col h-full rounded-2xl border ${card.color} backdrop-blur-sm p-6 transition-all duration-300`}
                  >
                    <div className="text-3xl mb-3">{card.icon}</div>
                    <div
                      className={`text-xs font-bold uppercase tracking-widest ${card.badge} mb-1`}
                    >
                      How to contribute
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
                      {card.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex-1 mb-4">
                      {card.desc}
                    </p>
                    {card.action.to ? (
                      <Link
                        to={card.action.to}
                        className={`text-xs font-bold ${card.badge} hover:text-slate-900 dark:text-white transition-colors`}
                      >
                        {card.action.label}
                      </Link>
                    ) : (
                      <a
                        href={card.action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs font-bold ${card.badge} hover:text-slate-900 dark:text-white transition-colors`}
                      >
                        {card.action.label}
                      </a>
                    )}
                  </div>
                </FadeSection>
              ))}
            </div>

            {/* Lesson Builder Spotlight */}
            <FadeSection>
                <div
                  className="group relative rounded-[32px] border border-amber-500/30 dark:border-amber-500/20 bg-amber-50/80 dark:bg-amber-950/20 backdrop-blur-xl p-10 sm:p-12 overflow-hidden transition-all duration-500 shadow-[0_8px_40px_rgba(245,158,11,0.1)] hover:shadow-[0_20px_60px_rgba(245,158,11,0.2)] dark:shadow-[0_8px_40px_rgba(245,158,11,0.05)] hover:-translate-y-1"
                >
                <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/8 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-500/6 rounded-full blur-[80px] pointer-events-none" />
                <div className="relative z-10 grid sm:grid-cols-[1fr_auto] gap-8 items-center">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2">
                      🔨 Built-In Authoring Tool
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3">
                      Lesson Builder
                    </h3>
                    <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed mb-4">
                      You don't need to clone the repo to write your first
                      lesson. The{" "}
                      <strong className="text-amber-300">Lesson Builder</strong>{" "}
                      is a visual authoring environment built into the app
                      itself — drag in prose blocks, code cells, quiz
                      checkpoints, and visualization embeds, then preview
                      exactly how the lesson will look to a student.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3 mb-6">
                      {[
                        {
                          icon: "📝",
                          text: "Prose blocks with full markdown and LaTeX support",
                        },
                        {
                          icon: "💻",
                          text: "Live Python and JavaScript code cells with output",
                        },
                        {
                          icon: "❓",
                          text: "Interactive quiz checkpoints with hints and explanations",
                        },
                        {
                          icon: "📊",
                          text: "Embed any visualization — D3, Three.js, JSXGraph",
                        },
                        {
                          icon: "👁️",
                          text: "Live preview as you build — no build step needed",
                        },
                        {
                          icon: "📤",
                          text: "Export directly to the course file format",
                        },
                      ].map((item) => (
                        <div
                          key={item.text}
                          className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                        >
                          <span className="shrink-0">{item.icon}</span>
                          <span>{item.text}</span>
                        </div>
                      ))}
                    </div>
                    <Link
                      to="/lesson-builder"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm transition-all duration-200 hover:scale-105"
                    >
                      🔨 Open Lesson Builder
                    </Link>
                  </div>
                  <div className="hidden sm:flex flex-col items-center justify-center gap-2 text-center min-w-[140px]">
                    <div className="text-6xl">🔨</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      No local setup needed
                    </div>
                  </div>
                </div>
              </div>
            </FadeSection>

            {/* GitHub banner */}
            <FadeSection delay={80}>
              <div className="group mt-6 relative rounded-[24px] border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0b0f19]/80 backdrop-blur-2xl overflow-hidden transition-all duration-500 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/20 via-transparent to-emerald-900/20 pointer-events-none opacity-0 dark:opacity-100" />
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-6">
                  <div className="text-center sm:text-left">
                    <div className="text-slate-900 dark:text-white font-bold text-lg">
                      github.com/g4m3rm1k3/upskillos
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
                      Issues · PRs · Discussions · Source code — everything is
                      open
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 shrink-0">
                    <a
                      href="https://github.com/g4m3rm1k3/upskillos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg"
                    >
                      <span>⭐</span> GitHub
                    </a>
                    <a
                      href="https://discord.gg/epd2kYBDVt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300 font-bold text-sm border border-sky-200 dark:border-sky-500/30 hover:bg-sky-100 dark:hover:bg-sky-500/30 transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md"
                    >
                      🎮 Discord
                    </a>
                  </div>
                </div>
              </div>
            </FadeSection>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section className="px-4 py-24 text-center">
          <FadeSection>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
              Learn it. Build it. Teach it.
            </p>
            <h2
              className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-indigo-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent mb-4 tracking-tight"
              style={{ filter: "drop-shadow(0 0 30px rgba(99,102,241,0.3))" }}
            >
              Master the universe of human knowledge.
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base mb-10 max-w-lg mx-auto">
              Then come back and help someone else do the same.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white font-bold text-sm transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              >
                ← Browse Curriculum
              </Link>
              <Link
                to="/lesson-builder"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm transition-all duration-200 hover:scale-105"
              >
                🔨 Build a Lesson
              </Link>
              <a
                href="https://github.com/g4m3rm1k3/upskillos"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-900/5 dark:bg-white/5 hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all duration-200 backdrop-blur-sm"
              >
                ⭐ GitHub
              </a>
              <a
                href="https://discord.gg/epd2kYBDVt"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-sky-500/25 bg-sky-900/15 hover:bg-sky-900/30 text-sky-300 font-semibold text-sm transition-all duration-200 backdrop-blur-sm"
              >
                🎮 Discord
              </a>
              <Link
                to="/reference"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/3 hover:bg-white/8 text-slate-500 dark:text-slate-400 font-medium text-sm transition-all duration-200 backdrop-blur-sm"
              >
                Formula Atlas
              </Link>
            </div>
          </FadeSection>
        </section>
      </div>
    </div>
  );
}
