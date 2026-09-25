import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-15', slug: 'debugging-and-error-types', track: 'A', order: 15,
  title: 'Algorithmic Thinking and Debugging', subtitle: 'Reading Errors, Finding Bugs',
  tags: ['debugging', 'errors', 'traceback', 'systematic', 'decomposition'],
  prereqs: ['a-11', 'a-14'], unlocks: ['a-16', 'b-01'],
  hook: {
    question: 'How do you find a bug you cannot see by reading the code?',
    realWorldContext: 'Experienced programmers make plenty of mistakes; they find them faster because they follow a routine: reproduce, shrink, compare expected with actual, test one idea at a time, and keep a test so the bug stays fixed.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Read a traceback from the bottom up. Name the common error types and what each suggests checking. Debug a program that gives a wrong answer *without* an error, using an expected-versus-actual table and a minimal example. Protect a fix with asserts.',
        '**The smallest example.** When an error happens inside a function, Python prints a **traceback**: the chain of calls that led to it, oldest first. Here `calculate` is called with a list containing the text "4":',
        '```text\nTraceback (most recent call last):\n  File "<exec>", line 7, in <module>\n    result = calculate(nums)\n  File "<exec>", line 2, in calculate\n    total = sum(data)\nTypeError: unsupported operand type(s) for +: \'int\' and \'str\'\n```',
        '| Part | What it tells you |\n|---|---|\n| last line | the error type (TypeError) and message: an int and a str were added |\n| the frame just above it | where it happened: line 2, inside `calculate`, at `sum(data)` |\n| earlier frames | how the program got there: line 7 called `calculate` |',
        'Read from the bottom up. The line that raised the error is not always where the mistake is: here `sum` is fine; the bad value was created on the line that built `nums`.',
      ),
      notebook('Tracebacks', [
        demo(1, 'Stage 1 — Read a traceback', [
          'The error is raised inside `calculate`, but the mistake is in the data passed to it.',
        ], 'Run. From the traceback find: the error type, the line that raised it, and the line that called the function. Then fix the data, not the function.', 'def calculate(data):\n    total = sum(data)\n    return total / len(data)\n\nnums = [1, 2, 3, "4", 5]\nresult = calculate(nums)\nprint(result)', { expectError: 'TypeError' }),
      ]),
      prose(
        '**What the error type suggests.** The last line of a traceback names an error type. Each type points to a different first check.',
        '| Error | Typical cause | Check first |\n|---|---|---|\n| SyntaxError / IndentationError | code Python cannot parse | the marked line and the one above it (missing bracket, quote or colon) |\n| NameError | name not bound here | spelling, order, scope, or a cell that never ran (A.05) |\n| TypeError | wrong type for an operation | `type()` of each value involved |\n| ValueError | right type, unusable value | the value itself, e.g. `int("abc")` |\n| IndexError | position past the end | `len()` of the list and the index used |\n| KeyError | key not in the dict | the exact key, including case and spaces |\n| ZeroDivisionError | dividing by zero | where the divisor came from; empty data often gives 0 |',
      ),
      check(
        'Which error does `int("abc")` raise?',
        ['TypeError', 'ValueError', 'NameError'],
        1,
        '`int()` accepts text (the right type), but this particular text is not a number (an unusable value), so it is a ValueError.',
      ),
      notebook('Error types', [
        demo(2, 'Stage 2 — Six errors, one line each', [
          'Each small snippet raises a different error. `try` / `except` catches an error so the loop can print its type and message and move on to the next snippet. You will use it properly later; here it just lets one cell show all six errors.',
        ], 'Before running, predict the error type for each snippet. Then run and compare.', 'snippets = [\n    "sums([1, 2, 3])",\n    "[1, 2, 3][5]",\n    "\'Count: \' + 42",\n    "{\'a\': 1}[\'b\']",\n    "int(\'abc\')",\n    "10 / 0",\n]\nfor code in snippets:\n    try:\n        eval(code)\n    except Exception as e:\n        print(f"{code:22} -> {type(e).__name__}: {e}")', { expectOutput: ['NameError', 'IndexError', 'TypeError', 'KeyError', 'ValueError', 'ZeroDivisionError'] }),
      ]),
      prose(
        '**Bugs without errors.** The hardest bugs produce a wrong answer and no error message. The routine:',
        '1. **Reproduce** it with a specific input.\n2. **Shrink** the input to the smallest one that still goes wrong (a *minimal reproduction*).\n3. **Compare** expected with actual for each step, in a table.\n4. Form one **hypothesis** about the cause and test it (print a value, or add an assert).\n5. **Fix** it, then keep the failing example as an assert so the bug cannot quietly return.',
        'Example: `pass_rate([70, 45, 85])` should be about 66.7 (two of three scores pass) but returns 33.3. Trace expected against actual:',
        '| Step | Expected `passing` | Actual `passing` |\n|---|---|---|\n| score 70 (passes) | 1 | 1 |\n| score 45 (fails) | 1 | 1 |\n| score 85 (passes) | **2** | **1** |',
        'The first mismatch is at score 85: `passing` did not increase. The line was `passing =+ 1`, which Python reads as `passing = +1` — it sets passing to 1 rather than adding 1.',
      ),
      notebook('Wrong answers without errors', [
        demo(3, 'Stage 3 — Print the state to find the first mismatch', [
          'A print inside the loop turns the expected-versus-actual table into output you can check.',
        ], 'Run and find the first row where passing is not what you expect. Fix =+ to += and run again.', 'def pass_rate(scores):\n    passing = 0\n    for score in scores:\n        if score >= 60:\n            passing =+ 1\n        print("score", score, "passing", passing)\n    return passing / len(scores) * 100\n\nprint(pass_rate([70, 45, 85]))', { expectOutput: ['score 85 passing 1', '33.33'] }),
        demo(4, 'Stage 4 — Explain it to a rubber duck', [
          'Explaining each line out loud — to a colleague or a rubber duck — forces you to say what a line *should* do. This function is meant to average the non-zero numbers.',
        ], 'Before running, explain each line in a comment. Which line never runs that should? Then run, read the error, and fix it.', 'def avg_nonzero(numbers):\n    total = 0\n    count = 0\n    for n in numbers:\n        if n != 0:\n            total += n\n    return total / count\n\nprint(avg_nonzero([1, 0, 2, 0, 3]))', { expectError: 'ZeroDivisionError' }),
        demo(5, 'Stage 5 — Shrink the failing input', [
          'A long input fails somewhere. Trying each record on its own finds the smallest input that reproduces the problem.',
        ], 'Run and read which record fails. Then fix parse_price so it handles that case.', 'def parse_price(text):\n    return float(text.replace("£", ""))\n\nrecords = ["£3.50", "£12.00", "£4,20", "£7.25"]\nfor r in records:\n    try:\n        parse_price(r)\n    except ValueError as e:\n        print("minimal failing input:", repr(r), "->", e)', { expectOutput: ["minimal failing input: '£4,20'"] }),
        demo(6, 'Stage 6 — Keep the bug fixed with asserts', [
          'After fixing a bug, turn the failing example into an assert. It passes silently now, and fails loudly if a later change brings the bug back.',
        ], 'Run: no output means all tests passed. Then reintroduce =+ and run again.', 'def pass_rate(scores):\n    if not scores:\n        return 0.0\n    passing = 0\n    for score in scores:\n        if score >= 60:\n            passing += 1\n    return passing / len(scores) * 100\n\nassert abs(pass_rate([70, 45, 85]) - 200 / 3) < 1e-9, "the =+ bug is back"\nassert pass_rate([]) == 0.0, "empty input must not divide by zero"\nprint("regression tests passed")', { expectOutput: ['regression tests passed'] }),
      ]),
      callout('strategy', 'Decompose to debug', 'A function that does one job can be tested on its own. When a long calculation is wrong, split it into small functions (parse, clean, compute, report) and test each one with a tiny input. The bug is in the first piece whose output is wrong.'),
      prose('**Practice.** Challenge 1 is a guided bug hunt with three different bugs. Challenge 2 builds a small decision you can test. Challenge 3 is a fresh, unfamiliar bug: fix it and name its cause.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Bug hunt', 'medium', {
          prompt: 'pass_rate should return the percentage of scores that are 60 or more, and 0.0 for an empty list. It has three bugs: one syntax error, one silent wrong answer, and one crash on empty input. Fix all three.',
          instructions: '1. Run it and fix the SyntaxError.\n2. Run again: the answer is wrong but there is no error. Trace passing.\n3. Try pass_rate([]) and guard against it.',
          code: 'def pass_rate(scores):\n    passing = 0\n    for score in scores:\n        if score => 60:\n            passing =+ 1\n    return passing / len(scores) * 100\n\nprint(pass_rate([70, 45, 85, 55, 90]))',
          testCode: `got = pass_rate([70, 45, 85, 55, 90])
assert abs(got - 20.0) > 1e-9, "20% means passing only ever reaches 1: passing =+ 1 is passing = +1. Use +="
assert abs(got - 60.0) < 1e-9, f"pass_rate([70, 45, 85, 55, 90]) should be 60.0, got {got}"
assert pass_rate([100, 100]) == 100.0 and pass_rate([0, 0]) == 0.0, "Check all-pass and all-fail inputs"
try:
    empty = pass_rate([])
except ZeroDivisionError:
    raise AssertionError("pass_rate([]) divides by zero: return 0.0 when the list is empty")
assert empty == 0.0, "pass_rate([]) should return 0.0"
"SUCCESS: => became >=, =+ became +=, and empty input returns 0.0."`,
          hint: 'if not scores: return 0.0 at the top; >= not =>; += not =+',
          solution: 'def pass_rate(scores):\n    if not scores:\n        return 0.0\n    passing = 0\n    for score in scores:\n        if score >= 60:\n            passing += 1\n    return passing / len(scores) * 100',
          misconceptions: [
            { code: 'def pass_rate(scores):\n    passing = 0\n    for score in scores:\n        if score >= 60:\n            passing =+ 1\n    return passing / len(scores) * 100', feedback: 'Use +=' },
            { code: 'def pass_rate(scores):\n    passing = 0\n    for score in scores:\n        if score >= 60:\n            passing += 1\n    return passing / len(scores) * 100', feedback: 'return 0.0 when the list is empty' },
          ],
        }),
        exercise(12, 2, 'Challenge 2 — FizzBuzz, testable', 'medium', {
          prompt: 'Write classify(n): return "FizzBuzz" if n is divisible by both 3 and 5, "Fizz" if only by 3, "Buzz" if only by 5, and otherwise the number as text.',
          instructions: 'Because classify returns a value instead of printing, it can be tested with asserts. Think about the order of the conditions (Lesson A.10).',
          code: 'def classify(n):\n    if n % 3 == 0:\n        return "Fizz"\n    elif n % 5 == 0:\n        return "Buzz"\n    elif n % 15 == 0:\n        return "FizzBuzz"\n    return str(n)',
          testCode: `assert classify(15) != "Fizz", "15 is divisible by 3, so the Fizz branch matched first. Check divisibility by 15 before the others"
for n, want in [(3, "Fizz"), (5, "Buzz"), (15, "FizzBuzz"), (30, "FizzBuzz"), (7, "7"), (1, "1")]:
    assert classify(n) == want, f"classify({n}) should be {want!r}, got {classify(n)!r}"
"SUCCESS: the most specific condition is checked first."`,
          hint: 'Move the n % 15 == 0 check to the top.',
          solution: 'def classify(n):\n    if n % 15 == 0:\n        return "FizzBuzz"\n    elif n % 3 == 0:\n        return "Fizz"\n    elif n % 5 == 0:\n        return "Buzz"\n    return str(n)',
          misconceptions: [{ code: 'def classify(n):\n    if n % 3 == 0:\n        return "Fizz"\n    if n % 15 == 0:\n        return "FizzBuzz"\n    if n % 5 == 0:\n        return "Buzz"\n    return str(n)', feedback: 'Check divisibility by 15 before the others' }],
        }),
        exercise(13, 3, 'Challenge 3 — An unfamiliar bug', 'hard', {
          prompt: 'average_word_length should return the mean number of letters per word. It runs without error but gives wrong answers. Fix it, and set cause to the letter of the correct explanation.',
          prose: [
            'Candidate causes:',
            '- A: it divides by zero for some sentences\n- B: the total counts spaces (and gaps between double spaces) as if they were letters\n- C: split() returns numbers instead of words',
            'Build an expected-versus-actual table for "the cat sat" before changing anything. Then try a sentence with two spaces between words.',
          ],
          instructions: 'Use `sentence.split()` with no argument (it splits on any run of spaces) and add up the length of each word.',
          code: 'def average_word_length(sentence):\n    words = sentence.split(" ")\n    return len(sentence) / len(words)\n\ncause = None  # "A", "B" or "C"\nprint(average_word_length("the cat sat"))',
          testCode: `got = average_word_length("the cat sat")
assert abs(got - 11 / 3) > 1e-9, "11 / 3 counts the 2 spaces as letters: 'the cat sat' has 9 letters in 3 words"
assert abs(got - 3.0) < 1e-9, f"average_word_length('the cat sat') should be 3.0, got {got}"
assert abs(average_word_length("a  bb") - 1.5) < 1e-9, "With two spaces, split(' ') produces an empty 'word'. Use split() with no argument"
assert abs(average_word_length("data") - 4.0) < 1e-9, "A single word's average is its own length"
assert cause == "B", "The wrong answers come from counting spaces as letters (and empty 'words' from double spaces) — cause B"
"SUCCESS: sum the word lengths from split(), and you have found and named the cause."`,
          hint: 'words = sentence.split()\nreturn sum(len(w) for w in words) / len(words)',
          solution: 'def average_word_length(sentence):\n    words = sentence.split()\n    return sum(len(w) for w in words) / len(words)\n\ncause = "B"',
          misconceptions: [
            { code: 'def average_word_length(sentence):\n    words = sentence.split()\n    return len(sentence) / len(words)\ncause = "B"', feedback: 'counts the 2 spaces as letters' },
          ],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Read tracebacks bottom-up: error type and message, then the line that raised it, then how the program got there.',
    'The error type suggests the first check: Type → types, Value → the value, Index → length, Key → exact key.',
    'Wrong answer, no error: reproduce, shrink, compare expected with actual step by step, test one hypothesis.',
    'The line that raises an error is not always the line with the mistake.',
    'Keep every fixed bug as an assert so it cannot quietly return.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: '"IndexError: list index out of range" appears for lst[5]. What does that tell you?',
      options: [
        'The list has exactly 5 items',
        'The list has at most 5 items (indices up to 4), so index 5 does not exist — compare the expected size with len(lst)',
        'The list is empty',
      ],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'A traceback has several frames. Which part should you read first?',
      options: ['The first line', 'The last line: the error type and message, then the frame just above it', 'The middle frame'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'A function returns a wrong number but raises no error. What is the most useful first step?',
      options: [
        'Rewrite the function from scratch',
        'Reproduce it with a small specific input and compare expected with actual values step by step',
        'Add try/except around it',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'Why turn a fixed bug\'s failing input into an assert?',
      options: [
        'Asserts make the code faster',
        'The assert passes silently now and fails loudly if a later change reintroduces the bug',
        'Python requires it',
      ],
      correct: 1,
    },
  ],
}
