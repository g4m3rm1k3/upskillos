export const meta = {
  title: 'Lesson Page',
  description: 'Renders any lesson — loads content via courseLoader, tracks reading checkpoints and quiz progress in ProgressContext, and marks the lesson complete at 100%.',
  concept: 'Dynamic Import',
  conceptDetail: 'courseLoader.loadLesson() asynchronously imports the lesson module at runtime. The page is generic — one component drives every lesson in every course.',
}

import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { LESSON_MAP, ALL_LESSONS, CURRICULUM } from "../courses/index.js";
import { loadLesson, getAllChapters } from "../courses/courseLoader.js";
import { useProgress } from "../hooks/useProgress.js";

const ALL_COURSE_CHAPTERS = getAllChapters()
import MicroCycleLesson from "../components/lesson/MicroCycleLesson.jsx";
import MobileLessonContent from "../components/lesson/MobileLessonContent.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import CrossRef from "../components/lesson/CrossRef.jsx";
import VizFrame from "../components/viz/VizFrame.jsx";
import MarkdownProse from "../components/math/MarkdownProse.jsx";
import { enhanceLessonForUnifiedLearning } from "../engines/lesson/enhancers/unifiedLessonEnhancer.js";
import OpenInGrapher from "../components/lesson/OpenInGrapher.jsx";
import LessonQuizBlock from "../components/lesson/LessonQuizBlock.jsx";
import { useVideoPlayer } from "../hooks/useVideoPlayer.js";
import { useOptionalLesson } from "../hooks/useOptionalLesson.js";
import WikiIntro from "../components/lesson/WikiIntro.jsx";
import WikiDiagrams from "../components/lesson/WikiDiagrams.jsx";
export default function LessonPage() {
  const { chapterId, lessonSlug, "*": rest } = useParams();
  const slug = lessonSlug + (rest ? `/${rest}` : "");
  const key = `${chapterId}/${slug}`;
  // chapterId is "courseId-N" (e.g. "ai-engineering-1"); strip the chapter number
  // to get the courseId.
  const courseId = chapterId?.replace(/-\d+$/, '') ?? ''
  const rawLesson = LESSON_MAP[key];

  // For lessons not in the old LESSON_MAP, load dynamically from courseLoader.
  // The loaded lesson is stored with the route it belongs to: right after navigating to another
  // lesson, state still holds the previous one for a render, and pairing it with the new route's
  // courseId saved progress under the wrong key (e.g. "sql::geo-3-5").
  const [courseLesson, setCourseLesson] = useState(null) // { key, lesson }
  const [loadingCourse, setLoadingCourse] = useState(!rawLesson)
  useEffect(() => {
    if (rawLesson) { setLoadingCourse(false); return }
    let cancelled = false
    setLoadingCourse(true)
    setCourseLesson(null)
    loadLesson(chapterId, lessonSlug).then(l => {
      if (!cancelled) { setCourseLesson({ key, lesson: l }); setLoadingCourse(false) }
    }).catch(() => { if (!cancelled) { setCourseLesson({ key, lesson: null }); setLoadingCourse(false) } })
    return () => { cancelled = true }
  }, [chapterId, lessonSlug, rawLesson, key])

  const builtInLesson = rawLesson ?? (courseLesson?.key === key ? courseLesson.lesson : null)
  // Until this route's lesson has loaded (or failed to), the page is still loading.
  const lessonPending = !rawLesson && (loadingCourse || courseLesson?.key !== key)

  const { lessonSource, lessonOverride, isLoadingOverride } = useOptionalLesson(
    key,
    builtInLesson,
  );
  const lesson = useMemo(
    () =>
      lessonOverride ? enhanceLessonForUnifiedLearning(lessonOverride) : null,
    [lessonOverride],
  );

  // Progress is keyed by the lesson's own stable `id` field, not by the URL
  // (route segments mirror file/folder names under src/courses/, and a
  // rename there used to silently orphan every existing user's progress —
  // confirmed real incident). Namespaced by course because lesson ids are
  // NOT globally unique (confirmed real collisions across different
  // courses, e.g. "ch3-001" exists in both calculus and precalculus).
  // Empty until `lesson` resolves — every call site below already guards
  // on `!progressKey`, so this brief gap during initial load is harmless.
  const progressKey = courseId && lesson?.id ? `${courseId}::${lesson.id}` : ''

  // Broadcast the active lesson to TutorPanel (mounted once in AppShell)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('oc-lesson-context', { detail: lesson ?? null }))
    return () => window.dispatchEvent(new CustomEvent('oc-lesson-context', { detail: null }))
  }, [lesson])
  const navigate = useNavigate();
  const {
    markCheckpoint,
    markVisited,
    getActiveTab,
    getLessonStatus,
    setReadingProgress,
    getReadingProgress,
  } = useProgress();
  const { setLessonId } = useVideoPlayer();
  const isMobile = useIsMobile();
  const activeTab = getActiveTab(progressKey);
  const initialReadingProgress = getReadingProgress(progressKey);

  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (key) setLessonId(key);
  }, [key, setLessonId]);

  // Deep links such as #/chapter/<id>/<slug>?section=<anchor> scroll to a block
  // that lessons mark with `anchor` (rendered as id="section-<anchor>").
  const { search } = useLocation();
  useEffect(() => {
    const section = new URLSearchParams(search).get("section");
    if (!section || !lesson) return;
    const timer = setTimeout(() => {
      document.getElementById(`section-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, lesson]);

  useEffect(() => {
    if (lesson) {
      document.title = `${lesson.title} - UpSkillOS`;
    }
    return () => {
      document.title = "UpSkillOS";
    };
  }, [lesson?.id, lesson]);

  useEffect(() => {
    if (!lesson || !progressKey || scrollPercent < 60) return;
    markCheckpoint(progressKey, `read-${activeTab}`);
  }, [progressKey, activeTab, scrollPercent, markCheckpoint, lesson]);

  useEffect(() => {
    if (!lesson || !progressKey) return;
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      if (height === 0) return;
      const scrolled = (winScroll / height) * 100;
      setScrollPercent(scrolled);
      if (scrolled > 10) setReadingProgress(progressKey, Math.floor(scrolled));
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [progressKey, setReadingProgress, lesson]);

  // Stamp "last visited" once the lesson (and its stable progressKey) has
  // resolved — powers the profile page's "continue where you left off".
  useEffect(() => {
    if (!progressKey) return;
    markVisited(progressKey);
  }, [progressKey, markVisited]);

  if (!lesson && lessonPending) {
    return (
      <div className="py-20 text-center text-slate-400 dark:text-slate-500 text-sm">
        Loading lesson…
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-4xl">🔍</p>
        <h2 className="mb-2 text-xl font-semibold text-slate-700 dark:text-slate-300">
          Lesson not found
        </h2>
        <p className="mb-6 text-slate-500">
          The lesson at chapter/{chapterId}/{slug} doesn&apos;t exist yet.
        </p>
        <Link
          to="/"
          className="text-brand-600 hover:underline dark:text-brand-400"
        >
          Back to curriculum
        </Link>
      </div>
    );
  }

  const sameCourseLesson = ALL_LESSONS.filter(entry => entry.course === courseId)
  const lessonIndex = sameCourseLesson.findIndex(
    (entry) => String(entry.chapterNumber) === String(chapterId) && entry.slug === slug
  );
  const prevLesson = lessonIndex > 0 ? sameCourseLesson[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex !== -1 && lessonIndex < sameCourseLesson.length - 1
      ? sameCourseLesson[lessonIndex + 1]
      : null;

  return (
    <div className="flex-1 min-h-screen relative overflow-x-hidden bg-white dark:bg-slate-950">
      <article className="mx-auto max-w-[1440px] pb-24 pt-6 px-0 sm:px-8 md:px-12 min-h-screen relative">

      <div className="pointer-events-none fixed left-0 top-0 z-[10001] h-1 w-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full bg-brand-500 transition-all duration-300 ease-out"
          style={{ width: `${scrollPercent}%` }}
        />
      </div>

      {(() => {
        const chapter = CURRICULUM.find((entry) => String(entry.number) === chapterId)
          ?? ALL_COURSE_CHAPTERS.find((ch) => String(ch.number) === chapterId);
        return (
          <nav className="mb-6 px-3 md:px-0 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Link
              to="/"
              className="hover:text-brand-600 dark:hover:text-brand-400"
            >
              Home
            </Link>
            {chapter?.course && (
              <>
                <span>›</span>
                <Link
                  to={`/course/${chapter.course}`}
                  className="capitalize hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {chapter.course.replace(/-\d+$/, "").replace(/-/g, " ")}
                </Link>
              </>
            )}
            <span>›</span>
            <Link
              to={`/chapter/${chapterId}`}
              className="hover:text-brand-600 dark:hover:text-brand-400"
            >
              {chapter?.title ?? chapterId}
            </Link>
            <span>›</span>
            <span className="text-slate-700 dark:text-slate-300">
              {lesson.title}
            </span>
            <button
              onClick={() => navigate(`/lesson-builder/${chapterId}/${lessonSlug}`)}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:border-brand-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              🔨 Edit in Builder
            </button>
          </nav>
        );
      })()}

      <header className="sm:mx-0 sm:rounded-3xl mb-12 overflow-hidden shadow-2xl bg-white dark:bg-slate-900 border-y sm:border border-slate-200 dark:border-slate-800 relative">
        <div className="oc-header-gradient px-4 py-10 sm:px-12 sm:py-14 max-lg:bg-gradient-to-br max-lg:from-brand-100 max-lg:to-sky-50 max-lg:dark:from-brand-900/40 max-lg:dark:to-sky-900/20">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(() => {
              const chapter = CURRICULUM.find((entry) => String(entry.number) === chapterId)
                ?? ALL_COURSE_CHAPTERS.find((ch) => String(ch.number) === chapterId);
              return (
                <>
                  <span className="rounded-full bg-brand-600 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-brand-500/30">
                    {chapter?.title ?? chapterId}
                    {lesson.order !== undefined
                      ? ` · Lesson ${lesson.order}`
                      : ""}
                  </span>
                  {lessonSource === "override" && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Local override
                    </span>
                  )}
                  {isLoadingOverride && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      Checking local backend…
                    </span>
                  )}
                </>
              );
            })()}
          </div>

          <h1 className="text-5xl font-black tracking-tight text-slate-950 dark:text-slate-200 sm:text-6xl lg:text-7xl !leading-[1.1] max-lg:bg-clip-text max-lg:text-transparent max-lg:bg-gradient-to-r max-lg:from-brand-600 max-lg:to-sky-500 max-lg:dark:from-brand-400 max-lg:dark:to-sky-300">
            {lesson.title}
          </h1>
          {lesson.subtitle && (
            <p className="mt-6 max-w-3xl text-xl leading-relaxed text-slate-600 dark:text-slate-300 font-medium opacity-90">
              {lesson.subtitle}
            </p>
          )}
          {lesson.grapher && (
            <div className="mt-5">
              <OpenInGrapher config={lesson.grapher} />
            </div>
          )}
        </div>
      </header>

      {lesson.hook && (
        <section className="mb-16 max-lg:px-4">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
              Introduction
            </span>
            <div className="flex-1 h-px bg-brand-100 dark:bg-brand-900/40" />
          </div>
          <div className="mb-8">
            <MarkdownProse
              text={lesson.hook.question}
              className="[&_p]:text-[20px] [&_p]:sm:text-[22px] [&_p]:font-serif [&_p]:font-medium [&_p]:leading-relaxed [&_p]:text-brand-900 [&_p]:dark:text-brand-100 italic border-l-4 border-brand-200 dark:border-brand-800 pl-6 my-6"
            />
          </div>
          <MarkdownProse text={lesson.hook.realWorldContext} />
          {lesson.hook.visualizations?.length > 0
            ? lesson.hook.visualizations.map((viz, index) => (
                <div
                  key={index}
                  className="mt-8 mb-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800"
                >
                  <VizFrame
                    id={viz.id}
                    initialProps={viz.initialProps ?? viz.props ?? {}}
                    title={viz.title}
                  />
                </div>
              ))
            : lesson.hook.previewVisualizationId && (
                <div className="mt-8 mb-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800">
                  <VizFrame
                    id={lesson.hook.previewVisualizationId}
                    initialProps={lesson.hook.previewVisualizationProps ?? {}}
                  />
                </div>
              )}
        </section>
      )}

      {!lesson.intuition?.blocks?.length &&
       !lesson.cells?.length &&
       !lesson.intuition?.visualizations?.length &&
       !lesson.suppressWiki && (
        <div className="max-lg:px-4">
          <WikiIntro query={lesson.title} tags={lesson.tags} />
          <WikiDiagrams query={lesson.title} tags={lesson.tags} />
        </div>
      )}

      {lesson.tags?.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {lesson.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-12">
        {isMobile ? (
          <div>
            <MobileLessonContent lesson={lesson} />
          </div>
        ) : (
          <MicroCycleLesson lesson={lesson} />
        )}
      </div>

      {lesson.quiz?.length > 0 && (
        <LessonQuizBlock
          key={key}
          lessonId={progressKey}
          questions={lesson.quiz}
        />
      )}

      {lesson.crossRefs?.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Related Lessons
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {lesson.crossRefs.map((ref) => (
              <CrossRef key={ref.lessonSlug ?? ref.slug} {...ref} />
            ))}
          </div>
        </section>
      )}

      <nav className="flex items-center justify-between border-t border-slate-200 pt-8 dark:border-slate-700">
        {prevLesson ? (
          <Link
            to={`/chapter/${prevLesson.chapterNumber}/${prevLesson.slug}`}
            className="group flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
          >
            <span className="transition-transform group-hover:-translate-x-1">
              ←
            </span>
            <div>
              <div className="text-xs text-slate-400 dark:text-slate-500">
                Previous
              </div>
              <div className="font-medium">{prevLesson.title}</div>
            </div>
          </Link>
        ) : (
          <div />
        )}

        {nextLesson ? (
          <Link
            to={`/chapter/${nextLesson.chapterNumber}/${nextLesson.slug}`}
            className="group flex items-center gap-2 text-right text-sm text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
          >
            <div>
              <div className="text-xs text-slate-400 dark:text-slate-500">
                Next
              </div>
              <div className="font-medium">{nextLesson.title}</div>
            </div>
            <span className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        ) : (
          <div />
        )}
      </nav>
    </article>
    </div>
  );
}
