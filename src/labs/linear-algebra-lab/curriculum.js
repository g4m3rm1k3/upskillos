import { stage1 } from './lessons/stage1.js'
import { stage2 } from './lessons/stage2.js'
import { calculus } from './lessons/calculus.js'
import { core } from './lessons/core.js'
import { applications } from './lessons/applications.js'
import { spaces } from './lessons/spaces.js'
import { spectralTheory } from './lessons/spectral.js'
import { ENRICH } from './lessons/enrich.js'
import { ANGLES, USES } from './lessons/uses.js'

// New lessons name the lesson they follow (`after`), so later modules slot into the sequence
// without renumbering. ENRICH adds notation, quick-check questions and proofs to earlier lessons.
function assemble(base, additions) {
  const list = [...base]
  for (const lesson of additions) {
    const at = list.findIndex(item => item.id === lesson.after)
    if (at < 0) throw new Error(`${lesson.id} follows unknown lesson ${lesson.after}`)
    list.splice(at + 1, 0, lesson)
  }
  return list.map(lesson => ({ ...lesson, ...ENRICH[lesson.id], ...(USES[lesson.id] && { uses: USES[lesson.id] }), ...(ANGLES[lesson.id] && { angles: ANGLES[lesson.id] }) }))
}

// The four stages of the gentle curve, in order. Every module belongs to exactly one, and lessons
// are ordered by module in this order (keeping their order within a module).
export const STAGES = [
  ['See it', ['Vectors: arrows and lists', 'The dot product']],
  ['Use it', ['Matrices are machines', 'Solving many equations']],
  ['Understand it', ['Spaces and bases', 'Least squares and data', 'Calculus meets matrices', 'Spectral thinking', 'Spectral theory']],
  ['Apply it', ['Math for machine learning', 'Dynamic programming', 'Mastery studio']],
]
export const MODULES = STAGES.flatMap(([, modules]) => modules)

const assembled = assemble([...stage1, ...stage2, ...core, ...calculus, ...applications], [...spaces, ...spectralTheory])
const unplaced = assembled.filter(lesson => !MODULES.includes(lesson.module))
if (unplaced.length) throw new Error(`Lessons in no stage: ${unplaced.map(lesson => lesson.id).join(', ')}`)
export const LESSONS = MODULES.flatMap(module => assembled.filter(lesson => lesson.module === module))

export const SYNTAX = [
  ['x = 3;', 'Store 3 under the name x. The final semicolon hides automatic printing.'],
  ['% a note', 'A percent sign starts a comment. It does not run.'],
  ['disp(x)', 'Print the value of x in the output panel.'],
  ['v = [2; 3]', 'Semicolons inside brackets start new rows in mathematical notation. OpenMAT stores single-axis vectors compactly, so its workspace does not preserve this orientation.'],
  ['r = [2 3]', 'Spaces separate columns in mathematical notation. OpenMAT stores this and its column form as the same flat vector; use full matrices when inspecting row/column shapes.'],
  ['A(2,1)', 'Read row 2, column 1. OpenMAT counts from 1.'],
  ['A(:,2)', 'Read every row of column 2. A colon means all entries here.'],
  ["A'", 'Transpose a real matrix: rows become columns. For complex entries this also conjugates.'],
  ['A * v', 'Matrix multiplication: combine columns of A using weights in v. Inner dimensions must agree.'],
  ['A .* B', 'Multiply matching entries. Likewise ./ divides entries and .^ powers entries.'],
  ['A \\ b', 'Solve A*x = b. Prefer a solve to explicitly computing inv(A).'],
  ['for k = 1:5 … end', 'Repeat the lines before end for k = 1, 2, 3, 4, 5. Put the body on new lines.'],
  ['plot(x,y)', 'Draw paired coordinates. Add title, xlabel and ylabel to explain the figure.'],
]
