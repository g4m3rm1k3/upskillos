import { foundations } from './lessons/foundations.js'
import { core } from './lessons/core.js'
import { applications } from './lessons/applications.js'

export const LESSONS = [...foundations, ...core, ...applications]
export const MODULES = [...new Set(LESSONS.map(lesson => lesson.module))]

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
