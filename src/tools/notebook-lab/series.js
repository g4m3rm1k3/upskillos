// Curated notebook series. Each series is a fixed, ordered list of lessons
// (series/manifest.js); a lesson's text is loaded only when it is opened.
// Lessons are read-only sources: a learner's edits and progress are stored
// separately (seriesProgress.js).
//
// A lesson is `./series/<dir>/<slug>.md` (lessonFormat.js) or, for a Jupyter
// notebook used as it is, `./series/<dir>/<slug>.ipynb`.
import { SERIES_MANIFEST } from './series/manifest.js'
import { parseLesson, parseIpynbLesson } from './lessonFormat.js'

const lessonFiles = import.meta.glob('./series/*/*.{md,ipynb}', { query: '?raw', import: 'default' })

function lessonSource(dir, slug) {
  for (const ext of ['md', 'ipynb']) {
    const load = lessonFiles[`./series/${dir}/${slug}.${ext}`]
    if (load) return { load, parse: ext === 'md' ? parseLesson : parseIpynbLesson }
  }
  return { load: null, parse: null }
}

export const SERIES = SERIES_MANIFEST.map(series => ({
  ...series,
  lessons: series.lessons.map(lesson => ({
    ...lesson,
    ...lessonSource(series.dir, lesson.slug),
  })),
}))

const LESSONS = new Map(
  SERIES.flatMap(series => series.lessons.map(lesson => [lesson.id, { series, lesson }])),
)

export function findLesson(lessonId) {
  return LESSONS.get(lessonId) ?? null
}

export function isAvailable(lesson) {
  return !!lesson.load
}

const parsed = new Map()

// The lesson's cells, parsed from its Markdown or notebook. Cached per page load.
export async function loadLessonCells(lesson) {
  if (!parsed.has(lesson.id)) {
    const source = await lesson.load()
    parsed.set(lesson.id, lesson.parse(source).cells)
  }
  return parsed.get(lesson.id)
}
