import { useState } from 'react'
import { matchItem } from '../data/catalogSearch.js'
import { Link } from 'react-router-dom'
import { getAllCourses, getChapters } from '../courses/courseLoader.js'
import { useProgress } from '../hooks/useProgress.js'
import { buildProgressKey } from '../context/progressMigration.ts'
import { getLabInProgressItems } from '../data/labProgress.js'
import UniverseBackground from '../components/backgrounds/UniverseBackground.jsx'
import TopicFilterHeader from '../components/ui/TopicFilterHeader.jsx'
import TopicTable from '../components/ui/TopicTable.jsx'
import SpotlightGrid from '../components/ui/SpotlightGrid.jsx'
import { TOPICS, TOPIC_ORDER, getSubtopicGroup, firstSubtopicId, ALL_ITEMS } from '../data/topicGroups.js'

// Real course/chapter data, used only to compute which courses have partial
// progress — see inProgressItems below. Real progress data (via oc-progress,
// see useProgress) currently only exists for courses and the html-lessons
// lab; labs/games have no completion tracking to honestly show "in progress"
// for yet, so this stays courses-only until that's built out.
const ALL_COURSES = getAllCourses()
const COURSE_ENTRIES = ALL_COURSES
  .map(course => ({ course, chapters: getChapters(course.key) }))
  .filter(({ chapters }) => chapters.length > 0)

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { getLessonProgress } = useProgress()
  const [searchQuery, setSearchQuery] = useState('')
  // Opens on the Spotlight: the apps that give a learner the most for their time.
  const [activeTopicId, setActiveTopicId] = useState('spotlight')
  const [activeSubtopicId, setActiveSubtopicId] = useState(firstSubtopicId('spotlight'))

  function selectTopic(topicId) {
    setActiveTopicId(topicId)
    setActiveSubtopicId(firstSubtopicId(topicId))
  }

  // Courses with at least one completed lesson but not all of them.
  const inProgressCourses = COURSE_ENTRIES.reduce((acc, { course, chapters }) => {
    const total = chapters.reduce((n, ch) => n + ch.lessons.length, 0)
    if (total === 0) return acc
    const completed = chapters.reduce((n, ch) =>
      n + ch.lessons.filter(l => getLessonProgress(buildProgressKey(course.key, l)).status === 'complete').length, 0)
    if (completed > 0 && completed < total) {
      acc.push({ kind: 'course', key: course.key, differentiator: `${completed} of ${total} lessons complete — continue where you left off.` })
    }
    return acc
  }, [])
  // Labs that track their own progress outside oc-progress (Lesson Engine,
  // Vue Studio, Robot Arm Sim, Backend Lab) — see src/data/labProgress.js.
  const inProgressItems = [...inProgressCourses, ...getLabInProgressItems()]
  const hasInProgress = inProgressItems.length > 0

  // A query bypasses the topic/subtopic filter entirely and searches every
  // course/lab/game — a search box that only searches the currently
  // selected bucket defeats the point of a search box.
  const isSearching = searchQuery.trim().length > 0
  const group = isSearching
    ? { label: `Search results for "${searchQuery}"`, items: ALL_ITEMS }
    : activeTopicId === 'in-progress'
      ? { label: 'In Progress', items: inProgressItems }
      : getSubtopicGroup(activeTopicId, activeSubtopicId)

  return (
    <div className="relative min-h-screen">
      <UniverseBackground />

      <div className="relative z-10">

        {/* ── SEARCH + FILTER ──────────────────────────────────────────────── */}
        <section className="px-4 pt-6 pb-2">
          <TopicFilterHeader
            query={searchQuery}
            onQueryChange={setSearchQuery}
            topics={TOPICS}
            topicOrder={TOPIC_ORDER}
            activeTopicId={activeTopicId}
            activeSubtopicId={activeSubtopicId}
            onSelectTopic={selectTopic}
            onSelectSubtopic={setActiveSubtopicId}
            hasInProgress={hasInProgress}
          />
        </section>

        {/* ── RESULTS ──────────────────────────────────────────────────────── */}
        <section className="px-4 pb-10">
          {!isSearching && activeTopicId === 'spotlight' ? (
            <div className="w-[90vw] max-w-none mx-auto">
              <SpotlightGrid />
            </div>
          ) : group ? (
            <div className="w-[90vw] max-w-none mx-auto">
              <TopicTable group={group} query={isSearching ? searchQuery : ''} matchItem={matchItem} />
            </div>
          ) : (
            <div className="max-w-lg mx-auto text-center rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 p-8">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pick a filter above to see everything real for that subject.
              </p>
            </div>
          )}
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-200 dark:border-white/5 px-4 py-8 text-center text-xs text-slate-600 mt-4">
          <p>
            UpSkillOS is free, open source, and runs entirely in your browser.{' '}
            <Link to="/about" className="text-indigo-400 hover:text-indigo-300 hover:underline">Learn more</Link>
            {' · '}
            <Link to="/reference" className="text-indigo-400 hover:text-indigo-300 hover:underline">Formula Atlas</Link>
          </p>
        </footer>

      </div>
    </div>
  )
}
