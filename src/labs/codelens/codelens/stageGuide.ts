// "Build a stage yourself": the Stage tab's guide. Each step is a tiny program for the
// learner to type into the editor, what to notice, and the stage spec that draws it. Every
// step adds one idea to the last. stageModel.test.ts runs each program and checks its stage draws.
import type { StageSpec } from './stageModel'

export interface GuideStep {
  title: string
  /** What the step teaches: how the spec connects to the program's variables. */
  explain: string
  py: string
  js: string
  spec: StageSpec
}

export const STAGE_GUIDE: GuideStep[] = [
  {
    title: '1. A row of boxes',
    explain: 'A stage is a grid. "rows" and "cols" are numbers, or the name of a variable: a list gives its length, so "cols": "nums" means one box per item. "text" writes each item in its box. Every name in a spec is a variable in your program, read at the step you are on.',
    py: 'nums = [4, 1, 3, 5]\nnums[1] = 9\nprint(nums)\n',
    js: 'const nums = [4, 1, 3, 5];\nnums[1] = 9;\nconsole.log(nums);\n',
    spec: { grid: { rows: 1, cols: 'nums' }, text: { var: 'nums' } },
  },
  {
    title: '2. A pointer',
    explain: 'A marker is drawn at the box a variable points to: "at": "i" draws a ring around nums[i]. Step through the loop and watch the ring move. While i doesn\'t exist yet, or points off the grid, the marker simply isn\'t drawn. "caption" shows variables under the stage.',
    py: 'nums = [4, 1, 3, 5]\ntotal = 0\nfor i in range(len(nums)):\n    total += nums[i]\nprint(total)\n',
    js: 'const nums = [4, 1, 3, 5];\nlet total = 0;\nfor (let i = 0; i < nums.length; i++) {\n  total += nums[i];\n}\nconsole.log(total);\n',
    spec: { grid: { rows: 1, cols: 'nums' }, text: { var: 'nums' }, markers: [{ at: 'i', label: 'i' }], caption: ['i', 'total'] },
  },
  {
    title: '3. Colour by value',
    explain: '"heat" colours each box by its number: the bigger, the greener (below zero, red). Swapping two items makes their colours trade places, so a sort becomes visible. Two markers, i and j, show which boxes are being compared.',
    py: 'nums = [5, 2, 9, 1]\nfor i in range(len(nums)):\n    for j in range(len(nums) - 1 - i):\n        if nums[j] > nums[j + 1]:\n            nums[j], nums[j + 1] = nums[j + 1], nums[j]\nprint(nums)\n',
    js: 'const nums = [5, 2, 9, 1];\nfor (let i = 0; i < nums.length; i++) {\n  for (let j = 0; j < nums.length - 1 - i; j++) {\n    if (nums[j] > nums[j + 1]) [nums[j], nums[j + 1]] = [nums[j + 1], nums[j]];\n  }\n}\nconsole.log(nums);\n',
    spec: { grid: { rows: 1, cols: 'nums' }, heat: { var: 'nums' }, markers: [{ at: 'j', label: 'j' }, { at: 'i', label: 'i' }] },
  },
  {
    title: '4. A table, and an agent',
    explain: 'A list of rows is a grid: give "rows" and "cols" (here, variables). A cell can be named by two variables, "at": ["r", "c"]. The agent is the thing that moves: it slides from cell to cell as you step, so you can see the loop walk the table while it fills in.',
    py: 'rows, cols = 3, 4\ntable = [[0] * cols for _ in range(rows)]\nfor r in range(rows):\n    for c in range(cols):\n        table[r][c] = r * c\nprint(table)\n',
    js: 'const rows = 3;\nconst cols = 4;\nconst table = [];\nfor (let r = 0; r < rows; r++) table.push(new Array(cols).fill(0));\nfor (let r = 0; r < rows; r++) {\n  for (let c = 0; c < cols; c++) table[r][c] = r * c;\n}\nconsole.log(table);\n',
    spec: { grid: { rows: 'rows', cols: 'cols' }, heat: { var: 'table' }, agent: { at: ['r', 'c'] } },
  },
  {
    title: '5. Walls, a goal, and a walk',
    explain: '"walls" draws a dark box wherever a variable holds a true value (1 here). A marker at a fixed place is a goal. The agent can also be a variable holding a [row, col] pair, like pos: each time pos changes, the agent moves.',
    py: 'maze = [[0, 1, 0],\n        [0, 1, 0],\n        [0, 0, 0]]\ngoal = [0, 2]\npos = [0, 0]\nfor move in ["down", "down", "right", "right", "up", "up"]:\n    if move == "down":\n        pos = [pos[0] + 1, pos[1]]\n    elif move == "up":\n        pos = [pos[0] - 1, pos[1]]\n    else:\n        pos = [pos[0], pos[1] + 1]\nprint(pos == goal)\n',
    js: 'const maze = [\n  [0, 1, 0],\n  [0, 1, 0],\n  [0, 0, 0],\n];\nconst goal = [0, 2];\nlet pos = [0, 0];\nfor (const move of ["down", "down", "right", "right", "up", "up"]) {\n  if (move === "down") pos = [pos[0] + 1, pos[1]];\n  else if (move === "up") pos = [pos[0] - 1, pos[1]];\n  else pos = [pos[0], pos[1] + 1];\n}\nconsole.log(pos[0] === goal[0] && pos[1] === goal[1]);\n',
    spec: { grid: { rows: 3, cols: 3 }, walls: { var: 'maze' }, markers: [{ at: 'goal', label: 'goal', color: '#f5b301' }], agent: { at: 'pos' }, caption: ['move'] },
  },
  {
    title: '6. Colours for kinds of thing',
    explain: 'When values are kinds, not amounts (0 = empty, 1 = tree, 2 = fire), a "palette" gives each exact value its own colour. "empty" lists values to leave blank. Now you can draw your own program: name its variables in a spec, and step through it.',
    py: 'forest = [[1, 1, 0, 1],\n          [0, 1, 1, 1]]\nforest[0][0] = 2\nfor c in range(1, 4):\n    if forest[0][c] == 1 and forest[0][c - 1] == 2:\n        forest[0][c] = 2\nprint(forest)\n',
    js: 'const forest = [\n  [1, 1, 0, 1],\n  [0, 1, 1, 1],\n];\nforest[0][0] = 2;\nfor (let c = 1; c < 4; c++) {\n  if (forest[0][c] === 1 && forest[0][c - 1] === 2) forest[0][c] = 2;\n}\nconsole.log(forest);\n',
    spec: { grid: { rows: 2, cols: 4 }, heat: { var: 'forest', palette: { '0': '#334155', '1': '#22c55e', '2': '#f97316' }, label: false }, agent: { at: [0, 'c'] } },
  },
]
