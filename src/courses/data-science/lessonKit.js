// Builders for data-science lesson content in the blocks format that
// MicroCycleLesson / MobileLessonContent render in order, so explanation,
// prediction checks and runnable cells can be interleaved.
//
// Lives at the course root (not in a chapter folder) so course discovery,
// build-lesson-ids and build-lesson-titles never mistake it for a lesson.
//
// Cell fields understood by scripts/check-data-science-course.mjs:
//   expectOutput: ['..']  substrings the cell's output must contain
//   expectError: 'NameError'  the cell is a deliberate error demonstration
//                (PythonNotebook labels it "Expected error")
//   solution / misconceptions: [{ code, feedback }]  on challenge cells

/** Markdown paragraphs (tables, lists and code fences work; bare $ is LaTeX). */
export const prose = (...paragraphs) => ({ type: 'prose', paragraphs })

/** kind: tip | warning | insight | procedure | misconception | definition | example … */
export const callout = (kind, title, body) => ({ type: 'callout', kind, title, body })

/** An ungraded prediction or comprehension check. `answer` is an option index. */
export const check = (question, options, answer, explanation) => ({
  type: 'check', question, options, answer: options[answer], explanation,
})

/** A runnable notebook placed at this point in the lesson. */
export const notebook = (title, cells) => ({
  type: 'viz', id: 'PythonNotebook', title, props: { initialCells: cells },
})

/** A demonstration cell. `extra` may carry expectOutput / expectError. */
export const demo = (id, cellTitle, prose, instructions, code, extra = {}) => ({
  id, cellTitle, prose, instructions, code, output: '', status: 'idle', ...extra,
})

/**
 * A graded exercise. `testCode` must evaluate to a string containing SUCCESS;
 * failing assertions should explain the likely misconception.
 */
export const exercise = (id, number, title, difficulty, { prompt, prose, instructions, code, testCode, hint, solution, misconceptions }) => ({
  id, challengeType: 'write', challengeNumber: number, challengeTitle: title, difficulty,
  prompt, prose, instructions, code, testCode, hint, solution, misconceptions,
  output: '', status: 'idle',
})
