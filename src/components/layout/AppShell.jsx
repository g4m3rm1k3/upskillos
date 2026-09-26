import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import AuthButton from "../ui/AuthButton.jsx";
import CubeIconButton from "../ui/CubeIconButton.jsx";
import LogoCube from "../ui/LogoCube.jsx";
import {
  Link,
  Outlet,
  useLocation,
  useParams,
  useNavigate,
} from "react-router-dom";
import { LESSON_MAP, CURRICULUM, COURSES } from "../../courses/index.js";
const GlobalGrapher = lazy(() => import("../../tools/grapher-2d/index.jsx"));
const GlobalGrapher3D = lazy(() => import("../../tools/grapher-3d/index.jsx"));
const GlobalGrapherJSX = lazy(() => import("../../tools/grapher-jsx/index.jsx"));
const ScratchPad = lazy(() => import("../../tools/scratchpad/index.jsx"));
import { TOOLS, toolsByGroup } from "../../tools/toolLoader.js";
import GrapherContext from "../../context/GrapherContext.jsx";
import {
  PlayCircle,
  Sun,
  Moon,
} from "lucide-react";
const MatrixReducer = lazy(() => import("../../tools/matrix-reducer/index.jsx"));
const MathOS = lazy(() => import("../../tools/math-os/MathOSWorkspace.tsx"));
const TICalc = lazy(() => import("../../tools/calculator/index.jsx"));
const SigmaCalc = lazy(() => import("../../tools/sigma/index.jsx"));
const PolyCalc = lazy(() => import("../../tools/polynomial/index.jsx"));
const LinearAlgebraCalc = lazy(() => import("../../tools/linear-algebra/index.jsx"));
const HelpModal = lazy(() => import("../ui/HelpModal.jsx"));
const TerminalHub = lazy(() => import("../../tools/terminal-hub/TerminalHub.jsx"));
import CompassQuickPanel from "../../features/compass/CompassQuickPanel.tsx";
import MontyAmbientNudge from "../../features/compass/components/MontyAmbientNudge.tsx";
import { useMontyContext } from "../../features/compass/MontyContext.tsx";
// Lazy: pulls in @mlc-ai/web-llm (a local LLM runtime) via useCompassAI —
// must not be in every page's bundle just because the taskbar button exists.
const MontyPanel = lazy(() => import("../../features/compass/components/MontyPanel.tsx"));
const ChatPanel = lazy(() => import("../tutor/ChatPanel.jsx"));
const PhysicsPoolLab = lazy(() => import("../../games/pool/PhysicsPoolLab.jsx"));
const BasketballLab = lazy(() => import("../../games/basketball/BasketballLab.jsx"));
const MiniGolfGame = lazy(() => import("../../games/golf/MiniGolfGame.jsx"));
const FootballCalculus = lazy(() => import("../../games/football/FootballCalculus.jsx"));
const ChemistryPage = lazy(() => import("../../labs/chemistry/ChemistryPage.tsx"));
const PhysicsPage = lazy(() => import("../../labs/physics/PhysicsPage.jsx"));
// Lazy: pulls in the 250KB+ codebaseGraph.js data file and does adjacency-list
// computation at module load — only needed when a user opts into graph view
// (default desktopMode is "home"), so it must not be in every page's bundle.
const CodeMapBackground = lazy(() => import("../backgrounds/CodeMapBackground.jsx"));
const NodePanel = lazy(() => import("../backgrounds/NodePanel.jsx"));
const HomePage = lazy(() => import("../../pages/HomePage.jsx"));

export const meta = {
  title: 'App Shell',
  description: 'Wraps every page with the top bar, sidebar, tools, background graph, and all global overlays. Pages only render content — the shell owns all layout.',
  concept: 'Layout Composition',
  conceptDetail: 'Separating shared chrome (nav, modals, overlays) from page content means pages stay focused. The shell can change structure without touching any page component.',
}
import ReferenceOverlay from "../ui/ReferenceOverlay.jsx";
import ReferencesMenu from "../ui/ReferencesMenu.jsx";
import FullscreenButton from "../desktop/FullscreenButton.jsx";
import NavClock from "../desktop/NavClock.jsx";
const TutorPanel = lazy(() => import("../tutor/TutorPanel.jsx"));
import MobileHomePage from "./MobileHomePage.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
const WhatsNewModal = lazy(() => import("../ui/WhatsNewModal.jsx"));
import { useGlobalTheme } from "../../context/ThemeContext.jsx";
import ThemePicker from "../ui/ThemePicker.jsx";

