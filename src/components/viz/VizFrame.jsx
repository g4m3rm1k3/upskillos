import { lazy, Suspense, useEffect, useMemo, useState, Component } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";

class VizErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) {
    console.error(`[VizFrame:${this.props.vizId}]`, error.message)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
          <span className="text-2xl mb-2">⚠️</span>
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            {this.props.vizId} failed to render
          </p>
          <p className="text-xs text-red-500 dark:text-red-500 mt-1 font-mono">
            {this.state.error.message}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

// Auto-discover all viz files living in course packages
const _COURSE_VIZZES = import.meta.glob('../../courses/*/viz/*.{jsx,js}')
const VIZ_REGISTRY = Object.fromEntries(
  Object.entries(_COURSE_VIZZES).map(([path, loader]) => {
    const stem = path.split('/').pop().replace(/\.(jsx|js)$/, '')
    return [stem, lazy(loader)]
  })
)

// Residual: things not yet in a course viz folder
Object.assign(VIZ_REGISTRY, {
  // ── Shared notebook components ───────────────────────────────────────────
  // Previously duplicated into every course's viz/ folder under these same
  // names; the glob registry above silently picked whichever copy sorted
  // last alphabetically, leaving the rest as unreachable dead code. Now a
  // single canonical copy, registered explicitly so resolution doesn't
  // depend on course-folder alphabetical order.
  PythonNotebook:       lazy(() => import("../notebooks/PythonNotebook.jsx")),
  CppNotebook:          lazy(() => import("../notebooks/CppNotebook.jsx")),
  PySideNotebook:       lazy(() => import("../notebooks/PySideNotebook.jsx")),
  NativeRunNotebook:    lazy(() => import("../notebooks/NativeRunNotebook.jsx")),
  FigureRenderer:       lazy(() => import("../notebooks/FigureRenderer.jsx")),
  JSNotebook:           lazy(() => import("../notebooks/JSNotebook.jsx")),
  OpenMatNotebook:      lazy(() => import("../notebooks/OpenMatNotebook.jsx")),
  ScienceNotebook:      lazy(() => import("../../courses/geometry/viz/ScienceNotebook.jsx")),

  // ── Labs & Games (not yet in a course viz package) ──────────────────────
  MiniGolfGame:         lazy(() => import("../../games/golf/MiniGolfGame.jsx")),
  FootballCalculus:     lazy(() => import("../../games/football/FootballCalculus.jsx")),
  CNCLab:               lazy(() => import("../../labs/cnc-sim/cnc/CNCLab.jsx")),
  ErrorAccumulationLab: lazy(() => import("../../labs/cnc-sim/cnc/ErrorAccumulationLab.jsx")),
  CNCBackplot:          lazy(() => import("../../labs/cnc-sim/cnc/CNCBackplot.jsx")),
  CNCMacroLab:          lazy(() => import("../../labs/cnc-sim/cnc/CNCMacroLab.jsx")),
  GcodeNotebook:        lazy(() => import("../../labs/cnc-sim/cnc/GcodeNotebook.jsx")),
  CNCAxesExplorer:      lazy(() => import("../../labs/cnc-sim/cnc/CNCAxesExplorer.jsx")),
  CNCChainDiagram:      lazy(() => import("../../labs/cnc-sim/cnc/CNCChainDiagram.jsx")),
  CNCClosedLoopSim:     lazy(() => import("../../labs/cnc-sim/cnc/CNCClosedLoopSim.jsx")),
  CNCDialectTable:      lazy(() => import("../../labs/cnc-sim/cnc/CNCDialectTable.jsx")),
  CNCHistoryTimeline:   lazy(() => import("../../labs/cnc-sim/cnc/CNCHistoryTimeline.jsx")),
  CNCMachineTypes:      lazy(() => import("../../labs/cnc-sim/cnc/CNCMachineTypes.jsx")),
  LinearInterpolationViz: lazy(() => import("../../labs/cnc-sim/cnc/LinearInterpolationViz.jsx")),
  PLCLadderSim:         lazy(() => import("../../labs/plc-lab/plc/PLCLadderSim.jsx")),
  PLCScanCycleViz:      lazy(() => import("../../labs/plc-lab/plc/PLCScanCycleViz.jsx")),
  PLCHardwareViz:       lazy(() => import("../../labs/plc-lab/plc/PLCHardwareViz.jsx")),
  CardDiceLab:          lazy(() => import("../../labs/odds-lab/CardDiceLab.jsx")),
  LogicSim:             lazy(() => import("../../labs/logic-sim/LogicSim.jsx")),
  PeriodicTable:        lazy(() => import("../../labs/chemistry/PeriodicTable.tsx")),
  MoleculeBuilder:      lazy(() => import("../../labs/chemistry/MoleculeBuilder.tsx")),
  // Note: WhyChemistry is NOT registered here — the lesson-embeddable version
  // lives at courses/chemistry/viz/WhyChemistry.jsx and is picked up by the
  // glob above. Registering a second entry here would shadow it.
  SVGDiagram:           lazy(() => import("../../courses/calculus/viz/SVGDiagram.jsx")),
});

// Vizzes that work fine on a phone-sized screen
const PHONE_OK = new Set([
  "PythonNotebook",
  "CppNotebook",
  "OpenMatNotebook",
  "JSNotebook",
  "SQLNotebook",
  "ScienceNotebook",
  "SimNotebook",
  "VideoEmbed",
  "VideoCarousel",
  "VideoLauncher",
]);

function VizSkeleton() {
  return (
    <div className="animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg h-64 flex items-center justify-center">
      <span className="text-slate-400 dark:text-slate-500 text-sm">
        Loading visualization…
      </span>
    </div>
  );
}

export default function VizFrame({ id, initialProps = {}, title }) {
  const [params, setParams] = useState(initialProps);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPhone, setIsPhone] = useState(() => window.innerWidth < 640);
  const VizComponent = VIZ_REGISTRY[id];
  const initialPropsKey = useMemo(
    () => JSON.stringify(initialProps ?? {}),
    [initialProps],
  );
  const location = useLocation();
  // Stable per-viz-per-page identity, used only as a React re-mount key below.
  const pinId = `${id}::${location.pathname}`;

