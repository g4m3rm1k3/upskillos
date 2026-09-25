export default {
  id: 'a-02',
  slug: 'values-and-types',
  track: 'A',
  order: 2,
  title: 'Values and Types',
  subtitle: 'Four Core Built-in Types',
  tags: ['types', 'int', 'float', 'str', 'bool', 'type-conversion'],
  prereqs: ['a-01'],
  unlocks: ['a-03', 'a-04'],

  hook: {
    question: 'Why does 3 + 4 give 7 but "3" + "4" give "34"?',
    realWorldContext:
      'The same operator (+) does completely different things depending on the type of the values it operates on. ' +
      'Type is not metadata — it determines every operation. A data scientist who ignores types will spend hours ' +
      'debugging why their average is wrong because a column of numbers was stored as strings.',
  },

  intuition: {
    prose: [
      'Python has many built-in types. We start with the four you will use first: `int` (whole numbers), `float` (decimals), `str` (text), and `bool` (True/False). Later lessons add lists, dictionaries, `None` and more. Every value has exactly one **exact type**, which `type()` reports: `type(3)` is `int`, `type("3")` is `str`.',
      'The type determines what operations are valid and what they mean. `+` on two ints means arithmetic addition. `+` on two strings means concatenation. `+` on a string and an int means a **TypeError** — Python refuses to guess what you meant.',
      'You can **convert** between types explicitly using `int()`, `float()`, `str()`, and `bool()`. Python will sometimes convert automatically — `3 + 4.0` gives `7.0` because int was promoted to float. But it will never convert silently between numbers and strings.',
    ],
    callouts: [
      {
        type: 'important',
        title: 'Four Core Built-in Types',
        body: 'int: whole numbers (3, -10, 1000000)\nfloat: decimals (3.14, -0.001, 1.0)\nstr: text ("hello", "42", "")\nbool: True or False (exactly these two values)\n\nThese are the first four types to learn, not the only ones. Python also has None, list, dict, tuple, set, complex and more.',
      },
      {
        type: 'warning',
        title: '"42" is not 42',
        body: 'The string "42" and the integer 42 are completely different values. "42" + 1 is a TypeError. int("42") + 1 is 43. Always know which one you have.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Types in Action',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Stage 1 — Revealing the Four Core Types',
              prose: '`type()` is a built-in function that tells you the type of any value. Run each line and see the type labels Python uses.',
              instructions: 'Run the cell. Notice Python says <class \'int\'> not just "int". The word class means type here — they are the same thing.',
              code: 'print(type(42))\nprint(type(3.14))\nprint(type("hello"))\nprint(type(True))',
              output: '',
              status: 'idle',
            },
            {
              id: 2,
              cellTitle: 'Stage 2 — Same Operator, Different Meaning',
              prose: 'The + operator means completely different things depending on type. This is not a quirk — it is the design. The operator asks "what does addition mean for this type?"',
              instructions: 'Run the cell. Notice: ints add arithmetically, strings concatenate, and mixing them crashes. This crash is Python doing the right thing — refusing to guess.',
              code: 'print(3 + 4)          # int + int = arithmetic\nprint("3" + "4")       # str + str = concatenation\n# print("3" + 4)       # TypeError — uncomment to see it',
              output: '',
              status: 'idle',
            },
            {
              id: 3,
              cellTitle: 'Stage 3 — Automatic Type Promotion',
              prose: 'When Python mixes int and float in arithmetic, it promotes the int to float. This is the only automatic conversion Python does between numeric types. The result is always float.',
              instructions: 'Run the cell. Notice that 3 + 4.0 produces 7.0 (a float), not 7 (an int). The decimal point is Python\'s signal that this is a float.',
              code: 'print(3 + 4)      # int + int → int\nprint(3 + 4.0)    # int + float → float\nprint(type(3 + 4))\nprint(type(3 + 4.0))',
              output: '',
              status: 'idle',
            },
            {
              id: 4,
              cellTitle: 'Stage 4 — Explicit Type Conversion',
              prose: 'You can convert between types explicitly. `int()` truncates floats (drops the decimal). `float()` adds a decimal. `str()` converts any value to its text representation. `bool()` converts to True or False.',
              instructions: 'Run the cell. Notice int(3.9) gives 3, not 4 — it truncates, does not round. Notice int("42") works but int("hello") crashes.',
              code: 'print(int(3.9))       # truncates, does not round\nprint(float(7))       # 7.0\nprint(str(42))        # "42"\nprint(int("42"))      # "42" → 42\n# print(int("hello")) # ValueError — uncomment to see',
              output: '',
              status: 'idle',
            },
            {
              id: 5,
              cellTitle: 'Stage 5 — Boolean Values',
              prose: 'bool has exactly two values: True and False (capital T, capital F). They behave as 1 and 0 in arithmetic because bool is a special kind of int (a *subclass*). So there are two different questions you can ask about a value: "what is its exact type?" (`type(x)`), and "can it be used as this type?" (`isinstance(x, int)`). For True, the exact type is bool, but isinstance(True, int) is also True.',
              instructions: 'Predict each line before running. The bool type will reappear heavily in Lesson A.09 (comparisons) and A.10 (conditionals). The isinstance result matters later: a check like isinstance(x, int) will also accept True and False.',
              code: 'print(True)\nprint(False)\nprint(type(True))              # exact type: bool\nprint(isinstance(True, int))   # True — a bool can be used as an int\nprint(type(True) == int)       # False — but its exact type is not int\nprint(True + True)   # 2 — True behaves as 1\nprint(True * 5)      # 5',
              output: '',
              status: 'idle',
            },
            {
              id: 6,
              cellTitle: 'Stage 6 — The "42 is not 42" Problem',
              prose: 'This cell demonstrates the most common data-science type confusion: a column of numbers stored as strings. Everything looks fine until you try to compute with it.',
              instructions: 'Run the cell. The prices list looks like numbers but every element is a string. The sum fails because you cannot add strings. Fix it by converting each element to float.',
              code: 'prices = ["10.99", "5.50", "3.25"]  # looks like numbers!\nprint(type(prices[0]))              # but it\'s a string\n# print(sum(prices))               # TypeError — uncomment\n\n# Fix: convert to float\nfloat_prices = [float(p) for p in prices]\nprint(sum(float_prices))',
              output: '',
              status: 'idle',
            },
            {
              id: 11,
              challengeType: 'write',
              challengeNumber: 1,
              challengeTitle: 'Challenge 1 — Type Surgery',
              difficulty: 'easy',
              prompt: 'Given the string `raw = "365"`, create three new variables: `as_int` (the value as an integer), `as_float` (the value as a float), and `as_bool` (the value as a boolean). Do this using explicit conversion functions — not by typing the values directly.',
              instructions: '1. Start from raw = "365".\n2. Convert it to int, float, and bool.\n3. Store each in the named variable.\n4. The test will check all three.',
              code: 'raw = "365"\n# Your code here\nas_int = \nas_float = \nas_bool = \n',
              output: '',
              status: 'idle',
              testCode: `
if 'as_int' not in locals(): raise ValueError("Missing: as_int")
if 'as_float' not in locals(): raise ValueError("Missing: as_float")
if 'as_bool' not in locals(): raise ValueError("Missing: as_bool")
if type(as_int) != int: raise ValueError(f"as_int should be int, got {type(as_int)}")
if type(as_float) != float: raise ValueError(f"as_float should be float, got {type(as_float)}")
if type(as_bool) != bool: raise ValueError(f"as_bool should be bool, got {type(as_bool)}")
if as_int != 365: raise ValueError(f"as_int should be 365, got {as_int}")
if as_float != 365.0: raise ValueError(f"as_float should be 365.0, got {as_float}")
if as_bool != True: raise ValueError(f"as_bool should be True (any nonzero number is truthy), got {as_bool}")
res = "SUCCESS: All three conversions correct. Note: bool(365) is True because any non-zero number is truthy."
res
`,
              hint: 'as_int = int(raw) | as_float = float(raw) | as_bool = bool(int(raw))',
            },
            {
              id: 12,
              challengeType: 'write',
              challengeNumber: 2,
              challengeTitle: 'Challenge 2 — The Data Import Problem',
              difficulty: 'medium',
              prompt: 'A CSV file was loaded incorrectly. The list `data` contains prices as strings with dollar signs. Compute the total and average as proper floats. Store them as `total` and `average`.',
              instructions: '1. Strip the "$" from each string (hint: s.replace("$",""))\n2. Convert to float\n3. Compute sum and average\n4. No loops — use a list comprehension for step 1-2',
              code: 'data = ["$12.50", "$8.99", "$24.00", "$5.75", "$15.30"]\n# Your code here\ntotal = \naverage = \n',
              output: '',
              status: 'idle',
              testCode: `
if 'total' not in locals(): raise ValueError("Missing: total")
if 'average' not in locals(): raise ValueError("Missing: average")
expected_total = 12.50 + 8.99 + 24.00 + 5.75 + 15.30
expected_avg = expected_total / 5
if abs(total - expected_total) > 0.01:
    raise ValueError(f"total should be {expected_total:.2f}, got {total:.2f}. Did you strip the $ and convert to float?")
if abs(average - expected_avg) > 0.01:
    raise ValueError(f"average should be {expected_avg:.2f}, got {average:.2f}.")
res = f"SUCCESS: total={total:.2f}, average={average:.2f}. This exact problem appears in every real data pipeline."
res
`,
              hint: 'cleaned = [float(s.replace("$","")) for s in data]\ntotal = sum(cleaned)\naverage = total / len(cleaned)',
            },
          ],
        },
      },
    ],
  },

  mentalModel: [
    'Every value has one exact type (type(x)). The four core types to start with are int, float, str and bool; Python has many more.',
    'isinstance(x, T) asks whether x can be used as a T — isinstance(True, int) is True because bool is a subclass of int.',
    'The type determines which operations are valid and what they mean.',
    'int + float → float (automatic promotion). str + int → TypeError (no automatic conversion).',
    'Convert explicitly: int(), float(), str(), bool().',
    'In real data, numbers stored as strings are an extremely common problem.',
  ],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'What happens when you write "3" + 4 in Python?',
      options: [
        'Python returns 7 — it automatically converts "3" to the integer 3 before adding',
        'Python raises a TypeError — you cannot add a string to an integer without explicit conversion; "3" + 4 is not the same as 3 + 4',
        'Python returns "34" — when one operand is a string, the other is also converted to a string',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'In Python, what does 7 / 2 evaluate to, and what does 7 // 2 evaluate to?',
      options: [
        '7 / 2 = 3 (integer division) and 7 // 2 = 3.5 (float division)',
        '7 / 2 = 3.5 (always float in Python 3) and 7 // 2 = 3 (floor division, truncates down)',
        '7 / 2 = 3 and 7 // 2 = 3 — both perform integer division in Python',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'A dataset column contains values like "42", "17", "8". Before computing the average, what must you do?',
      options: [
        'Sort the values — averaging requires sorted input in Python',
        'Convert the strings to numbers — "42" + "17" = "4217" (concatenation), not 59. Use int() or float() to convert before any arithmetic',
        'Nothing — Python\'s sum() function handles strings by converting them automatically',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'type(True) in Python returns what?',
      options: [
        'int — True is just an alias for 1 in Python',
        'bool — Python has a dedicated boolean type; bool is a subclass of int so True == 1, but type(True) is bool, not int',
        'str — True and False are strings representing boolean values',
      ],
      correct: 1,
    },
  ],
}