function MobileLocationBadge() {
  const { chapterId, lessonSlug } = useParams();
  if (!chapterId) return null;

  const lesson = lessonSlug ? LESSON_MAP[`${chapterId}/${lessonSlug}`] : null;
  const chapter = CURRICULUM.find(
    (c) => String(c.number) === String(chapterId),
  );

  const label = lesson ? lesson.title : chapter ? chapter.title : null;

  if (!label) return null;

  const chapterLabel = chapter
    ? /^\d+$/.test(String(chapter.number))
      ? `Ch. ${chapter.number}`
      : chapter.title
    : null;

  return (
    <div className="lg:hidden flex items-center gap-1.5 min-w-0 max-w-[160px]">
      {chapterLabel && (
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          {chapterLabel}
        </span>
      )}
      <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
    </div>
  );
}

function ToolButton({ tool }) {
  return (
    <CubeIconButton
      icon={tool.icon}
      glyph={tool.glyph}
      title={tool.label}
      colorClass={tool.colorClass ?? "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("oc-open-tool", { detail: { tool: tool.eventTool } }),
        )
      }
    />
  );
}

function NavSep({ className = "" }) {
  return <div className={`w-px h-5 bg-slate-200 dark:bg-slate-700/50 mx-1.5 flex-shrink-0 rounded-full ${className}`} />
}

import { GLASS_META } from '../../styles/courseColors.js';

function TopBar() {
  const location = useLocation();
  const isCompassActive = location.pathname.startsWith('/compass');
  const pathParts = location.pathname.split('/').filter(Boolean);
  
  let activeTopic = null;
  if (pathParts[0] === 'course' && pathParts[1]) {
    const course = Object.values(COURSES).find(c => c.id === pathParts[1]);
    if (course) activeTopic = course.topic;
  } else if (pathParts[0] === 'chapter' && pathParts[1]) {
    const chapterId = pathParts[1];
    const chapter = CURRICULUM.find(c => String(c.number) === String(chapterId));
    if (chapter && chapter.course) {
       activeTopic = COURSES[chapter.course]?.topic;
    }
  }

  const activeMeta = activeTopic && GLASS_META[activeTopic]
    ? GLASS_META[activeTopic]
    : {
        header: "from-brand-500 to-indigo-500",
        glow: "0 0 12px rgba(99, 102, 241, 0.5)",
        text: "text-brand-500",
        stop2: "text-indigo-600"
      };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] h-[52px] flex items-center px-4 gap-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">

      {/* LEFT — logo + app name + auth */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link to="/" className="flex items-center gap-2 group select-none" aria-label="Home">
          <LogoCube activeMeta={activeMeta} className="transition-all duration-300 group-hover:scale-105" />
          <span className={`text-[17px] font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${activeMeta.header} hidden sm:block filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]`}>
            UpSkillOS
          </span>
        </Link>
        <NavSep />
        <AuthButton />
      </div>

      {/* CENTER — nav links. Home is labelled here as well as on the logo, so returning to the
          catalog never depends on knowing the logo is a link. Shown at every width: this bar is
          the only navigation phones get. */}
      <div className="flex-1 flex items-center gap-1">
        <Link
          to="/"
          aria-current={location.pathname === "/" ? "page" : undefined}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 aria-[current=page]:text-slate-900 dark:aria-[current=page]:text-slate-100 transition-colors"
        >
          Home
        </Link>
        <Link
          to="/blog"
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Blog
        </Link>
      </div>

      {/* RIGHT — tools + utilities + clock */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Math/engine tool shortcuts and video/fullscreen are desktop-only —
            on mobile they'd overflow the bar, and Tools already covers
            the same ground via the bottom nav. */}
        <div className="hidden lg:flex items-center gap-1">
          {toolsByGroup("math").map((tool) => <ToolButton key={tool.key} tool={tool} />)}
          {toolsByGroup("engine").map((tool) => <ToolButton key={tool.key} tool={tool} />)}
        </div>

        <NavSep className="hidden lg:block" />

        <div className="hidden lg:flex">
          <CubeIconButton
            icon={PlayCircle}
            title="Video Player"
            colorClass="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
            onClick={() => window.dispatchEvent(new CustomEvent("oc-toggle-video"))}
          />
        </div>
        <ThemePicker />

        <div className="hidden lg:block">
          <FullscreenButton className="nav-tool-btn text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 [&>svg]:w-[18px] [&>svg]:h-[18px]" />
        </div>

        <ReferencesMenu />

        {/* Not hidden on mobile like most of this row — the Help modal's
            Feedback & Bugs section (default tab) is now the one place to
            report a bug or leave a suggestion. It used to have its own
            icon here plus one in the Taskbar plus a Start Menu entry —
            three doors to the same room. One door now. */}
        <div data-tour="report-bug">
          <CubeIconButton
            glyph="?"
            title="Contributor Docs"
            colorClass="text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 text-[15px] font-black"
            onClick={() => window.dispatchEvent(new CustomEvent('oc-toggle-help'))}
          />
        </div>

        <NavSep className="hidden lg:block" />

        {/* Phones show the time already; on narrow screens the space goes to Home and Help. */}
        <div className="hidden sm:block">
          <NavClock />
        </div>
      </div>
    </header>
  );
}

