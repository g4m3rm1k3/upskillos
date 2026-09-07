// Guttag Ch.0 — Lesson 5: Iteration
//
// DEPENDENCY: Lessons 1-4 (Program, Types, Variables, Conditionals).
//
// TEACHES:
//   while — condition-controlled repetition.
//   for — iterator-controlled repetition, and range().
//   break, continue, and the loop-else clause.
//   Nested loops and the accumulator pattern.
//
// DOES NOT TEACH (reserved for later):
//   Iterating over lists/dicts as data structures in depth (Module 1) — used
//   minimally here since for loops need something to iterate over.
//   Generators and the iterator protocol formally (Lesson 20).

export default {
  id: 'gp-04-iteration',
  slug: 'iteration',
  chapter: 1,
  order: 5,
  title: 'Iteration',
  subtitle: 'while and for — controlled repetition',
  tags: ['iteration', 'while', 'for', 'range', 'break', 'continue', 'loops'],

  hook: {
    question: 'How do you print the numbers 1 to 1000 without writing 1000 print statements?',
    realWorldContext:
      'Repetition is one of the two things that make computers fundamentally more powerful than doing math by ' +
      'hand — a computer can execute the same few lines of code millions of times without complaint. Python ' +
      'gives you two loop constructs: while, which repeats as long as a condition holds, and for, which ' +
      'consumes items from a sequence one at a time. Every loop can technically be written as a while loop, ' +
      'but for loops eliminate an entire category of mistakes.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'A **while loop** tests its condition BEFORE each iteration. As long as the condition is truthy, the body runs, then the condition is checked again. If the condition never becomes falsy, you have written an **infinite loop** — something inside the body must eventually make the condition False, or the loop never ends.',

      'A **for loop** is **iterator-controlled**: it consumes an **iterable** (anything capable of producing its items one at a time) and runs its body once per item, automatically. There is no manual index to manage and no risk of forgetting to update a counter — this makes for loops categorically safer than while loops for "do this once per item" tasks.',

      '**range(stop)**, **range(start, stop)**, and **range(start, stop, step)** generate an arithmetic sequence of integers lazily — without building a list in memory — making `for i in range(n):` the standard idiom for "repeat n times" or "count through a range of integers."',

      '**break** exits the innermost loop immediately, skipping anything after it including an optional **loop-else** clause. **continue** skips the rest of the current iteration and moves to the next one. The loop-else clause runs only if the loop completed WITHOUT hitting a break — a clean way to express "search and report not-found" without a separate flag variable.',
    ],
    callouts: [
      {
        type: 'important',
        title: 'Something inside a while loop MUST change',
        body: 'Every while loop needs a piece of state that moves it toward the exit condition — a counter that decreases, a flag that flips, something being consumed. If you cannot point to the exact line that eventually makes the condition False, you have (or will have) an infinite loop.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 0.5 — while, for, and range()',
        mathBridge: 'Trace each loop by hand — write down the value of every loop variable on every iteration — before trusting the output.',
        caption: 'Two loops. One tests a condition each time; the other consumes an iterable.',
        props: {
          initialCells: [

            // ── CELL 1: while ─────────────────────────────────────────────────
            {
              id: 1,
              cellTitle: 'while — condition-controlled repetition',
              prose: 'The condition `n > 0` is checked BEFORE every iteration, including the very first. The body runs only while it stays True.',
              instructions: 'Trace it by hand: what values does n take, in order?',
              code: 'n = 5\nwhile n > 0:\n    print(n)\n    n = n - 1\nprint("done")',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 2: for over a list ───────────────────────────────────────
            {
              id: 2,
              cellTitle: 'for — iterator-controlled repetition',
              prose: 'The for loop automatically extracts each item from `items`, one at a time, with no manual index or bounds check needed.',
              code: 'items = ["apple", "banana", "cherry"]\nfor fruit in items:\n    print(fruit)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 3: range() ────────────────────────────────────────────────
            {
              id: 3,
              cellTitle: 'range() — generating an integer sequence',
              prose: '`range(stop)` produces integers starting at 0, up to but NOT including stop. `range(start, stop, step)` gives full control over where it begins, ends, and how it counts.',
              instructions: 'Predict the output of both loops before running.',
              code: 'for i in range(3):\n    print(i)\nprint("---")\nfor i in range(1, 10, 2):\n    print(i)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 4: break ───────────────────────────────────────────────────
            {
              id: 4,
              cellTitle: 'break — exiting a loop early',
              prose: '`break` immediately terminates the innermost enclosing loop — nothing after it in the loop body runs again, and the loop stops entirely.',
              code: 'for n in range(10):\n    if n == 4:\n        break\n    print(n)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 5: continue ─────────────────────────────────────────────
            {
              id: 5,
              cellTitle: 'continue — skipping the rest of one iteration',
              prose: '`continue` skips only the rest of the CURRENT iteration\'s body and moves straight to the next item — the loop itself keeps going.',
              code: 'for n in range(5):\n    if n == 2:\n        continue\n    print(n)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 6: loop-else ────────────────────────────────────────────
            {
              id: 6,
              cellTitle: 'The loop-else clause',
              prose: 'A loop\'s `else` block runs ONLY if the loop finished naturally — without a `break`. This lets you write "search and report not-found" without a separate boolean flag.',
              instructions: 'Run this cell, then change target to a value not in items and run again to see the else branch fire.',
              code: 'items = [3, 7, 9]\ntarget = 7\nfor item in items:\n    if item == target:\n        print("found it")\n        break\nelse:\n    print("not found")',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 7: nested loops ──────────────────────────────────────────
            {
              id: 7,
              cellTitle: 'Nested loops',
              prose: 'The inner loop runs to completion for every single iteration of the outer loop — total iterations multiply.',
              code: 'for letter in ["A", "B"]:\n    for number in [1, 2]:\n        print(f"{letter}{number}")',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CELL 8: accumulator pattern ────────────────────────────────────
            {
              id: 8,
              cellTitle: 'The accumulator pattern',
              prose: 'Initialize a variable before the loop, then update it on every iteration — this is how you build up a sum, a count, or a collected result.',
              code: 'total = 0\nfor n in range(1, 6):\n    total += n\nprint(total)',
              output: '', status: 'idle', figureJson: null,
            },

            // ── CHALLENGE 1 ──────────────────────────────────────────────────
            {
              id: 21,
              challengeType: 'write',
              challengeNumber: 1,
              challengeTitle: 'Sum the First 10 Positive Integers',
              difficulty: 'easy',
              prompt: 'Using a for loop and the accumulator pattern, compute the sum of the integers 1 through 10 (inclusive) and store it in a variable named total. End your cell with the bare name total.',
              instructions: 'Your cell should output 55.',
              code: 'total = 0\nfor n in range(1, 11):\n    total += n\ntotal',
              output: '', status: 'idle', figureJson: null,
              testCode: `
result = _
if result == 55:
    res = "SUCCESS: 1+2+...+10 = 55. range(1, 11) includes 1 through 10 because the stop value is exclusive."
else:
    res = f"ERROR: Expected 55, got {result}. Check your range() bounds — remember stop is exclusive."
res
`,
              hint: 'range(1, 11) gives 1 through 10. Add each n to total inside the loop.',
            },

            // ── CHALLENGE 2 ──────────────────────────────────────────────────
            {
              id: 22,
              challengeType: 'write',
              challengeNumber: 2,
              challengeTitle: 'Find the First Multiple of 7',
              difficulty: 'medium',
              prompt: 'Using a for loop over range(1, 100) and break, find the first number greater than 50 that is a multiple of 7, and store it in a variable named answer. End the cell with the bare name answer.',
              instructions: 'Use n % 7 == 0 to test for a multiple of 7, combined with n > 50.',
              code: 'answer = None\nfor n in range(1, 100):\n    if n > 50 and n % 7 == 0:\n        answer = n\n        break\nanswer',
              output: '', status: 'idle', figureJson: null,
              testCode: `
result = _
if result == 56:
    res = "SUCCESS: 56 is the first multiple of 7 greater than 50 (7 * 8 = 56), and break stopped the loop the moment it was found."
else:
    res = f"ERROR: Expected 56, got {result}. Check your condition: n > 50 and n % 7 == 0."
res
`,
              hint: '7 * 7 = 49 (not > 50), 7 * 8 = 56 (> 50). break as soon as you find it, so answer holds the FIRST match.',
            },

            // ── CHALLENGE 3 ──────────────────────────────────────────────────
            {
              id: 23,
              challengeType: 'write',
              challengeNumber: 3,
              challengeTitle: 'Search with Loop-Else',
              difficulty: 'medium',
              prompt: 'Given the list `primes_to_check = [4, 6, 8, 9]` and using the loop-else pattern, print "found a prime" if any number in the list is prime (only divisible by 1 and itself, and greater than 1), or "no primes here" if none are. Hint: none of these numbers are actually prime.',
              instructions: 'A simple primality check: n is NOT prime if any d in range(2, n) divides it evenly. Expected output: no primes here',
              code: [
                'primes_to_check = [4, 6, 8, 9]',
                'found_prime = False',
                'for n in primes_to_check:',
                '    is_prime = n > 1',
                '    for d in range(2, n):',
                '        if n % d == 0:',
                '            is_prime = False',
                '            break',
                '    if is_prime:',
                '        found_prime = True',
                '        break',
                'if found_prime:',
                '    print("found a prime")',
                'else:',
                '    print("no primes here")',
              ].join('\n'),
              output: '', status: 'idle', figureJson: null,
              testCode: `
import io, contextlib
buf = io.StringIO()
primes_to_check = [4, 6, 8, 9]
found_prime = False
with contextlib.redirect_stdout(buf):
    for n in primes_to_check:
        is_prime = n > 1
        for d in range(2, n):
            if n % d == 0:
                is_prime = False
                break
        if is_prime:
            found_prime = True
            break
    if found_prime:
        print("found a prime")
    else:
        print("no primes here")
expected = buf.getvalue().strip()
if expected == "no primes here":
    res = "SUCCESS: 4, 6, 8, and 9 are all composite — none are prime, so the message is 'no primes here'."
else:
    res = "ERROR: reference mismatch — but your cell should print 'no primes here' for this specific list."
res
`,
              hint: 'A number n is prime if nothing in range(2, n) divides it evenly. All of 4, 6, 8, 9 have a divisor in that range.',
            },

          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: {
    prose: [
      '**for loops rely on the iterator protocol**: any object that can produce a sequence of values one at a time (lists, strings, range objects, and more) can be looped over with `for`. You will meet this protocol formally, and learn to write your own iterables, in Module 4.',

      '**range() is lazy**: `range(1_000_000)` does not allocate a million-element list — it computes each value on demand as the loop asks for it, using constant memory regardless of size.',

      '**Nested loop complexity multiplies**: a loop of `n` iterations inside a loop of `m` iterations runs the inner body `n * m` times. This becomes a critical concern once Module 4 introduces algorithmic complexity formally — for now, just notice that nested loops over large collections can get slow fast.',
    ],
    callouts: [
      {
        type: 'warning',
        title: 'break only exits the INNERMOST loop',
        body: 'In a nested loop, a break inside the inner loop does not touch the outer loop at all — the outer loop continues to its next iteration, which will simply re-enter the inner loop from the top. There is no built-in way to break out of multiple nested loops at once; a flag variable or restructuring into a function with an early return is the usual fix.',
      },
    ],
    visualizations: [],
  },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If a while loop never terminates, find the line that is supposed to change the loop variable — it is either missing or not actually moving the condition toward False.',
      'If break inside a nested loop does not stop the whole thing, remember it only exits the innermost loop — you likely need a flag or a function with return.',
      'If a for-else runs when you did not expect it to, check whether a break actually executed — the else only skips if a break fired.',
    ],
    futureLinks: [
      'Next lesson: Functions — packaging repeated logic (including loops) into a reusable, named unit.',
      'Lists get a full treatment in Module 1, including comprehensions — a compact alternative to many simple for loops.',
      'The formal iterator protocol behind for loops returns in Module 4 (Iterators and Generators).',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'What is the fundamental difference between while and for?',
      options: [
        'while is faster than for in every case',
        'while is condition-controlled — it tests a condition each iteration; for is iterator-controlled — it consumes items from an iterable',
        'for can only be used with numbers, while while can be used with anything',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'What does range(1, 10, 2) produce?',
      options: ['1, 2, 3, ..., 10', '1, 3, 5, 7, 9', '2, 4, 6, 8, 10'],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'When does a loop\'s else clause execute?',
      options: [
        'Every time the loop finishes, regardless of how',
        'Only if the loop completed without ever executing a break',
        'Only if the loop body never ran at all',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'A break statement sits inside the inner loop of two nested for loops. What does it stop?',
      options: [
        'Both the inner and outer loop immediately',
        'Only the inner loop — the outer loop proceeds to its next iteration',
        'Nothing — break only works inside while loops',
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    'while tests its condition before every iteration — something in the body must eventually make it False.',
    'for consumes an iterable automatically — no manual index, no off-by-one risk.',
    'range(stop) / range(start, stop) / range(start, stop, step) lazily generates integers — stop is always exclusive.',
    'break exits the innermost loop immediately; continue skips to the next iteration.',
    'A loop\'s else clause runs only if the loop finished WITHOUT hitting a break.',
    'Nested loops multiply iteration counts: an outer loop of m and inner loop of n runs the inner body m * n times.',
    'The accumulator pattern: initialize a variable before the loop, update it every iteration.',
  ],

  checkpoints: ['read-intuition'],
}
