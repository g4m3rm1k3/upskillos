import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-12', slug: 'while-loops', track: 'A', order: 12,
  title: 'While Loops', subtitle: 'Condition-Controlled Repetition',
  tags: ['while', 'convergence', 'infinite-loop', 'binary-search', 'newton'],
  prereqs: ['a-10', 'a-11'], unlocks: ['a-13'],
  hook: {
    question: 'How do you repeat until a condition changes — not a fixed number of times?',
    realWorldContext: 'Numerical algorithms — square roots, equation solvers, gradient descent — repeat until an answer is good enough, not a fixed number of times. They also need a safety limit, because some inputs never become "good enough".',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Trace a while loop, including the check that finally stops it. Spot off-by-one errors in the stopping condition. Explain every way a loop can end, and write a loop that is guaranteed to stop and reports *why* it stopped.',
        '**The smallest example.** `while condition:` checks the condition, runs the body if it is True, then goes back and checks again. It stops the first time the condition is False.',
        '```python\ncount = 3\nwhile count > 0:\n    print(count)\n    count = count - 1\nprint("lift-off")\n```',
        '| Check | count | `count > 0`? | Printed |\n|---|---|---|---|\n| 1 | 3 | True | 3 |\n| 2 | 2 | True | 2 |\n| 3 | 1 | True | 1 |\n| 4 | 0 | **False** — loop ends | lift-off |',
        'The condition is checked one more time than the body runs: the last check is the one that fails. Something inside the body — here `count = count - 1` — must eventually make it fail.',
      ),
      check(
        'If the condition were `count >= 0`, what would the loop print?',
        ['3 2 1', '3 2 1 0', '3 2 1 0 -1'],
        1,
        'With `>=`, the check at count = 0 is still True, so 0 is printed too; the loop ends when count reaches −1. One character changed the number of iterations — an **off-by-one error**.',
      ),
      notebook('Tracing while loops', [
        demo(1, 'Stage 1 — Countdown', [
          'The trace table above, in code.',
        ], 'Run. Then change > to >= and check your answer to the question above.', 'count = 3\nwhile count > 0:\n    print(count)\n    count = count - 1\nprint("lift-off")', { expectOutput: ['3\n2\n1\nlift-off'] }),
        demo(2, 'Stage 2 — Repeat until a threshold', [
          'Here the number of iterations is not obvious in advance — which is exactly when a while loop fits. It adds 1, 2, 3, … until the total reaches at least 100.',
        ], 'Estimate the number of steps before running. Then change the threshold to 1000.', 'total = 0\nstep = 0\nwhile total < 100:\n    step = step + 1\n    total = total + step\nprint("steps:", step, "total:", total)', { expectOutput: ['steps: 14 total: 105'] }),
      ]),
      prose(
        '**How does this loop end?** Ask this about every while loop. A loop can end in several ways:',
        '1. The condition becomes False because something it tests changes in the body — a **termination variable** such as a counter.\n2. `break` jumps out, often from a `while True:` loop that breaks when a result is found.\n3. `return` leaves the loop and the whole function.\n4. An exception is raised.\n5. The condition depends on something outside the body, such as the time or a file.',
        'If none of these can happen, the loop never ends: an **infinite loop**. Your notebook cell will show `In [*]` for ever and you must reload the page. A condition that tests nothing the body changes is a warning sign, but not proof — a `break` inside may still end it.',
        '**The bounded pattern.** When you cannot be sure the condition will ever become False, add a **maximum-iteration guard**, and afterwards report which exit happened:',
        '```python\niterations = 0\nwhile not finished and iterations < 1000:\n    ...  # one step of work\n    iterations = iterations + 1\nif not finished:\n    print("stopped by the guard, not by success")\n```',
      ),
      notebook('Loops that might not end', [
        demo(3, 'Stage 3 — A guard catches a loop that would never end', [
          'At 0% interest the balance never reaches 1000, so the condition alone would loop for ever. The guard stops it after 50 years, and the final check says which exit happened.',
        ], 'Run. Then change the rate to 0.05 and run again: which exit happens now, and after how many years?', 'balance = 100.0\nrate = 0.0\nyears = 0\nwhile balance < 1000 and years < 50:\n    balance = balance * (1 + rate)\n    years = years + 1\n\nif balance >= 1000:\n    print("reached 1000 after", years, "years")\nelse:\n    print("stopped by the guard after", years, "years; balance", balance)', { expectOutput: ['stopped by the guard after 50 years; balance 100.0'] }),
        demo(4, 'Stage 4 — while True with break', [
          'The condition `True` never changes, so the only exit is `break`. This form suits "keep trying until you find it".',
        ], 'Trace `n` and `n * n` for each iteration, then run. Then find the first n whose cube exceeds 500.', 'n = 1\nwhile True:\n    if n * n > 50:\n        break\n    n = n + 1\nprint("first n with n*n > 50:", n)', { expectOutput: ['first n with n*n > 50: 8'] }),
      ]),
      prose(
        '**Convergence loops.** Many numerical methods improve a guess repeatedly until it stops changing much. Newton\'s method for the square root of x replaces a guess g with the average of g and x / g. Each new guess is closer to √x, so the change between guesses shrinks, and the loop stops when the change is below a **tolerance** such as 1e-10.',
        '| Iteration | guess for √25 | change |\n|---|---|---|\n| start | 12.5 | — |\n| 1 | 7.25 | 5.25 |\n| 2 | 5.349… | 1.90 |\n| 3 | 5.011… | 0.34 |\n| 4 | 5.000013… | 0.011 |\n| 5 | 5.0000000000168… | 0.000013 |\n| 6 | 5.0 | 0.000000000017 — below 1e-10, so stop |',
        'Two cautions. A small change means the method has *settled*, not that it settled on the right answer — check the result (here, square it). And some inputs never settle: Newton\'s method for a negative number jumps around for ever. So a convergence loop always needs a maximum-iteration guard and must report whether it converged.',
      ),
      notebook('Convergence', [
        demo(5, 'Stage 5 — Newton\'s method, traced', [
          'Each iteration prints the guess and how much it changed. The loop stops on small change or after 50 iterations, and the result is checked by squaring it.',
        ], 'Run and compare with the table. Then try x = 2. Then try x = -2 and see the guard report failure.', 'x = 25\nguess = x / 2\niterations = 0\nconverged = False\nwhile iterations < 50:\n    better = (guess + x / guess) / 2\n    change = abs(better - guess)\n    guess = better\n    iterations = iterations + 1\n    print(iterations, guess, change)\n    if change < 1e-10:\n        converged = True\n        break\nprint("converged:", converged, "| guess squared:", guess * guess)', { expectOutput: ['converged: True | guess squared: 25.0'] }),
        demo(6, 'Stage 6 — Binary search', [
          'To find a number between 0 and 100, guess the middle and keep only the half that can contain the target. Each iteration halves the range, so it takes at most 7 guesses. `found` records which exit happened: finding the target, or the range becoming empty.',
        ], 'Run. Then search for 101, which is not in the range: what stops the loop, and what does found report?', 'target = 73\nlo, hi = 0, 100\nsteps = 0\nfound = False\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    steps = steps + 1\n    if mid == target:\n        found = True\n        break\n    elif mid < target:\n        lo = mid + 1\n    else:\n        hi = mid - 1\nprint("found:", found, "after", steps, "guesses")', { expectOutput: ['found: True after'] }),
      ]),
      prose('**Practice.** Challenge 1 is a stopping condition with a boundary. Challenge 2 counts iterations exactly. Challenge 3 is a fresh repair: make a convergence loop that always stops and says whether it succeeded.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Smallest power of 2 above a limit', 'easy', {
          prompt: 'Find the smallest power of 2 that is strictly greater than 1024. Store it in result and its exponent in exponent (so result == 2 ** exponent).',
          instructions: 'Start from power = 1 and exponent = 0. Keep doubling while the power is not yet strictly greater than the limit. Check what happens when the power equals the limit exactly.',
          code: 'result = None\nexponent = None',
          testCode: `assert result != 1024, "1024 is not strictly greater than 1024. Keep looping while power <= 1024"
assert result == 2048 and exponent == 11, f"Expected 2048 = 2 ** 11, got {result} and {exponent}"
"SUCCESS: 2 ** 11 = 2048 is the smallest power of 2 above 1024."`,
          hint: 'power, exponent = 1, 0\nwhile power <= 1024:\n    power = power * 2\n    exponent = exponent + 1\nresult = power',
          solution: 'power, exponent = 1, 0\nwhile power <= 1024:\n    power = power * 2\n    exponent = exponent + 1\nresult = power',
          misconceptions: [{ code: 'power, exponent = 1, 0\nwhile power < 1024:\n    power *= 2\n    exponent += 1\nresult = power', feedback: 'Keep looping while power <= 1024' }],
        }),
        exercise(12, 2, 'Challenge 2 — Collatz steps', 'medium', {
          prompt: 'Starting from n = 27, repeatedly apply: if n is even, halve it; if odd, replace it with 3n + 1. Count in steps how many rules are applied until n becomes 1.',
          instructions: 'Loop while n is not 1. Apply one rule per iteration and add 1 to steps each time. Use // for halving so n stays a whole number.',
          code: 'n = 27\nsteps = 0',
          testCode: `assert steps != 112, "112 counts the starting value too. Count rule applications only: steps starts at 0 and increases once per iteration"
assert steps == 111, f"Expected 111 steps, got {steps}"
"SUCCESS: 27 takes 111 steps to reach 1. (Whether every start reaches 1 is a famous unsolved problem.)"`,
          hint: 'while n != 1:\n    if n % 2 == 0:\n        n = n // 2\n    else:\n        n = 3 * n + 1\n    steps = steps + 1',
          solution: 'n = 27\nsteps = 0\nwhile n != 1:\n    if n % 2 == 0:\n        n = n // 2\n    else:\n        n = 3 * n + 1\n    steps = steps + 1',
          misconceptions: [{ code: 'n = 27\nsteps = 1\nwhile n != 1:\n    n = n // 2 if n % 2 == 0 else 3 * n + 1\n    steps += 1', feedback: 'Count rule applications only' }],
        }),
        exercise(13, 3, 'Challenge 3 — A convergence loop that always stops', 'hard', {
          prompt: 'Repair newton_sqrt so it always stops and reports success. It must return two values, (estimate, converged): stop with converged True when a new guess changes by less than tolerance, or with converged False after max_iter iterations. Handle x = 0 without dividing by zero.',
          instructions: '1. Return 0.0, True straight away when x is 0.\n2. Count iterations and stop at max_iter.\n3. Return (guess, False) if the guard is what stopped the loop.\nThe checker tries 25, 2, 0, a negative number, and a case where max_iter is too small.',
          code: 'def newton_sqrt(x, tolerance=1e-10, max_iter=50):\n    guess = x / 2\n    while True:\n        better = (guess + x / guess) / 2\n        if abs(better - guess) < tolerance:\n            return better\n        guess = better',
          testCode: `r = newton_sqrt(25)
assert isinstance(r, tuple) and len(r) == 2, "Return two values: (estimate, converged)"
est, ok = r
assert ok is True and abs(est - 5) < 1e-9, f"newton_sqrt(25) should converge to 5.0, got {r}"
est, ok = newton_sqrt(2)
assert ok is True and abs(est * est - 2) < 1e-9, "newton_sqrt(2) should converge to about 1.41421356"
assert newton_sqrt(0) == (0.0, True), "x = 0: guess starts at 0 and x / guess divides by zero. Return (0.0, True) before the loop"
est, ok = newton_sqrt(-2)
assert ok is False, "A negative number has no real square root, so the guesses never settle: the guard must stop the loop and report converged False"
est, ok = newton_sqrt(1e6, max_iter=3)
assert ok is False, "With max_iter=3 there are not enough iterations to converge: report converged False"
"SUCCESS: the loop always stops, and the caller can tell success from giving up."`,
          hint: 'if x == 0: return 0.0, True\nguess = x / 2\niterations = 0\nwhile iterations < max_iter:\n    better = (guess + x / guess) / 2\n    if abs(better - guess) < tolerance:\n        return better, True\n    guess = better\n    iterations = iterations + 1\nreturn guess, False',
          solution: 'def newton_sqrt(x, tolerance=1e-10, max_iter=50):\n    if x == 0:\n        return 0.0, True\n    guess = x / 2\n    iterations = 0\n    while iterations < max_iter:\n        better = (guess + x / guess) / 2\n        if abs(better - guess) < tolerance:\n            return better, True\n        guess = better\n        iterations = iterations + 1\n    return guess, False',
          misconceptions: [
            { code: 'def newton_sqrt(x, tolerance=1e-10, max_iter=50):\n    if x == 0:\n        return 0.0, True\n    guess = x / 2\n    for i in range(max_iter):\n        better = (guess + x / guess) / 2\n        if abs(better - guess) < tolerance:\n            return better, True\n        guess = better\n    return guess, True', feedback: 'report converged False' },
          ],
        }),
      ]),
    ],
  },
  mentalModel: [
    'while checks its condition before every iteration; the final, failing check ends the loop.',
    'Off-by-one errors live in the stopping condition: test the boundary (> versus >=).',
    'Ask how a loop ends: condition becomes False, break, return, an exception, or an outside change.',
    'When ending is not certain, add a maximum-iteration guard and report which exit happened.',
    'Convergence (small change) means settled, not necessarily correct — check the result.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'x = 1; while x < 100: x *= 2. How many times does the body run?',
      options: ['99', '7 — x goes 1, 2, 4, 8, 16, 32, 64, 128; the check fails at 128', '100'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'When is a while loop a better fit than a for loop?',
      options: [
        'When iterating over a list',
        'When the number of iterations is not known in advance, such as repeating until a result is good enough',
        'Always',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'A convergence loop stopped because of its max-iteration guard. What should the code do?',
      options: [
        'Return the last guess as if it had converged',
        'Report that it did not converge, so the caller does not treat an unfinished guess as an answer',
        'Restart the loop',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'A loop\'s condition tests a name that the body never changes. Is it certainly infinite?',
      options: [
        'Yes, always',
        'Not necessarily — a break, return or exception inside the body can still end it; but it is a warning sign',
        'No, Python stops loops automatically after a while',
      ],
      correct: 1,
    },
  ],
}
