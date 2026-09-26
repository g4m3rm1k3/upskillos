// Auto-discovers courses from src/courses/{courseId}/{N}-{chapterSlug}/{NNN}-{lessonSlug}.js
// Paths are parsed eagerly for structure; lesson content is loaded lazily on demand.

import { GLASS_META } from '../styles/courseColors.js'
import LESSON_TITLES from '../data/lessonTitles.json'
// "<chapterId>/<slug>" (as in the lesson's route) -> the lesson's own `id` field, pre-built by
// scripts/build-lesson-ids.mjs (runs automatically before dev/build). Used
// to construct stable, rename-proof progress keys instead of the old
// route-derived ones (which broke when lesson files got renamed — confirmed
// real incident).
import LESSON_IDS from '../data/lessonIds.json'

let ALL_MODULES = {}
try { ALL_MODULES = import.meta.glob('./*/*/*.js') } catch {}   // lazy — paths only at init

// Raw source text, for tooling (Lesson Builder) that needs to recover things
// the evaluated module loses — e.g. an image block's `src` is an imported
// identifier in the source file, but by the time the module is evaluated
// it's just the final resolved URL string with no trace of which import
// produced it.
let ALL_MODULES_RAW = {}
try { ALL_MODULES_RAW = import.meta.glob('./*/*/*.js', { query: '?raw', import: 'default' }) } catch {}

let META_MODULES = {}
try { META_MODULES = import.meta.glob('./*/meta.json', { eager: true }) } catch {}

let VIDEO_MODULES = {}
try { VIDEO_MODULES = import.meta.glob('./*/videos.json', { eager: true }) } catch {}

const COLORS = Object.keys(GLASS_META)

