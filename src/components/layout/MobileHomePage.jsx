import { Link } from "react-router-dom";
import { COURSES, ALL_LESSONS } from "../../courses/index.js";
import { useProgress } from "../../hooks/useProgress.js";
import TopicTable from '../ui/TopicTable.jsx';
import { LABS } from '../../labs/labRegistryLoader.js';

const FEATURED = [
  {
    label: "RPG Fitness",
    icon: "🏋️",
    description: "Gamified workout tracker",
    to: "/rpg-workout",
    color: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  },
  {
    label: "TI Calculator",
    icon: "🖩",
    description: "Scientific calculator",
    event: "calculator",
    color: "bg-violet-50 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20 text-violet-700 dark:text-violet-300",
  },
];

// The actual mobile home screen — previously mobile visitors at "/" just saw
// the full-screen desktop wallpaper graph (CodeMapBackground) meant to sit
// behind the Start Menu/Taskbar desktop metaphor, with no real content of
// their own. Built from COURSES (same source the desktop Start Menu reads),
// so this can't drift out of sync with the real course list the way a
// hand-written nav array would.
export default function MobileHomePage() {
  const { progress } = useProgress();

  const inProgress = Object.entries(progress ?? {})
    .filter(([, entry]) => (entry?.completedCheckpoints?.length ?? 0) > 0 || (entry?.readingProgress ?? 0) > 0)
    .filter(([, entry]) => !(entry?.quiz?.total > 0 && entry.quiz.correct >= entry.quiz.total))
    .slice(-3)
    .reverse()
    .map(([slug]) => ALL_LESSONS.find(l => l.slug === slug))
    .filter(Boolean);

  return (
    <div className="px-4 pt-8 pb-12 max-w-screen-sm mx-auto">
      <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-sky-500 dark:from-brand-400 dark:to-sky-400 mb-2 drop-shadow-sm">
        Welcome back
      </h1>
      <p className="text-base text-slate-600 dark:text-slate-300 font-medium mb-8">
        Pick up a course or jump back into a lesson.
      </p>

      <section className="mb-10">
        <div className="grid grid-cols-2 gap-4">
          {FEATURED.map((item) => {
            const inner = (
              <>
                <span className="text-4xl leading-none mb-3 block drop-shadow-md">{item.icon}</span>
                <span className="text-[15px] font-black tracking-tight leading-tight block mb-1">{item.label}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80 leading-snug block">{item.description}</span>
              </>
            );
            // We can replace the static flat backgrounds with vibrant gradients
            let gradientColor = "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900";
            if (item.label.includes("RPG")) {
              gradientColor = "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-emerald-500/30 border-emerald-400/50";
            } else if (item.label.includes("TI Calculator")) {
              gradientColor = "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-violet-500/30 border-violet-400/50";
            }
            return item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className={`flex flex-col p-5 rounded-3xl border shadow-lg active:scale-[0.97] transition-transform ${gradientColor}`}
              >
                {inner}
              </Link>
            ) : (
              <button
                key={item.label}
                onClick={() => window.dispatchEvent(new CustomEvent("oc-open-tool", { detail: { tool: item.event } }))}
                className={`flex flex-col p-5 rounded-3xl border shadow-lg active:scale-[0.97] transition-transform text-left ${gradientColor}`}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </section>

      <a
        href="https://discord.gg/epd2kYBDVt"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 mb-10 px-5 py-4 rounded-3xl border border-sky-200/60 dark:border-sky-700/40 bg-sky-50/80 dark:bg-sky-900/20 active:scale-[0.98] transition-transform shadow-sm"
      >
        <span className="text-2xl leading-none">🎮</span>
        <div className="min-w-0">
          <p className="text-[13px] font-black text-sky-700 dark:text-sky-300 leading-tight">Join the Discord</p>
          <p className="text-[11px] text-sky-600/70 dark:text-sky-400/70 font-medium mt-0.5">Ask questions · share your work · chat</p>
        </div>
        <span className="ml-auto text-sky-400 dark:text-sky-500 font-bold text-lg leading-none">→</span>
      </a>

      {inProgress.length > 0 && (
        <section className="mb-12">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 mb-4 flex items-center gap-2">
            Continue learning
            <div className="flex-1 h-px bg-brand-100 dark:bg-brand-900/40" />
          </h2>
          <div className="space-y-3">
            {inProgress.map(lesson => (
              <Link
                key={lesson.slug}
                to={`/chapter/${lesson.chapterNumber}/${lesson.slug}`}
                className="group flex items-center justify-between gap-4 p-5 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 shadow-md active:scale-[0.98] hover:shadow-lg transition-all"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    Chapter {lesson.chapterNumber}
                  </span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                    {lesson.title}
                  </span>
                </div>
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                  <span className="font-bold text-lg leading-none translate-x-px">→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section data-tour="courses-grid" className="pb-12">
        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-500 dark:text-sky-400 mb-4 flex items-center gap-2">
          Explore Courses
          <div className="flex-1 h-px bg-sky-100 dark:bg-sky-900/40" />
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {COURSES.map(course => (
            <Link
              key={course.key}
              to={course.path}
              className="group flex flex-col p-5 rounded-3xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200/80 dark:border-slate-700 shadow-md active:scale-[0.98] hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                {course.icon}
              </div>
              <span className="text-[15px] font-black tracking-tight text-slate-800 dark:text-slate-100 leading-tight mb-2">
                {course.label}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                {course.description}
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section aria-label="All labs and tools" className="mt-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Labs & tools · {LABS.length}</h2>
        <TopicTable group={{ label: 'All labs & tools', items: LABS.map(l => ({ kind: 'lab', key: l.key })) }} query="" matchItem={() => true} />
      </section>
    </div>
  );
}
