import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-13', slug: 'lists-and-sequences', track: 'A', order: 13,
  title: 'Lists and Sequences', subtitle: 'Ordered, Mutable Collections',
  tags: ['list', 'indexing', 'slicing', 'mutation', 'append', 'nested'],
  prereqs: ['a-11', 'a-04'], unlocks: ['a-14', 'b-01'],
  hook: {
    question: 'How does a program store and manipulate an ordered collection of values?',
    realWorldContext: 'Lists are Python\'s basic ordered collection: a column of readings, the rows of a small table, a batch of file names. Selecting the right part of one (indexing and slicing) and knowing when two names share one list (aliasing) prevent some of the most confusing bugs in data work.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Read any index or slice, including negative ones, by drawing positions. Change a list in place and know which operations make a new list instead. Explain when two names share one list, and make a real copy when you need one.',
        '**The smallest example.** A **list** is an ordered sequence of values: `letters = ["a", "b", "c", "d", "e"]`. Each item has a position, its **index**, counting from 0. Negative indices count from the end, so -1 is the last item.',
        '| Item | "a" | "b" | "c" | "d" | "e" |\n|---|---|---|---|---|---|\n| Index | 0 | 1 | 2 | 3 | 4 |\n| Negative index | -5 | -4 | -3 | -2 | -1 |',
        '`letters[0]` is "a", `letters[3]` is "d", `letters[-1]` is "e". There is no index 5: asking for `letters[5]` raises IndexError.',
      ),
      check(
        'For `letters = ["a", "b", "c", "d", "e"]`, what is `letters[-2]`?',
        ['"b"', '"d"', '"c"', 'IndexError'],
        1,
        'Negative indices count back from the end: -1 is "e", -2 is "d".',
      ),
      notebook('Indexing', [
        demo(1, 'Stage 1 — Positions and negative positions', [
          'Each index picks one item, using the table above.',
        ], 'Predict every line from the table, then run.', 'letters = ["a", "b", "c", "d", "e"]\nprint(letters[0], letters[3], letters[-1], letters[-2])\nprint(len(letters))', { expectOutput: ['a d e d', '5'] }),
        demo(2, 'Stage 2 — An index that does not exist', [
          'The last valid index is `len(letters) - 1`, which is 4.',
        ], 'Run and read the IndexError. Then change 5 to -5 and predict the result.', 'letters = ["a", "b", "c", "d", "e"]\nprint(letters[5])', { expectError: 'IndexError' }),
      ]),
      prose(
        '**Slicing.** `lst[start:stop]` makes a *new* list of the items from index `start` up to **but not including** `stop`. Think of the indices as fence posts *between* items — the slice takes everything between two posts:',
        '```text\n  post:   0   1   2   3   4   5\n          | a | b | c | d | e |\n```',
        '`letters[1:4]` takes the items between posts 1 and 4: b, c, d. Leaving out `start` means "from the beginning"; leaving out `stop` means "to the end". A third number, `step`, takes every step-th item; a negative step walks backwards, starting at `start` and stopping *before* `stop`.',
        '| Slice | Result | Reading |\n|---|---|---|\n| `letters[1:4]` | b, c, d | posts 1 to 4 |\n| `letters[:2]` | a, b | the first two |\n| `letters[-3:]` | c, d, e | the last three |\n| `letters[::2]` | a, c, e | every second item |\n| `letters[::-1]` | e, d, c, b, a | reversed |\n| `letters[4:1:-1]` | e, d, c | from index 4 backwards, stopping before index 1 |',
        'Slices never raise IndexError: `letters[2:100]` just gives everything from index 2 to the end.',
      ),
      check(
        'What is `letters[4:1:-1]`?',
        ['["e", "d", "c"]', '["e", "d", "c", "b"]', '[]'],
        0,
        'A negative step starts at index 4 ("e") and walks backwards, stopping before index 1, so "b" is excluded.',
      ),
      notebook('Slicing', [
        demo(3, 'Stage 3 — Slices from the table', [
          'Every row of the slicing table, in order.',
        ], 'Predict each line before running. Then write a slice that gives ["b", "d"].', 'letters = ["a", "b", "c", "d", "e"]\nprint(letters[1:4], letters[:2], letters[-3:])\nprint(letters[::2], letters[::-1])\nprint(letters[4:1:-1])\nprint(letters[2:100])', { expectOutput: ["['b', 'c', 'd'] ['a', 'b'] ['c', 'd', 'e']", "['a', 'c', 'e'] ['e', 'd', 'c', 'b', 'a']", "['e', 'd', 'c']", "['c', 'd', 'e']"] }),
      ]),
      prose(
        '**Changing a list in place.** Lists are **mutable**: their contents can change after they are made. Text (strings) and numbers are not.',
        '| Operation | Effect on `nums = [1, 2, 3]` | Returns |\n|---|---|---|\n| `nums[0] = 10` | `[10, 2, 3]` | — |\n| `nums.append(4)` | adds one item at the end | None |\n| `nums.extend([4, 5])` | adds each item of the other list | None |\n| `nums.insert(1, 99)` | puts 99 at index 1, shifting the rest | None |\n| `nums.remove(2)` | removes the first 2 | None |\n| `nums.pop()` | removes the last item | that item |\n| `nums + [4]` | nothing — builds a **new** list | the new list |',
        'Methods that change a list in place return None, so `nums = nums.append(4)` throws the list away. `append` adds its argument as *one* item: `nums.append([4, 5])` adds a single nested list, whereas `extend([4, 5])` adds two items.',
      ),
      notebook('Mutation', [
        demo(4, 'Stage 4 — In-place changes', [
          'Every line changes the same list object.',
        ], 'Predict each printed list before running.', 'nums = [1, 2, 3]\nnums[0] = 10\nnums.append(4)\nnums.insert(1, 99)\nprint(nums)\nnums.remove(99)\nlast = nums.pop()\nprint(nums, last)', { expectOutput: ['[10, 99, 2, 3, 4]', '[10, 2, 3] 4'] }),
        demo(5, 'Stage 5 — append versus extend', [
          'Same argument, different result.',
        ], 'Run, then check len() of each list.', 'a = [1, 2]\na.append([3, 4])\nb = [1, 2]\nb.extend([3, 4])\nprint(a, len(a))\nprint(b, len(b))', { expectOutput: ['[1, 2, [3, 4]] 3', '[1, 2, 3, 4] 4'] }),
      ]),
      prose(
        '**Aliases and copies.** `b = a` does not copy a list; it makes `b` a second name for the same list (Lesson A.04). A change made through either name is visible through both. To get an independent list, copy it: `a.copy()`, `a[:]` or `list(a)`.',
        '| Code | Then `b.append(3)` | a afterwards |\n|---|---|---|\n| `b = a` | changes the shared list | `[1, 2, 3]` |\n| `b = a.copy()` | changes only the copy | `[1, 2]` |',
        'These are **shallow** copies: the new outer list holds the *same* inner items. For a list of lists, `grid.copy()` gives a new outer list whose rows are still shared, so changing `copy[0][0]` also changes `grid[0][0]`. Copying each row, `[row.copy() for row in grid]`, avoids that.',
      ),
      check(
        '`a = [1, 2]`, then `b = a[:]`, then `b.append(3)`. What is `a`?',
        ['[1, 2]', '[1, 2, 3]'],
        0,
        '`a[:]` is a slice of the whole list, and every slice is a new list — so `b` is a copy.',
      ),
      notebook('Aliasing and copying', [
        demo(6, 'Stage 6 — Alias versus copy', [
          '`is` asks whether two names refer to the very same list.',
        ], 'Predict each print, then run.', 'a = [1, 2]\nalias = a\ncopy = a.copy()\nalias.append(3)\nprint(a, alias, copy)\nprint(alias is a, copy is a)', { expectOutput: ['[1, 2, 3] [1, 2, 3] [1, 2]', 'True False'] }),
        demo(7, 'Stage 7 — A shallow copy of nested lists', [
          'The outer list was copied, but both outer lists hold the same row objects.',
        ], 'Run. Then replace grid.copy() with [row.copy() for row in grid] and run again.', 'grid = [[1, 2], [3, 4]]\nshallow = grid.copy()\nshallow[0][0] = 99\nprint(grid)\nprint(shallow is grid, shallow[0] is grid[0])', { expectOutput: ['[[99, 2], [3, 4]]', 'False True'] }),
        demo(8, 'Stage 8 — Nested lists as a grid', [
          'A list of lists can store a small table. `grid[row][col]` first picks a row, then an item in that row.',
        ], 'Predict `matrix[1][2]` and `matrix[-1][0]`, then run.', 'matrix = [\n    [1, 2, 3],\n    [4, 5, 6],\n    [7, 8, 9],\n]\nprint(matrix[1], matrix[1][2], matrix[-1][0])', { expectOutput: ['[4, 5, 6] 6 7'] }),
      ]),
      prose('**Practice.** Challenge 1 predicts slices. Challenges 2 and 3 combine slicing and loops. Challenge 4 is a fresh problem about changing a list while you loop over it.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Predict the slices', 'easy', {
          prompt: 'For readings = [10, 20, 30, 40, 50, 60], predict p1 = readings[1:4], p2 = readings[::-2] and p3 = readings[-3:-1] without running them.',
          instructions: 'Draw the fence posts 0 to 6, then read each slice. Remember the stop post is never included.',
          code: 'p1 = None\np2 = None\np3 = None',
          testCode: `assert p1 != [20, 30, 40, 50], "p1: the stop index 4 is excluded, so the slice ends at index 3"
assert p1 == [20, 30, 40], f"p1 should be [20, 30, 40], got {p1}"
assert p2 == [60, 40, 20], f"p2: a step of -2 starts at the last item and takes every second item backwards: [60, 40, 20]. Got {p2}"
assert p3 != [40, 50, 60], "p3: stop -1 is excluded, so the last item is not included"
assert p3 == [40, 50], f"p3 should be [40, 50], got {p3}"
"SUCCESS: start is included, stop is excluded, and a negative step walks backwards."`,
          hint: 'readings[1:4] → indices 1, 2, 3. readings[::-2] → indices 5, 3, 1. readings[-3:-1] → indices -3 and -2.',
          solution: 'p1 = [20, 30, 40]\np2 = [60, 40, 20]\np3 = [40, 50]',
          misconceptions: [
            { code: 'p1, p2, p3 = [20, 30, 40, 50], [60, 40, 20], [40, 50]', feedback: 'the stop index 4 is excluded' },
            { code: 'p1, p2, p3 = [20, 30, 40], [60, 40, 20], [40, 50, 60]', feedback: 'stop -1 is excluded' },
          ],
        }),
        exercise(12, 2, 'Challenge 2 — Top 3', 'medium', {
          prompt: 'Write top3(numbers) that returns the three largest values, largest first, using sorted() and slicing. Do not change the input list.',
          instructions: '`sorted()` returns a new list in increasing order. Which slice gives the last three, and how do you reverse them?',
          code: 'def top3(numbers):\n    pass  # replace with your code\n\nprint(top3([3, 1, 4, 1, 5, 9, 2, 6]))',
          testCode: `data = [3, 1, 4, 1, 5, 9, 2, 6]
got = top3(data)
assert got != [1, 1, 2], "sorted() puts the SMALLEST first, so [:3] gives the three smallest. Take the last three instead"
assert got == [9, 6, 5], f"top3 should be [9, 6, 5], got {got}"
assert data == [3, 1, 4, 1, 5, 9, 2, 6], "top3 changed its input list. sorted() returns a new list; .sort() changes the original"
assert top3([10, 10, 10, 1]) == [10, 10, 10], "Repeated values should all be kept"
"SUCCESS: sorted(numbers)[-3:][::-1] — a new sorted list, its last three items, reversed."`,
          hint: 'return sorted(numbers)[-3:][::-1]',
          solution: 'def top3(numbers):\n    return sorted(numbers)[-3:][::-1]',
          misconceptions: [
            { code: 'def top3(numbers):\n    return sorted(numbers)[:3]', feedback: 'Take the last three instead' },
            { code: 'def top3(numbers):\n    numbers.sort()\n    return numbers[-3:][::-1]', feedback: 'top3 changed its input list' },
          ],
        }),
        exercise(13, 3, 'Challenge 3 — Flatten', 'medium', {
          prompt: 'Write flatten(nested) that turns a list of lists into one flat list, using loops.',
          instructions: 'Loop over the outer list, then over each inner list, adding items one at a time (or use extend).',
          code: 'def flatten(nested):\n    result = []\n    for sub in nested:\n        result.append(sub)\n    return result\n\nprint(flatten([[1, 2], [3, 4], [5]]))',
          testCode: `got = flatten([[1, 2], [3, 4], [5]])
assert got != [[1, 2], [3, 4], [5]], "append adds each inner list as ONE item. Add the inner items individually (a second loop, or extend)"
assert got == [1, 2, 3, 4, 5], f"Expected [1, 2, 3, 4, 5], got {got}"
assert flatten([[], [1]]) == [1], "Empty inner lists should contribute nothing"
"SUCCESS: the inner items are added one by one."`,
          hint: 'for sub in nested:\n    for item in sub:\n        result.append(item)',
          solution: 'def flatten(nested):\n    result = []\n    for sub in nested:\n        for item in sub:\n            result.append(item)\n    return result',
          misconceptions: [{ code: 'def flatten(nested):\n    result = []\n    for sub in nested:\n        result.append(sub)\n    return result', feedback: 'append adds each inner list as ONE item' }],
        }),
        exercise(14, 4, 'Challenge 4 — Remove outliers safely', 'hard', {
          prompt: 'remove_outliers(values, limit) should return a NEW list without the values above limit, and leave the caller\'s list unchanged. The starter version has two bugs. Find and fix both.',
          prose: ['Run the starter. Compare the result with what you expect, and print the original list afterwards. Trace the loop by hand: what happens to the position of the next item when an item is removed?'],
          instructions: 'Hint for the trace: removing an item shifts every later item one position to the left, but the loop moves on to the next position anyway.',
          code: 'def remove_outliers(values, limit):\n    for v in values:\n        if v > limit:\n            values.remove(v)\n    return values\n\ndata = [10, 200, 300, 20]\nprint(remove_outliers(data, 100), data)',
          testCode: `data = [10, 200, 300, 20]
got = remove_outliers(data, 100)
assert data == [10, 200, 300, 20], "The caller's list was changed. Build and return a new list instead of removing from values"
assert got != [10, 300, 20], "300 survived: removing 200 while looping shifted 300 into the position the loop had already passed"
assert got == [10, 20], f"Expected [10, 20], got {got}"
assert remove_outliers([], 5) == [], "An empty list should give an empty list"
"SUCCESS: a new list, built without changing the list being looped over."`,
          hint: 'return [v for v in values if v <= limit]',
          solution: 'def remove_outliers(values, limit):\n    return [v for v in values if v <= limit]',
          misconceptions: [
            { code: 'def remove_outliers(values, limit):\n    for v in values[:]:\n        if v > limit:\n            values.remove(v)\n    return values', feedback: "The caller's list was changed" },
          ],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Index from 0; negative indices count from the end; a missing index raises IndexError.',
    'Slices: start included, stop excluded (fence posts); a negative step walks backwards; slices never raise IndexError.',
    'append, extend, insert, remove and pop change the list in place and (except pop) return None; + builds a new list.',
    'b = a shares one list; a.copy(), a[:] and list(a) make shallow copies.',
    'Never remove items from a list while looping over it — build a new list instead.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'lst = [10, 20, 30, 40, 50]. What is lst[1:4]?',
      options: ['[10, 20, 30, 40]', '[20, 30, 40] — start included, stop excluded', '[20, 30, 40, 50]'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'a = [1, 2, 3]; b = a; b.append(4). What is a?',
      options: ['[1, 2, 3]', '[1, 2, 3, 4] — a and b are two names for one list', '[1, 2, 3, [4]]'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'grid = [[1, 2], [3, 4]]; c = grid.copy(); c[0][0] = 99. What is grid[0][0]?',
      options: ['1', '99 — copy() is shallow, so the rows are shared', 'An error'],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'What is the difference between lst.append([1, 2]) and lst.extend([1, 2])?',
      options: [
        'None',
        'append adds the list [1, 2] as one item; extend adds 1 and 2 as two items',
        'append is for numbers, extend is for lists',
      ],
      correct: 1,
    },
  ],
}