function slugToTitle(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Build structural tree from file paths only — no content loaded
// tree: { [courseId]: { [chapterNum]: { number, title, lessons: [{ title, slug, order, _path }] } } }
const tree = {}

for (const filePath of Object.keys(ALL_MODULES)) {
  const rel = filePath.replace(/^\.\//, '')
  const parts = rel.split('/')
  if (parts.length !== 3) continue

  const [courseId, chapterFolder, filename] = parts

  const chm = chapterFolder.match(/^(\d+)-(.+)$/)
  if (!chm) continue
  const chapterNum = parseInt(chm[1], 10)
  const chapterTitle = slugToTitle(chm[2])

  const fm = filename.replace(/\.js$/, '').match(/^(\d+)-(.+)$/)
  if (!fm) continue
  const lessonOrder = parseInt(fm[1], 10)
  const lessonSlug = fm[2]

  const chapterId = `${courseId}-${chapterNum}`
  if (!tree[courseId]) tree[courseId] = {}
  if (!tree[courseId][chapterNum]) {
    tree[courseId][chapterNum] = { number: chapterId, title: chapterTitle, lessons: [] }
  }
  tree[courseId][chapterNum].lessons.push({
    title: LESSON_TITLES[`${courseId}-${chapterNum}/${lessonSlug}`] ?? slugToTitle(lessonSlug),
    slug: lessonSlug,
    id: LESSON_IDS[`${chapterId}/${lessonSlug}`] ?? null,
    _order: lessonOrder,
    _path: filePath,
  })
}

export function getChapters(courseId) {
  return Object.entries(tree[courseId] ?? {})
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([, ch]) => ({
      ...ch,
      lessons: [...ch.lessons]
        .sort((a, b) => a._order - b._order)
        .map(({ _order, _path, ...l }) => l),
      course: courseId,
    }))
}

export function getAllChapters() {
  return Object.keys(tree).flatMap(getChapters)
}

// "<courseId>/<slug>" -> id, the shape of the old route-derived progress keys that
// progressMigration.ts converts. Built from LESSON_IDS (synchronous, no lazy loading). When two
// chapters of a course share a slug, an old "<courseId>/<slug>" key cannot say which lesson it
// meant, so that slug is left out and its old progress is not guessed at.
let LEGACY_ID_LOOKUP = null
export function getLessonIdLookup() {
  if (LEGACY_ID_LOOKUP) return LEGACY_ID_LOOKUP
  const lookup = {}, ambiguous = new Set()
  for (const [key, id] of Object.entries(LESSON_IDS)) {
    const m = key.match(/^(.+)-\d+\/(.+)$/)
    if (!m) continue
    const legacyKey = `${m[1]}/${m[2]}`
    if (legacyKey in lookup) ambiguous.add(legacyKey)
    lookup[legacyKey] = id
  }
  for (const key of ambiguous) delete lookup[key]
  LEGACY_ID_LOOKUP = lookup
  return lookup
}

const courseIds = [...new Set([
  ...Object.keys(tree),
  ...Object.keys(META_MODULES).map(p => p.replace(/^\.\//, '').replace('/meta.json', '')),
])].sort()

export function getAllCourses() {
  return courseIds.map((courseId, i) => {
    const mod = META_MODULES[`./${courseId}/meta.json`]
    const data = mod?.default ?? mod ?? {}
    return {
      key: courseId,
      label: data.label ?? slugToTitle(courseId),
      description: data.description ?? '',
      icon: data.icon ?? '📚',
      color: GLASS_META[data.color] ? data.color : COLORS[i % COLORS.length],
      domain: data.domain ?? 'other',
      path: `/course/${courseId}`,
    }
  })
}

export function getCourseMeta(courseId) {
  const mod = META_MODULES[`./${courseId}/meta.json`]
  if (!mod && !tree[courseId]) return null
  const data = mod?.default ?? mod ?? {}
  const i = courseIds.indexOf(courseId)
  return {
    id: courseId,
    label: data.label ?? slugToTitle(courseId),
    description: data.description ?? '',
    icon: data.icon ?? '📚',
    color: GLASS_META[data.color] ? data.color : COLORS[i >= 0 ? i % COLORS.length : 0],
  }
}

// Lazy-load a single lesson's full content on demand
export async function loadLesson(chapterId, slug) {
  const m = chapterId.match(/^(.+)-(\d+)$/)
  if (!m) return null
  const courseId = m[1]
  const chNum = parseInt(m[2], 10)
  const entry = tree[courseId]?.[chNum]?.lessons.find(l => l.slug === slug)
  if (!entry) return null
  const mod = await ALL_MODULES[entry._path]?.()
  if (!mod) return null
  if (mod.default) return mod.default
  if (mod.lesson) return mod.lesson
  // Old-format lessons use a named export (e.g. `export { LESSON_GEO_1_1 }`).
  // Pick the first non-default own key that resolves to a plain object.
  const named = Object.entries(mod).find(([k, v]) => k !== 'default' && v && typeof v === 'object' && !Array.isArray(v))
  return named?.[1] ?? null
}

// Raw .js source text for a lesson — see ALL_MODULES_RAW comment above.
export async function loadLessonSource(chapterId, slug) {
  const m = chapterId.match(/^(.+)-(\d+)$/)
  if (!m) return ''
  const courseId = m[1]
  const chNum = parseInt(m[2], 10)
  const entry = tree[courseId]?.[chNum]?.lessons.find(l => l.slug === slug)
  if (!entry) return ''
  const text = await ALL_MODULES_RAW[entry._path]?.()
  return text ?? ''
}

export function getVideos(courseId) {
  const mod = VIDEO_MODULES[`./${courseId}/videos.json`]
  if (!mod) return []
  const data = mod?.default ?? mod
  return Array.isArray(data) ? data : []
}

// Every course's videos, flattened — used for global (cross-course) search.
export function getAllVideos() {
  return Object.keys(VIDEO_MODULES).flatMap((path) => {
    const mod = VIDEO_MODULES[path]
    const data = mod?.default ?? mod
    return Array.isArray(data) ? data : []
  })
}
