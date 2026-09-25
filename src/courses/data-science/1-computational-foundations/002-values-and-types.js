import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

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
      'The same operator (+) does different things depending on the type of the values it operates on. ' +
      'Type is not decoration — it decides which operations are allowed and what they mean. A column of ' +
      'numbers that was loaded as text is one of the most common reasons an analysis silently goes wrong.',
  },

  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Say what type a value has, predict what an operation does with it, convert between types deliberately, and choose a sensible type for a piece of data.',
        '**The smallest example.** Here is the same quantity — three — written three ways: `3`, `3.0` and `"3"`. To a person they mean the same thing. To Python they are three different **values** of three different **types**, and the same operation treats them differently.',
        '| Written as | Type | `x * 2` | `x + 1` |\n|---|---|---|---|\n| `3` | `int` (whole number) | `6` | `4` |\n| `3.0` | `float` (decimal number) | `6.0` | `4.0` |\n| `"3"` | `str` (text) | `"33"` | TypeError |',
        'For text, `*` means "repeat" and `+` means "join". Joining text to a number is not defined, so Python raises a **TypeError** instead of guessing whether you meant 4 or "31".',
      ),
      check(
        'What is `"3" * 2`?',
        ['6', '"33"', '6.0', 'TypeError'],
        1,
        'Multiplying text by a whole number repeats the text. The quotes tell Python that "3" is text, so no arithmetic happens.',
      ),
      notebook('Types in action', [
        demo(1, 'Stage 1 — Revealing the types', [
          '`type()` is a built-in function that reports the type of any value. Python writes `<class \'int\'>`; here "class" just means "type".',
        ], 'Predict each result, then run. Add a line print(type(3 > 2)) and predict it too.', 'print(type(3))\nprint(type(3.0))\nprint(type("3"))\nprint(type(True))', { expectOutput: ["<class 'int'>", "<class 'float'>", "<class 'str'>", "<class 'bool'>"] }),
        demo(2, 'Stage 2 — Same operator, different meaning', [
          'Each line applies the same operator to the same quantity written as a different type. Compare the results with the table above.',
        ], 'Run the cell and check each line against the table. Then try print("3" + "4") and explain the result.', 'print(3 * 2, 3.0 * 2, "3" * 2)\nprint(3 + 1, 3.0 + 1)', { expectOutput: ['6 6.0 33', '4 4.0'] }),
        demo(3, 'Stage 3 — Text plus a number', [
          'This is the one case in the table that fails. Python refuses to add text and a number because the intention is ambiguous.',
        ], 'Run the cell and read the last line of the error. Then fix it two different ways: make the result the number 4, then make it the text "31".', 'print("3" + 1)', { expectError: 'TypeError' }),
      ]),
      prose(
        '**Four core types.** Python has many built-in types. These four are the ones you will use first; later lessons add lists, dictionaries, `None` and more.',
        '| Type | Holds | Examples |\n|---|---|---|\n| `int` | whole numbers of any size | `3`, `-10`, `1000000` |\n| `float` | decimal numbers, stored approximately | `3.14`, `-0.001`, `1.0` |\n| `str` | text | `"hello"`, `"42"`, `""` |\n| `bool` | truth values | `True`, `False` |',
        'Every value has exactly one **exact type**, which `type()` reports. When you combine an `int` with a `float`, Python converts the int to a float first, so `3 + 4.0` is `7.0`. It never converts between numbers and text automatically.',
        '**Converting on purpose.** You can ask for a conversion with `int()`, `float()`, `str()` and `bool()`. Each has rules worth knowing precisely:',
        '| Conversion | Result | Why |\n|---|---|---|\n| `int("3")` | `3` | the text is a whole number |\n| `float("3.9")` | `3.9` | the text is a decimal number |\n| `int(3.9)` | `3` | int() drops the decimal part — it does not round |\n| `int(-3.9)` | `-3` | it drops toward zero, not down |\n| `int("3.9")` | ValueError | the text is not a whole number, so int() refuses |\n| `str(3)` | `"3"` | any value can become text |\n| `bool(0)`, `bool("")` | `False` | zero and empty text count as false |\n| `bool("0")` | `True` | non-empty text is true — even the text "0" |',
      ),
      check(
        'What does `int("3.9")` do?',
        ['Returns 3', 'Returns 4', 'Raises ValueError'],
        2,
        '`int()` accepts text only if the text is a whole number. Convert in two steps instead: `int(float("3.9"))` gives 3.',
      ),
      notebook('Converting between types', [
        demo(4, 'Stage 4 — Automatic promotion', [
          'Mixing int and float in arithmetic gives a float. The decimal point in the output is Python\'s signal that the result is a float.',
        ], 'Run the cell. Then predict type(10 / 2) and check it.', 'print(3 + 4, type(3 + 4))\nprint(3 + 4.0, type(3 + 4.0))', { expectOutput: ["7 <class 'int'>", "7.0 <class 'float'>"] }),
        demo(5, 'Stage 5 — Explicit conversion', [
          'Each line checks one row of the conversion table.',
        ], 'Predict every line before running. Then add print(int(float("3.9"))) and explain why it works when int("3.9") does not.', 'print(int("3"), float("3.9"))\nprint(int(3.9), int(-3.9))\nprint(str(3) + "1")\nprint(bool(0), bool(""), bool("0"))', { expectOutput: ['3 3.9', '3 -3', '31', 'False False True'] }),
        demo(6, 'Stage 6 — A conversion that fails', [
          '`int()` refuses text that is not a whole number and raises ValueError. A ValueError means the type was acceptable (text) but this particular value was not.',
        ], 'Run the cell and read the error. Then fix it by converting in two steps.', 'print(int("3.9"))', { expectError: 'ValueError' }),
      ]),
      prose(
        '**Two questions about a bool.** `True` and `False` behave like 1 and 0 in arithmetic, because `bool` is a special kind of `int` (a *subclass*). So there are two different questions you can ask: "what is its exact type?" — `type(True)` is `bool` — and "can it be used as an int?" — `isinstance(True, int)` is also True. That matters later: a check such as `isinstance(x, int)` accepts True and False too.',
      ),
      notebook('Booleans', [
        demo(7, 'Stage 7 — Boolean values', [
          'Comparisons produce bools. Because a bool can be used as an int, you can count True values by adding them.',
        ], 'Predict each line before running. Lesson A.09 uses booleans heavily.', 'print(type(True))\nprint(isinstance(True, int), type(True) == int)\nprint(True + True, True * 5)\nprint(sum([3 > 2, 5 > 9, 1 < 4]))   # how many comparisons are True?', { expectOutput: ["<class 'bool'>", 'True False', '2 5', '2'] }),
      ]),
      prose(
        '**Choosing a type for data.** A type should match what you intend to do with the value, not just what it looks like.',
        '- Counts (items sold, people) → `int`.\n- Measurements and prices → `float`, remembering floats are stored approximately: `0.1 + 0.2` is `0.30000000000000004`.\n- Labels that happen to contain digits — postcodes, phone numbers, IDs → `str`. You never do arithmetic on them, and converting the postcode `"02134"` to an int silently drops the leading zero.\n- Yes/no facts → `bool`.',
      ),
      notebook('Choosing types for real data', [
        demo(8, 'Stage 8 — Labels that look like numbers', [
          'Postcodes contain digits but are labels. Converting one to an int changes it.',
        ], 'Run. Explain why "02134" and 2134 would not match in a lookup. Then compare 0.1 + 0.2 with 0.3 using round(0.1 + 0.2, 10) == 0.3.', 'postcode = "02134"\nprint(int(postcode))          # the leading zero is gone\nprint(str(int(postcode)) == postcode)\nprint(0.1 + 0.2)', { expectOutput: ['2134', 'False', '0.30000000000000004'] }),
        demo(9, 'Stage 9 — Numbers loaded as text', [
          'Data loaded from a file often arrives as text. These prices look like numbers, but `sum()` cannot add text. The fix is to convert each one first.',
        ], 'Run. Then remove the float(...) around p and run again: read the TypeError.', 'prices = ["10.99", "5.50", "3.25"]  # looks like numbers\nprint(type(prices[0]))              # but each one is text\nfloat_prices = [float(p) for p in prices]\nprint(round(sum(float_prices), 2))', { expectOutput: ["<class 'str'>", '19.74'] }),
      ]),
      prose(
        '**Practice.** Challenge 1 rehearses conversions. Challenge 2 is the data-import problem. Challenge 3 is new: decide the right type for each column before you compute.',
      ),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Type surgery', 'easy', {
          prompt: 'Starting from raw = "365", create as_int (the whole number), as_float (the decimal number) and as_text_again (as_int turned back into text). Use conversion functions, not typed values.',
          instructions: '1. Convert raw with int() and float().\n2. Convert as_int back with str().\n3. Run to check.',
          code: 'raw = "365"\nas_int = None\nas_float = None\nas_text_again = None',
          testCode: `assert type(as_int) is int, f"as_int should be an int, got {type(as_int).__name__}"
assert type(as_float) is float, f"as_float should be a float, got {type(as_float).__name__}. int() gives a whole number; use float()"
assert type(as_text_again) is str, "as_text_again should be text: use str()"
assert (as_int, as_float, as_text_again) == (365, 365.0, "365"), "Check the values: 365, 365.0 and '365'"
"SUCCESS: int, float and str conversions are all correct."`,
          hint: 'as_int = int(raw); as_float = float(raw); as_text_again = str(as_int)',
          solution: 'raw = "365"\nas_int = int(raw)\nas_float = float(raw)\nas_text_again = str(as_int)',
          misconceptions: [{ code: 'raw = "365"\nas_int = int(raw)\nas_float = int(raw)\nas_text_again = str(as_int)', feedback: 'as_float should be a float' }],
        }),
        exercise(12, 2, 'Challenge 2 — The data import problem', 'medium', {
          prompt: 'The list data holds prices as text with a currency sign in front. Compute total and average as floats.',
          instructions: '1. Remove the sign from each string with `s.replace("$", "")`.\n2. Convert each result to float.\n3. Compute total with sum() and average by dividing by the number of prices.',
          code: 'data = ["$12.50", "$8.99", "$24.00", "$5.75", "$15.30"]\ntotal = None\naverage = None',
          testCode: `assert isinstance(total, float), "total should be a float; convert each price before adding"
assert abs(total - 66.54) < 1e-9, f"total should be 66.54, got {total}"
assert abs(average - 13.308) < 1e-9, f"average should be 13.308, got {average}. Divide by the number of prices, len(data)"
"SUCCESS: total = 66.54 and average = 13.308."`,
          hint: 'cleaned = [float(s.replace("$", "")) for s in data]; total = sum(cleaned); average = total / len(cleaned)',
          solution: 'data = ["$12.50", "$8.99", "$24.00", "$5.75", "$15.30"]\ncleaned = [float(s.replace("$", "")) for s in data]\ntotal = sum(cleaned)\naverage = total / len(cleaned)',
          misconceptions: [{ code: 'data = ["$12.50", "$8.99"]\ncleaned = [float(s) for s in data]', feedback: 'could not convert string to float' }],
        }),
        exercise(13, 3, 'Challenge 3 — Choose the right types', 'medium', {
          prompt: 'Each record has a postcode and a count of parcels, both loaded as text. Keep the postcodes as labels, and compute total_parcels as a whole number.',
          prose: ['The starter code makes two type mistakes. One of them crashes; the other silently damages the data. Fix both.'],
          instructions: 'Run the starter and read the error. Fix it. Then check the postcodes: are they still exactly the labels in raw_postcodes?',
          code: 'raw_postcodes = ["02134", "10001", "00501"]\nraw_counts = ["3", "12", "7"]\n\npostcodes = [int(p) for p in raw_postcodes]\ntotal_parcels = sum(raw_counts)\nprint(postcodes, total_parcels)',
          testCode: `assert postcodes == ["02134", "10001", "00501"], "Postcodes are labels: converting them to int drops leading zeros. Keep them as text"
assert type(total_parcels) is int, "total_parcels should be a whole number (int): convert each count with int()"
assert total_parcels == 22, f"total_parcels should be 22, got {total_parcels}"
"SUCCESS: postcodes stay text, counts become ints, and the total is 22."`,
          hint: 'postcodes can simply be raw_postcodes (or list(raw_postcodes)). For the counts: sum(int(c) for c in raw_counts).',
          solution: 'raw_postcodes = ["02134", "10001", "00501"]\nraw_counts = ["3", "12", "7"]\npostcodes = list(raw_postcodes)\ntotal_parcels = sum(int(c) for c in raw_counts)\nprint(postcodes, total_parcels)',
          misconceptions: [
            { code: 'postcodes = [int(p) for p in ["02134"]]\ntotal_parcels = 22', feedback: 'converting them to int drops leading zeros' },
            { code: 'postcodes = ["02134", "10001", "00501"]\ntotal_parcels = sum(float(c) for c in ["3", "12", "7"])', feedback: 'should be a whole number (int)' },
          ],
        }),
      ]),
    ],
  },

  mentalModel: [
    'Every value has one exact type (type(x)). The four core types to start with are int, float, str and bool; Python has many more.',
    'The type decides which operations are valid and what they mean: "3" * 2 repeats text; 3 * 2 multiplies.',
    'int + float → float (automatic). str + int → TypeError (never automatic).',
    'Convert on purpose: int() drops decimals toward zero and refuses decimal text; bool("0") is True.',
    'Choose types by intended use: counts int, measurements float, labels with digits str.',
    'isinstance(x, T) asks whether x can be used as a T — isinstance(True, int) is True because bool is a subclass of int.',
  ],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'What happens when you write "3" + 4 in Python?',
      options: [
        'Python returns 7 — it converts "3" to the integer 3 before adding',
        'Python raises a TypeError — you cannot add text to a number without converting one of them',
        'Python returns "34" — the number is converted to text automatically',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'What is int(-2.7)?',
      options: ['-3, because int() rounds down', '-2, because int() drops the decimal part toward zero', '-3, because int() rounds to the nearest whole number'],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'A column contains customer IDs such as "000417". Which type should you keep them as?',
      options: [
        'int, because they contain only digits',
        'str, because they are labels: you never do arithmetic on them and int would drop the leading zeros',
        'float, to be safe',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'type(True) in Python returns what?',
      options: [
        'int — True is just an alias for 1',
        'bool — bool is a subclass of int, so True behaves like 1, but its exact type is bool',
        'str — True and False are strings',
      ],
      correct: 1,
    },
  ],
}
