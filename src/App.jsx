import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ProgressProvider } from "./context/ProgressContext.jsx";
import { PinsProvider } from "./context/PinsContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import AppShell from "./components/layout/AppShell.jsx";
import { VideoPlayerProvider } from "./context/VideoPlayerContext.jsx";
import FloatingVideoPlayer from "./components/ui/FloatingVideoPlayer.jsx";
import LoadingSpinner from "./components/ui/LoadingSpinner.jsx";
import { getLabEntry } from "./labs/labLoader.js";
import { LABS } from "./labs/labRegistryLoader.js";
import { getGameEntry } from "./games/gameLoader.js";
import DesktopProvider from "./components/desktop/DesktopProvider.jsx";
import ConceptWindowProvider from "./components/desktop/ConceptWindowProvider.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";
import RootErrorBoundary from "./components/layout/RootErrorBoundary.jsx";
import { TourProvider } from "./context/TourContext.jsx";
import { MontyProvider } from "./features/compass/MontyContext.tsx";
import TourSpotlight from "./components/ui/TourSpotlight.jsx";
import TourAutoStart from "./components/ui/TourAutoStart.jsx";

const DesktopPage = lazy(() => import("./pages/DesktopPage.jsx"));
const ChapterPage = lazy(() => import("./pages/ChapterPage.jsx"));
const LessonPage = lazy(() => import("./pages/LessonPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const AboutPage = lazy(() => import("./pages/AboutPage.jsx"));
const ReferencePage = lazy(() => import("./pages/ReferencePage.jsx"));
const CoursePage = lazy(() => import("./pages/CoursePage.jsx"));
const MarkdownHub = lazy(() => import("./components/docs/MarkdownHub.jsx"));
const HealthTrackerPage = lazy(() => import("./games/HealthTrackerPage.jsx"));
const ConceptPreviewPage = lazy(() => import("./pages/ConceptPreviewPage.jsx"));
const RPGWorkoutPage = lazy(() => import("./features/rpg/RPGWorkoutPage.jsx"));
const BrainPage = lazy(() => import("./features/brain/BrainPage.jsx"));
const EntryShell = lazy(() => import("./pages/EntryShell.jsx"));
const LinearAlgebraReferencePage = lazy(
  () => import("./pages/LinearAlgebraReferencePage.jsx"),
);
const LAConceptExplorerPage = lazy(
  () => import("./pages/LAConceptExplorerPage.jsx"),
);
const RegexReferencePage = lazy(
  () => import("./pages/RegexReferencePage.jsx"),
);
const RegexConceptExplorerPage = lazy(
  () => import("./pages/RegexConceptExplorerPage.jsx"),
);
const LatexFieldNotesPage = lazy(
  () => import("./pages/LatexFieldNotesPage.jsx"),
);
const PlaygroundPage = lazy(() => import("./pages/PlaygroundPage.jsx"));
const CalendarPage = lazy(() => import("./features/calendar/CalendarPage.tsx"));
const CompassPage = lazy(() => import("./features/compass/CompassPage.tsx"));
const BlogListPage = lazy(() => import("./pages/BlogListPage.jsx"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage.jsx"));
const BlogBuilderPage = lazy(() => import("./pages/BlogBuilderPage.jsx"));
const SvgGalleryPage = lazy(() => import("./pages/SvgGalleryPage.jsx"));
const EngMathPage = lazy(() => import("./pages/EngMathPage.jsx"));
const SceneSandboxPage = lazy(() => import("./pages/SceneSandboxPage.jsx"));
const SceneEditorPage = lazy(() => import("./pages/SceneEditorPage.jsx"));
const CanvasTutorialsPage = lazy(() => import("./pages/CanvasTutorialsPage.jsx"));
const AbstractionViz = lazy(() => import("./components/abstraction-viz/AbstractionViz.jsx"));
const NotificationToast = lazy(
  () => import("./features/calendar/NotificationToast.tsx"),
);

const Fallback = () => (
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner size="lg" />
  </div>
);

export const meta = {
  title: "App Root",
  description:
    "Entry point — wires every context provider, sets up React Router, and lazy-loads all pages and labs so the initial bundle stays small.",
  concept: "Code Splitting",
  conceptDetail:
    "React.lazy() + Suspense defers each page's bundle until the user navigates there. Only the code actually needed gets downloaded.",
};

import LaserCursor from './components/ui/LaserCursor'
import { ThemeProvider } from "./context/ThemeContext.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <ProgressProvider>
          <PinsProvider>
            <VideoPlayerProvider>
              <HashRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <TourProvider>
                  <MontyProvider>
                  <ChatProvider>
                  <DesktopProvider>
                  <ConceptWindowProvider>
                    <FloatingVideoPlayer />
                    <Suspense fallback={null}>
                      <NotificationToast />
                    </Suspense>
                    <TourAutoStart />
                    <TourSpotlight />
                    <RootErrorBoundary>
                      <AppShell>
                        <Suspense fallback={<Fallback />}>
                          <Routes>
                            <Route index element={<DesktopPage />} />
                            <Route
                              path="course/:courseKey"
                              element={<CoursePage />}
                            />
                            <Route
                              path="chapter/:chapterId"
                              element={<ChapterPage />}
                            />
                            <Route
                              path="chapter/:chapterId/:lessonSlug"
                              element={<LessonPage />}
                            />
                            <Route
                              path="chapter/:chapterId/:lessonSlug/*"
                              element={<LessonPage />}
                            />
                            <Route path="profile" element={<ProfilePage />} />
                            <Route path="about" element={<AboutPage />} />
                            <Route
                              path="reference"
                              element={<ReferencePage />}
                            />
                            <Route
                              path="linear-algebra"
                              element={<LinearAlgebraReferencePage />}
                            />
                            <Route
                              path="la-explorer"
                              element={<LAConceptExplorerPage />}
                            />
                            <Route
                              path="regex-reference"
                              element={<RegexReferencePage />}
                            />
                            <Route
                              path="regex-explorer"
                              element={<RegexConceptExplorerPage />}
                            />
                            <Route
                              path="courses"
                              element={<Navigate to="/" replace />}
                            />
                            <Route path="studio" element={<MarkdownHub />} />
                            <Route
                              path="docs"
                              element={<Navigate to="/studio" replace />}
                            />
                            <Route
                              path="games"
                              element={<Navigate to="/" replace />}
                            />
                            <Route
                              path="health"
                              element={<HealthTrackerPage />}
                            />
                            <Route
                              path="concept-preview"
                              element={<ConceptPreviewPage />}
                            />
                            <Route
                              path="rpg-workout"
                              element={<RPGWorkoutPage />}
                            />
                            <Route path="brain" element={<BrainPage />} />
                            <Route path="calendar" element={<CalendarPage />} />
                            <Route path="compass" element={<CompassPage />} />
                            <Route path="blog" element={<BlogListPage />} />
                            <Route path="blog/new" element={<BlogBuilderPage />} />
                            <Route path="blog/*" element={<BlogPostPage />} />
                            <Route path="svg-gallery" element={<SvgGalleryPage />} />
                            <Route path="eng-math" element={<EngMathPage />} />
                            <Route path="eng-math/:slug" element={<EngMathPage />} />
                            <Route path="dev/scenes" element={<SceneSandboxPage />} />
                            <Route path="dev/scene-editor" element={<SceneEditorPage />} />
                            <Route path="dev/canvas-tutorials" element={<CanvasTutorialsPage />} />
                            <Route path="dev/canvas-tutorials/:tutorialId" element={<CanvasTutorialsPage />} />
                            <Route path="dev/canvas-tutorials/:tutorialId/:stepId" element={<CanvasTutorialsPage />} />
                            <Route path="dev/abstractions" element={<AbstractionViz />} />

                            {/* Game auto-discovery */}
                            <Route
                              path="game/:gameKey"
                              element={
                                <EntryShell
                                  paramKey="gameKey"
                                  loader={getGameEntry}
                                  notFoundEmoji="🎮"
                                  notFoundLabel="Game not found"
                                  backTo="/games"
                                  backLabel="Back to games"
                                />
                              }
                            />

                            {/* Legacy redirects for bookmarked game URLs */}
                            <Route
                              path="rubiks-cube"
                              element={
                                <Navigate to="/game/rubiks-cube" replace />
                              }
                            />
                            <Route
                              path="matrix-game"
                              element={
                                <Navigate to="/game/matrix-game" replace />
                              }
                            />
                            <Route
                              path="stem-tetris"
                              element={
                                <Navigate to="/game/stem-tetris" replace />
                              }
                            />
                            <Route
                              path="card-quest"
                              element={
                                <Navigate to="/game/card-quest" replace />
                              }
                            />
                            <Route
                              path="card-academy"
                              element={
                                <Navigate to="/game/card-academy" replace />
                              }
                            />
                            <Route
                              path="asteroids-la"
                              element={
                                <Navigate to="/game/asteroids-la" replace />
                              }
                            />
                            <Route
                              path="vector-command"
                              element={
                                <Navigate to="/game/vector-command" replace />
                              }
                            />
                            <Route
                              path="arkanoid-learn"
                              element={<Navigate to="/game/arkanoid" replace />}
                            />
                            <Route
                              path="stem-quest"
                              element={
                                <Navigate to="/game/stem-quest" replace />
                              }
                            />
                            <Route
                              path="open-craft"
                              element={
                                <Navigate to="/game/open-craft" replace />
                              }
                            />
                            <Route
                              path="reality-runner"
                              element={
                                <Navigate to="/game/reality-runner" replace />
                              }
                            />

                            <Route
                              path="playground"
                              element={<PlaygroundPage />}
                            />

                            {/* Labs with dedicated routes (css-mastery, cnc-sim, etc.) —
                                generated from each lab's own meta.js `routes`/`component`
                                fields, not hand-written here. See labs/labRegistryLoader.js
                                and src/docs/UpSkillOS work/lab-registry-autofind/. */}
                            {LABS.filter((lab) => lab.routes).flatMap((lab) =>
                              lab.routes.map((path) => (
                                <Route
                                  key={path}
                                  path={path.replace(/^\//, '')}
                                  element={<lab.component />}
                                />
                              )),
                            )}

                            {/* Lab auto-discovery */}
                            <Route
                              path="lab/:labKey"
                              element={
                                <EntryShell
                                  paramKey="labKey"
                                  loader={getLabEntry}
                                  notFoundEmoji="🔬"
                                  notFoundLabel="Lab not found"
                                  backTo="/labs"
                                  backLabel="Back to labs"
                                />
                              }
                            />

                            {/* Legacy redirects for bookmarked lab URLs */}
                            <Route
                              path="robot-arm-lab"
                              element={
                                <Navigate to="/lab/robot-arm-sim" replace />
                              }
                            />
                            <Route
                              path="drone-lab"
                              element={<Navigate to="/lab/drone-lab" replace />}
                            />
                            <Route
                              path="sim-lab"
                              element={<Navigate to="/lab/sim-lab" replace />}
                            />
                            <Route
                              path="matrix-lab"
                              element={
                                <Navigate to="/lab/matrix-lab" replace />
                              }
                            />
                            <Route
                              path="matrix-3d-lab"
                              element={
                                <Navigate to="/lab/matrix-3d-lab" replace />
                              }
                            />
                            <Route
                              path="decomp-lab"
                              element={
                                <Navigate to="/lab/decomp-lab" replace />
                              }
                            />
                            <Route
                              path="cmm-lab"
                              element={<Navigate to="/lab/cmm-lab" replace />}
                            />
                            <Route
                              path="odds-lab"
                              element={<Navigate to="/lab/odds-lab" replace />}
                            />
                            <Route
                              path="plc-lab"
                              element={<Navigate to="/lab/plc-lab" replace />}
                            />
                            <Route
                              path="html-lab"
                              element={<Navigate to="/lab/html-lab" replace />}
                            />
                            <Route
                              path="music-lab"
                              element={<Navigate to="/lab/music-lab" replace />}
                            />
                          </Routes>
                        </Suspense>
                      </AppShell>
                    </RootErrorBoundary>
                    <LaserCursor />
                  </ConceptWindowProvider>
                  </DesktopProvider>
                  </ChatProvider>
                  </MontyProvider>
                </TourProvider>
              </HashRouter>
            </VideoPlayerProvider>
          </PinsProvider>
      </ProgressProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