  useEffect(() => {
    setParams(initialProps ?? {});
  }, [id, initialPropsKey]);

  useEffect(() => {
    const h = () => setIsPhone(window.innerWidth < 640);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  if (!VizComponent) {
    if (import.meta.env.DEV) {
      return (
        <div className="my-4 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
          <p className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
            ⚠ Unknown viz id:{" "}
            <span className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">
              {id}
            </span>
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
            Register it in VizFrame.jsx → VIZ_REGISTRY
          </p>
        </div>
      );
    }
    return null;
  }

  // On phone-sized screens (< 640px), most interactive vizzes don't work well.
  // Show a "Desktop only" placeholder unless this viz is known to work on phones.
  if (!isExpanded && isPhone && !PHONE_OK.has(id)) {
    return (
      <div id={`viz-${id}`} className="viz-frame rounded-xl overflow-hidden">
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-3xl mb-2">🖥️</span>
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
            Desktop &amp; tablet only
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            This interactive works best on a larger screen
          </p>
        </div>
      </div>
    );
  }

  const content = (
    <VizErrorBoundary vizId={id}>
      <Suspense fallback={<VizSkeleton />}>
        <VizComponent key={pinId} params={params} onParamChange={setParams} />
      </Suspense>
    </VizErrorBoundary>
  );

  if (isExpanded) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-slate-950 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-100 truncate">
            {title || "Interactive Visualizer"}
          </h2>
          <button
            onClick={() => setIsExpanded(false)}
            className="ml-4 flex-shrink-0 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold transition-colors"
          >
            ✕ Close
          </button>
        </div>
        {/* Content — fills remaining height, scrolls if needed */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
          <div className="w-full max-w-5xl mx-auto">{content}</div>
        </div>
      </div>,
      document.body,
    );
  }

  // PHONE_OK components own their own visual presentation — VizFrame is just
  // a transparent overlay that provides expand chrome without adding a card.
  if (PHONE_OK.has(id)) {
    return (
      <div id={`viz-${id}`} className="viz-frame relative group w-full max-w-full overflow-hidden">
        <div className="dev-viz-label absolute top-0 left-0 z-[9999] items-center gap-1.5 px-2 py-1 rounded-br-lg bg-amber-400 text-slate-900 pointer-events-none select-none">
          <span className="text-[10px] font-black uppercase tracking-widest">VIZ</span>
          <span className="text-xs font-mono font-bold">{id}</span>
        </div>
        <div className="absolute top-2 right-2 z-20 hidden lg:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsExpanded(true)}
            title="Expand to Full Width"
            className="bg-slate-950 text-slate-200 px-2 py-1 flex items-center gap-1 text-xs font-bold rounded shadow-md border border-slate-700 hover:bg-brand-600 hover:border-brand-500 hover:text-white"
          >
            <span>⛶</span> Expand
          </button>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div
      id={`viz-${id}`}
      className="viz-frame relative group w-full max-w-full overflow-x-auto bg-slate-50 dark:bg-slate-900 rounded-xl"
    >
      {/* ── Dev Mode Label — hidden until html.dev-mode is toggled via Shift+D ── */}
      <div className="dev-viz-label absolute top-0 left-0 z-[9999] items-center gap-1.5 px-2 py-1 rounded-br-lg rounded-tl-xl bg-amber-400 text-slate-900 pointer-events-none select-none">
        <span className="text-[10px] font-black uppercase tracking-widest">
          VIZ
        </span>
        <span className="text-xs font-mono font-bold">{id}</span>
      </div>
      {title && (
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3 px-2 pt-2">
          {title}
        </p>
      )}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsExpanded(true)}
          title="Expand to Full Width"
          className="bg-slate-950 text-slate-200 px-2 py-1 flex items-center gap-1 text-xs font-bold rounded shadow-md border border-slate-700 hover:bg-brand-600 hover:border-brand-500 hover:text-white"
        >
          <span>⛶</span> Expand
        </button>
      </div>
      <div className="p-2">{content}</div>
    </div>
  );
}