// First-visit onboarding used to be a standalone modal here. It's now hosted
// by Delta (the AI tutor) instead — see TourContext/TourSpotlight, mounted in
// App.jsx — so it can point at the real Taskbar/nav buttons it's describing
// instead of just describing them in a floating card.

export default function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isUniversalCalcRoute = location.pathname.startsWith("/universal-calc");
  const isChemistryRoute = location.pathname.startsWith("/chemistry");
  const isOpenMatRoute = location.pathname.startsWith("/openmat");
  const isCNCSimRoute = location.pathname.startsWith("/cnc-sim");
  const isCadProRoute = location.pathname.startsWith("/cad-pro");
  const isDocsRoute = location.pathname.startsWith("/studio") || location.pathname.startsWith("/docs");
  const isHealthRoute = location.pathname.startsWith("/health");
  const isBrainRoute = location.pathname.startsWith("/brain");
  const isFiveAxisRoute = location.pathname.startsWith("/five-axis");
  const isCodeLensRoute = location.pathname.startsWith("/codelens");
  const isLearnRoute = location.pathname.startsWith("/learn") || location.pathname.startsWith("/web-learn");
  const isFullPageToolRoute = location.pathname.startsWith("/notebook-lab") ||
    location.pathname.startsWith("/viz-builder") ||
    location.pathname.startsWith("/playground") ||
    location.pathname.startsWith("/lesson-builder") ||
    location.pathname.startsWith("/la-explorer") ||
    location.pathname.startsWith("/dev/abstractions");
  const isScrollableFullPageRoute = location.pathname.startsWith("/calendar") ||
    location.pathname.startsWith("/blog");
  const isFullWidthRoute = location.pathname.startsWith("/rpg-workout") ||
    location.pathname.startsWith("/brain") ||
    location.pathname.startsWith("/health");
  const isDesktopRoute = location.pathname === '/';
  const pathParts = location.pathname.split('/').filter(Boolean);
  const isLessonRoute = pathParts[0] === 'chapter' && pathParts.length >= 3;

  // Scrollable-full-page routes (blog, calendar) scroll an inner div, not
  // the window — pages' own `window.scrollTo(0, 0)` on navigation (e.g.
  // BlogPostPage's prev/next) has no effect there. Reset that container's
  // scroll position centrally whenever the route changes instead.
  const contentScrollRef = useRef(null);
  useEffect(() => {
    if (isScrollableFullPageRoute) contentScrollRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  const isMobile = useIsMobile();
  const isMobileHome = isDesktopRoute && isMobile;

  // Desktop background: 'home' (marketing home page, default) or 'graph' (codebase graph)
  const [desktopMode, setDesktopModeState] = useState(() => localStorage.getItem("oc-desktop-mode") || "home");
  const setDesktopMode = useCallback((mode) => {
    setDesktopModeState(mode);
    localStorage.setItem("oc-desktop-mode", mode);
  }, []);
  const [desktopCtxMenu, setDesktopCtxMenu] = useState(null); // { x, y }
  useEffect(() => {
    if (!desktopCtxMenu) return;
    const onKey = (e) => { if (e.key === "Escape") setDesktopCtxMenu(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [desktopCtxMenu]);
  // One-time nudge pointing at the right-click background switcher — dismissed
  // for good either by clicking the "x" or by actually discovering the menu.
  const [showDesktopHint, setShowDesktopHint] = useState(() => !localStorage.getItem("oc-desktop-hint-seen"));
  const dismissDesktopHint = useCallback(() => {
    setShowDesktopHint(false);
    localStorage.setItem("oc-desktop-hint-seen", "1");
  }, []);

  // Restore dev mode across page refreshes
  useEffect(() => {
    if (localStorage.getItem("oc-dev-mode")) {
      document.documentElement.classList.add("dev-mode");
    }
  }, []);
  const [graphOpen, setGraphOpen] = useState(false);
  const [graph3DOpen, setGraph3DOpen] = useState(false);
  const [graphJSXOpen, setGraphJSXOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [scratchOpen, setScratchOpen] = useState(false);
  const [scratchOpenFile, setScratchOpenFile] = useState(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [poolOpen, setPoolOpen] = useState(false);
  const [chemOpen, setChemOpen] = useState(false);
  const [physicsOpen, setPhysicsOpen] = useState(false);
  const [basketOpen, setBasketOpen] = useState(false);
  const [golfOpen, setGolfOpen] = useState(false);
  const [footballOpen, setFootballOpen] = useState(false);
  const [matrixReducerOpen, setMatrixReducerOpen] = useState(false);
  const [compassQuickOpen, setCompassQuickOpen] = useState(false);
  const monty = useMontyContext();
  const [mathOsOpen, setMathOsOpen] = useState(false);
  const [mathOsConfig, setMathOsConfig] = useState(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const [sigmaOpen, setSigmaOpen] = useState(false);
  const [polyOpen, setPolyOpen] = useState(false);
  const [laOpen, setLaOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [referenceKey, setReferenceKey] = useState(null);
  const [scratchSnap, setScratchSnap] = useState(null);
  const [scratchSnapW, setScratchSnapW] = useState(680);
  const handleScratchSnap = useCallback((side, w) => {
    setScratchSnap(side);
    if (w) setScratchSnapW(w);
  }, []);
  useEffect(() => {
    if (!scratchOpen) setScratchSnap(null);
  }, [scratchOpen]);
  useEffect(() => {
    document.body.dataset.chatOpen = chatOpen ? '1' : '0';
    return () => { delete document.body.dataset.chatOpen; };
  }, [chatOpen]);
  useEffect(() => {
    window.__openMathOS = (config) => {
      setMathOsConfig(config || null);
      setMathOsOpen(true);
    };
    return () => { delete window.__openMathOS; };
  }, []);
  const closeAllTools = useCallback(() => {
    setGraphOpen(false);
    setGraph3DOpen(false);
    setGraphJSXOpen(false);
    setScratchOpen(false);
    setScratchOpenFile(null);
    setCalcOpen(false);
    setSigmaOpen(false);
    setPolyOpen(false);
    setLaOpen(false);
    setTerminalOpen(false);
    setPoolOpen(false);
    setChemOpen(false);
    setPhysicsOpen(false);
    setBasketOpen(false);
    setGolfOpen(false);
    setFootballOpen(false);
  }, []);
  const [grapherLaunchConfig, setGrapherLaunchConfig] = useState(null);
  const { isDarkGlobal: dark } = useGlobalTheme();

  // openGrapher — called by any lesson/component via GrapherContext
  const openGrapher = useCallback((config) => {
    const mode = config?.mode ?? "pro";
    setGrapherLaunchConfig(config);
    setGraphOpen(false);
    setGraph3DOpen(false);
    setGraphJSXOpen(false);
    if (mode === "2d") setGraphOpen(true);
    else if (mode === "3d") setGraph3DOpen(true);
    else setGraphJSXOpen(true); // 'pro' default
  }, []);

  const grapherContextValue = useMemo(() => ({ openGrapher }), [openGrapher]);

  useEffect(() => {
    const handler = () => setChatOpen(c => !c);
    window.addEventListener('oc-toggle-chat', handler);
    return () => window.removeEventListener('oc-toggle-chat', handler);
  }, []);

  useEffect(() => {
    const handler = () => setHelpOpen(true);
    window.addEventListener('oc-toggle-help', handler);
    return () => window.removeEventListener('oc-toggle-help', handler);
  }, []);

  useEffect(() => {
    // Generic entry point for every reference/lookup overlay (formulas, LA
    // reference, concept explorer, eng math, universal calc, game rules) —
    // ReferencesMenu, StartMenu, and usePinLauncher all dispatch this instead
    // of navigating, so opening one never leaves whatever page the user was
    // actually on.
    const handler = (e) => setReferenceKey(e.detail?.key ?? null);
    window.addEventListener('oc-open-reference', handler);
    return () => window.removeEventListener('oc-open-reference', handler);
  }, []);

  useEffect(() => {
    const openScratch = (e) => {
      if (isMobile) return;
      if (e?.detail?.filePath || e?.detail?.dir) setScratchOpenFile({ filePath: e.detail.filePath, dir: e.detail.dir });
      setScratchOpen(true);
    };
    window.addEventListener("oc-open-scratchpad", openScratch);
    return () => window.removeEventListener("oc-open-scratchpad", openScratch);
  }, [isMobile]);

  useEffect(() => {
    const handler = (e) => {
      const { tool } = e.detail ?? {};
      if (tool === "math-os") setMathOsOpen(v => !v);
      else if (tool === "calculator") setCalcOpen(v => !v);
      else if (tool === "sigma") setSigmaOpen(v => !v);
      else if (tool === "polynomial") setPolyOpen(v => !v);
      else if (tool === "linear-algebra") setLaOpen(v => !v);
      else if (tool === "python" || tool === "terminal") {
        setTerminalOpen(v => {
          if (!v && tool === "python") {
            window.dispatchEvent(new CustomEvent("oc-terminal-open-tab", { detail: { type: 'python' } }));
          }
          return !v;
        });
      }
      else if (tool === "javascript") setTerminalOpen(v => !v);
      else if (tool === "scratchpad" && !isMobile) setScratchOpen(v => !v);
      else if (tool === "grapher") setGraphOpen(v => !v);
      else if (tool === "grapher-3d") setGraph3DOpen(v => !v);
      else if (tool === "jsxgraph") setGraphJSXOpen(v => !v);
      else if (tool === "matrix-reducer") setMatrixReducerOpen(v => !v);
      else if (tool === "compass-quick") setCompassQuickOpen(v => !v);
    };
    window.addEventListener("oc-open-tool", handler);
    return () => window.removeEventListener("oc-open-tool", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const { game } = e.detail ?? {};
      if (game === "basketball") setBasketOpen(true);
      else if (game === "pool") setPoolOpen(true);
      else if (game === "golf") setGolfOpen(true);
      else if (game === "football") setFootballOpen(true);
      else if (game === "chemistry") setChemOpen(true);
      else if (game === "physics") setPhysicsOpen(true);
    };
    window.addEventListener("oc-open-game", handler);
    return () => window.removeEventListener("oc-open-game", handler);
  }, []);

  if (
    isOpenMatRoute ||
    isCNCSimRoute ||
    isCadProRoute ||
    isDocsRoute ||
    isFiveAxisRoute ||
    isCodeLensRoute ||
    isLearnRoute
  ) {
    return (
      <GrapherContext.Provider value={grapherContextValue}>
        <div
          className={`h-screen overflow-hidden ${isCadProRoute || isFiveAxisRoute || isCodeLensRoute || isLearnRoute ? "bg-[#08111f]" : "bg-white dark:bg-slate-950"}`}
        >
          <div className="h-[calc(100vh-44px)] w-full overflow-hidden">
            {children ?? <Outlet />}
          </div>
          <Suspense fallback={null}>
            <GlobalGrapher
              isOpen={graphOpen}
              launchConfig={graphOpen ? grapherLaunchConfig : null}
              onClose={() => {
                setGraphOpen(false);
                setGrapherLaunchConfig(null);
              }}
              onSwitchTo3D={() => {
                setGraphOpen(false);
                setGraph3DOpen(true);
              }}
              onSwitchToJSX={() => {
                setGraphOpen(false);
                setGraphJSXOpen(true);
              }}
            />
            <GlobalGrapher3D
              isOpen={graph3DOpen}
              launchConfig={graph3DOpen ? grapherLaunchConfig : null}
              onClose={() => {
                setGraph3DOpen(false);
                setGrapherLaunchConfig(null);
              }}
              onSwitchTo2D={() => {
                setGraph3DOpen(false);
                setGraphOpen(true);
              }}
              onSwitchToJSX={() => {
                setGraph3DOpen(false);
                setGraphJSXOpen(true);
              }}
            />
            <GlobalGrapherJSX
              isOpen={graphJSXOpen}
              launchConfig={graphJSXOpen ? grapherLaunchConfig : null}
              onClose={() => {
                setGraphJSXOpen(false);
                setGrapherLaunchConfig(null);
              }}
              onSwitchTo2D={() => {
                setGraphJSXOpen(false);
                setGraphOpen(true);
              }}
              onSwitchTo3D={() => {
                setGraphJSXOpen(false);
                setGraph3DOpen(true);
              }}
            />
            {!isMobile && (
              <ScratchPad
                isOpen={scratchOpen}
                openFile={scratchOpenFile}
                onClose={() => { setScratchOpen(false); setScratchOpenFile(null); }}
                onSnap={handleScratchSnap}
              />
            )}
            {matrixReducerOpen && <MatrixReducer onBack={() => setMatrixReducerOpen(false)} />}
            {compassQuickOpen && <CompassQuickPanel onClose={() => setCompassQuickOpen(false)} />}
            <MontyAmbientNudge />
            {monty.montyOpen && (
              <MontyPanel
                plans={monty.compass.plans}
                notes={monty.compass.notes}
                flashcards={monty.compass.flashcards}
                dueFlashcards={monty.compass.dueFlashcards}
                onClose={monty.closeMonty}
                questionTitle={monty.questionTitle}
                draftTitle={monty.draftTitle}
                draftActions={monty.draftActions}
                onIntake={monty.handleIntake}
                onAnswered={monty.handleAnswered}
                onConfirm={monty.handleConfirm}
                onCancelBreakdown={monty.handleCancelBreakdown}
              />
            )}
            <TerminalHub
              isOpen={terminalOpen}
              onClose={() => setTerminalOpen(false)}
            />
            <MathOS open={mathOsOpen} onClose={() => setMathOsOpen(false)} lessonConfig={mathOsConfig} />
          </Suspense>
        </div>
      </GrapherContext.Provider>
    );
  }

  return (
      <GrapherContext.Provider value={grapherContextValue}>
        <div className={`min-h-screen transition-colors duration-500 relative ${isLessonRoute ? "bg-white dark:bg-slate-950" : ""}`}>
          {isDesktopRoute && !isMobile && desktopMode === "graph" && (
            <Suspense fallback={null}>
              <CodeMapBackground
                dark={dark}
                onNodeClick={node => setSelectedNode(node)}
              />
            </Suspense>
          )}
          {isDesktopRoute && !isMobile && desktopMode === "graph" && selectedNode && (
            <Suspense fallback={null}>
              <NodePanel node={selectedNode} onClose={() => setSelectedNode(null)} />
            </Suspense>
          )}
          {isDesktopRoute && !isMobile && desktopCtxMenu && (
            <>
              <div className="fixed inset-0 z-[1950]" onClick={() => setDesktopCtxMenu(null)} />
              <div
                className="fixed z-[1960] min-w-[180px] rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-md shadow-xl py-1.5 text-sm"
                style={{ left: desktopCtxMenu.x, top: desktopCtxMenu.y }}
              >
                {[
                  { mode: "graph", label: "🌐 Codebase Graph" },
                  { mode: "home", label: "🏠 Home Page" },
                ].map(opt => (
                  <button
                    key={opt.mode}
                    onClick={() => { setDesktopMode(opt.mode); setDesktopCtxMenu(null); }}
                    className={`w-full text-left px-3.5 py-1.5 flex items-center justify-between hover:bg-white/10 ${
                      desktopMode === opt.mode ? "text-brand-300 font-semibold" : "text-slate-200"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {desktopMode === opt.mode && <span className="text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
          {isDesktopRoute && !isMobile && showDesktopHint && !desktopCtxMenu && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1200] flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/90 backdrop-blur-md shadow-xl pl-4 pr-2 py-2 text-sm text-slate-200">
              <span>💡 Right-click the desktop to change your background</span>
              <button
                onClick={dismissDesktopHint}
                title="Dismiss"
                className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 text-xs leading-none"
              >
                ✕
              </button>
            </div>
          )}
          <TopBar />

          {/* Mobile tools backdrop */}
          {(graphOpen || graph3DOpen || graphJSXOpen) && (
            <div
              className="fixed inset-0 z-[45] bg-black/30 backdrop-blur-sm lg:backdrop-blur-none lg:bg-transparent"
              onClick={() => {
                setMobileToolsOpen(false);
                if (window.innerWidth < 1024) {
                  setGraphOpen(false);
                  setGraph3DOpen(false);
                  setGraphJSXOpen(false);
                  setTerminalOpen(false);
                }
              }}
            />
          )}

          {/* Main content */}
          <main
            className={`transition-[padding] duration-500 ease-in-out ${isChemistryRoute || isFullPageToolRoute || isScrollableFullPageRoute ? "flex flex-col h-[calc(100vh-44px)] overflow-hidden" : isFullWidthRoute ? "min-h-screen pb-4 lg:pb-11" : isDesktopRoute && !isMobile ? "h-screen" : "min-h-screen pb-4 lg:pb-11"} ${isHealthRoute || isBrainRoute ? "bg-white dark:bg-slate-950" : ""} lg:pl-0 pt-[52px]`}
            style={{
              paddingRight: scratchSnap === "right" ? `${scratchSnapW}px` : undefined,
              ...(scratchSnap === "left"
                ? { paddingLeft: `${12 + scratchSnapW}px` }
                : {}),
            }}
          >
            <div
              ref={isScrollableFullPageRoute ? contentScrollRef : undefined}
              className={
                isMobileHome
                  ? "w-full"
                  : isDesktopRoute
                  ? "w-full h-[calc(100vh-48px-44px)]"
                  : isChemistryRoute || isFullPageToolRoute
                    ? "flex-1 min-h-0 w-full flex flex-col overflow-hidden"
                    : isScrollableFullPageRoute
                      ? "flex-1 min-h-0 w-full overflow-y-auto bg-white dark:bg-slate-950"
                      : isFullWidthRoute
                      ? "w-full"
                      : isUniversalCalcRoute
                      ? "max-w-[min(98vw,2800px)] mx-auto px-2 sm:px-3 lg:px-4 py-8"
                      : `max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-all duration-500`
              }
              onContextMenu={isDesktopRoute && !isMobile ? (e) => {
                e.preventDefault();
                setDesktopCtxMenu({ x: e.clientX, y: e.clientY });
                if (showDesktopHint) dismissDesktopHint();
              } : undefined}
            >
              {isMobileHome
                ? <MobileHomePage />
                : isDesktopRoute && !isMobile && desktopMode === "home"
                  ? <Suspense fallback={null}><HomePage /></Suspense>
                  : (children ?? <Outlet />)}
            </div>
          </main>

          <Suspense fallback={null}>
            {matrixReducerOpen && <MatrixReducer onBack={() => setMatrixReducerOpen(false)} />}
            {compassQuickOpen && <CompassQuickPanel onClose={() => setCompassQuickOpen(false)} />}
            <MontyAmbientNudge />
            {monty.montyOpen && (
              <MontyPanel
                plans={monty.compass.plans}
                notes={monty.compass.notes}
                flashcards={monty.compass.flashcards}
                dueFlashcards={monty.compass.dueFlashcards}
                onClose={monty.closeMonty}
                questionTitle={monty.questionTitle}
                draftTitle={monty.draftTitle}
                draftActions={monty.draftActions}
                onIntake={monty.handleIntake}
                onAnswered={monty.handleAnswered}
                onConfirm={monty.handleConfirm}
                onCancelBreakdown={monty.handleCancelBreakdown}
              />
            )}
            <WhatsNewModal />
            <GlobalGrapher
              isOpen={graphOpen}
              launchConfig={graphOpen ? grapherLaunchConfig : null}
              onClose={() => {
                setGraphOpen(false);
                setGrapherLaunchConfig(null);
              }}
              onSwitchTo3D={() => {
                setGraphOpen(false);
                setGraph3DOpen(true);
              }}
              onSwitchToJSX={() => {
                setGraphOpen(false);
                setGraphJSXOpen(true);
              }}
            />
            <GlobalGrapher3D
              isOpen={graph3DOpen}
              launchConfig={graph3DOpen ? grapherLaunchConfig : null}
              onClose={() => {
                setGraph3DOpen(false);
                setGrapherLaunchConfig(null);
              }}
              onSwitchTo2D={() => {
                setGraph3DOpen(false);
                setGraphOpen(true);
              }}
              onSwitchToJSX={() => {
                setGraph3DOpen(false);
                setGraphJSXOpen(true);
              }}
            />
            <GlobalGrapherJSX
              isOpen={graphJSXOpen}
              launchConfig={graphJSXOpen ? grapherLaunchConfig : null}
              onClose={() => {
                setGraphJSXOpen(false);
                setGrapherLaunchConfig(null);
              }}
              onSwitchTo2D={() => {
                setGraphJSXOpen(false);
                setGraphOpen(true);
              }}
              onSwitchTo3D={() => {
                setGraphJSXOpen(false);
                setGraph3DOpen(true);
              }}
            />
            {!isMobile && (
              <ScratchPad
                isOpen={scratchOpen}
                openFile={scratchOpenFile}
                onClose={() => {
                  setScratchOpen(false);
                  setScratchSnap(null);
                  setScratchOpenFile(null);
                }}
                onSnap={handleScratchSnap}
              />
            )}
            <TerminalHub
              isOpen={terminalOpen}
              onClose={() => setTerminalOpen(false)}
            />
            <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
            <MathOS open={mathOsOpen} onClose={() => setMathOsOpen(false)} lessonConfig={mathOsConfig} />
            {calcOpen && <TICalc onClose={() => setCalcOpen(false)} />}
            {sigmaOpen && <SigmaCalc onClose={() => setSigmaOpen(false)} />}
            {polyOpen && <PolyCalc onClose={() => setPolyOpen(false)} />}
            {laOpen && <LinearAlgebraCalc onClose={() => setLaOpen(false)} />}
            {referenceKey && (
              <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
                <ReferenceOverlay activeKey={referenceKey} onClose={() => setReferenceKey(null)} />
              </div>
            )}
            {poolOpen && <PhysicsPoolLab onClose={() => setPoolOpen(false)} />}
            {basketOpen && <BasketballLab onClose={() => setBasketOpen(false)} />}
            {golfOpen && <MiniGolfGame onClose={() => setGolfOpen(false)} />}
            <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
            <TutorPanel lesson={null} />

            {footballOpen && (
              <div className="fixed inset-0 z-[200] flex flex-col bg-slate-950 overflow-auto">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏈</span>
                    <span className="font-bold text-white text-sm">
                      Football Calculus
                    </span>
                    <span className="text-xs text-slate-500 ml-2">
                      Integration · Optimization · Related Rates
                    </span>
                  </div>
                  <button
                    onClick={() => setFootballOpen(false)}
                    className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 p-4 overflow-auto">
                  <FootballCalculus />
                </div>
              </div>
            )}
            {chemOpen && (
              <div className="fixed inset-0 z-[200] flex flex-col bg-slate-950">
                <ChemistryPage onClose={() => setChemOpen(false)} />
              </div>
            )}
            {physicsOpen && (
              <div className="fixed inset-0 z-[200] flex flex-col bg-slate-950">
                <PhysicsPage onClose={() => setPhysicsOpen(false)} />
              </div>
            )}
          </Suspense>

        </div>
      </GrapherContext.Provider>
  );
}
