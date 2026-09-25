import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllCourses, getChapters } from '../courses/courseLoader.js'
import { useProgress } from '../hooks/useProgress.js'
import { buildProgressKey } from '../context/progressMigration.ts'
import { getLabInProgressItems } from '../data/labProgress.js'
import UniverseBackground from '../components/backgrounds/UniverseBackground.jsx'
import TopicFilterHeader from '../components/ui/TopicFilterHeader.jsx'
import TopicTable from '../components/ui/TopicTable.jsx'
import { TOPICS, TOPIC_ORDER, getSubtopicGroup, firstSubtopicId, ALL_ITEMS } from '../data/topicGroups.js'

// Category words ("games", "labs", "courses") are deliberately stripped as
// filler further down, so "show me some games about probability" searches
// on "probability" instead of literal-matching the word "games". But a BARE
// category query ("games") then has zero keywords left and matches nothing
// — checked here instead, against the item's actual kind, before that
// stripping happens. `kind`/`badgeKind` come from the caller (see
// TopicTable.jsx's resolveEntry) since cardItem alone doesn't carry them.
const CATEGORY_KEYWORDS = {
  course: ['course', 'courses'],
  lab: ['lab', 'labs'],
  lesson: ['lesson', 'lessons'],
  builder: ['builder', 'builders'],
  visualizer: ['visualizer', 'visualizers'],
  game: ['game', 'games'],
}

export function matchItem(item, query, kinds) {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const words = q.split(/[\s,]+/).filter(Boolean)

  const namedCategories = Object.entries(CATEGORY_KEYWORDS)
    .filter(([, kws]) => kws.some(w => words.includes(w)))
    .map(([cat]) => cat)
  if (namedCategories.length > 0 && kinds) {
    const itemCategories = [kinds.kind, kinds.badgeKind].filter(Boolean)
    if (!namedCategories.some(cat => itemCategories.includes(cat))) return false
  }

  const searchableText = [
    item.label,
    item.desc,
    item.description,
    item.subject,
    item.domain,
    item.key,
    ...(item.tags || [])
  ].filter(Boolean).join(' ').toLowerCase();

  if (searchableText.includes(q)) return true;

  // Extract keywords by removing conversational filler
  const stopWords = [
    'a', 'an', 'the', 'in', 'on', 'with', 'to', 'and', 'or', 'for', 'of', 'at', 'by', 'from',
    'learn', 'master', 'build', 'explore', 'simulate', 'design', 'visualise', 'visualize', 'create', 'make', 'do',
    'lesson', 'lessons', 'lab', 'labs', 'game', 'games', 'app', 'apps', 'course', 'courses',
    'topic', 'topics', 'how', 'what', 'why', 'who', 'where', 'when', 'is', 'are', 'am', 'be', 'been',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their',
    'want', 'need', 'like', 'would', 'could', 'should', 'can', 'will', 'show', 'me', 'find', 'search',
    'about', 'some', 'any', 'all', 'this', 'that', 'these', 'those', 'there', 'here', 'so', 'if', 'then',
    'teach', 'help', 'understand', 'work', 'scratch', 'from'
  ];

  // Also keep terms that might be short but very specific
  const terms = q.split(/[\s,]+/)
    .filter(t => !stopWords.includes(t))
    .filter(t => t.length > 2 || ['3d', 'js', 'ai', 'ui', 'ux', 'c', 'ml', 'vr', 'ar', 'g0', 'fk', 'ik', 'qr'].includes(t));

  if (terms.length > 0) {
    return terms.some(term => searchableText.includes(term));
  }

  // Nothing left after stripping filler/category words — a real match only
  // if the query was a recognized category and this item belongs to it.
  return Boolean(kinds) && namedCategories.length > 0;
}

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
  const { getLessonStatus } = useProgress()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTopicId, setActiveTopicId] = useState('all')
  const [activeSubtopicId, setActiveSubtopicId] = useState(firstSubtopicId('all'))

  function selectTopic(topicId) {
    setActiveTopicId(topicId)
    setActiveSubtopicId(firstSubtopicId(topicId))
  }

  // Courses with at least one completed lesson but not all of them.
  const inProgressCourses = COURSE_ENTRIES.reduce((acc, { course, chapters }) => {
    const total = chapters.reduce((n, ch) => n + ch.lessons.length, 0)
    if (total === 0) return acc
    const completed = chapters.reduce((n, ch) =>
      n + ch.lessons.filter(l => getLessonStatus(buildProgressKey(course.key, l), 1) === 'complete').length, 0)
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
          {group ? (
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
