// Guttag — Lesson 17: Debugging
// Auto-converted from src/docs/tutorials/guttag-python/lesson-17.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-17-debugging',
  slug: 'debugging',
  chapter: 3,
  order: 3,
  title: 'Debugging',
  subtitle: 'Systematic Fault Finding',
  tags: ['syntaxerror', 'zerodivisionerror', 'traceback', 'pdb', 'float-inf', 'none'],

  hook: {
    question: 'What is "Debugging", and why does it matter?',
    realWorldContext: 'You will build a systematic mental framework and toolset for identifying, isolating, and fixing bugs in your programs. A bug always has a CAUSE and a SYMPTOM. The traceback shows the symptom, not always the cause. Reading tracebacks bottom-to-top finds the cause. Print-debugging is the fastest tool for simple bugs, while the `pdb` debugger is for complex ones. Bisection debugging — narrowing the bug\'s location by eliminating half the code at a time — is a universal strategy that works on any program.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 7 core ideas: Three Kinds of Errors, Reading a Traceback, Print-Debugging, breakpoint() and pdb, Bisection Debugging, Scientific Debugging, Common Bugs and How to Catch Them.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **SyntaxError:** an error that occurs when Python parses the code, before execution even begins. It exists to stop the program from running at all if the code violates the language rules.\n- **ZeroDivisionError:** a runtime error that occurs when dividing a number by zero. It exists to prevent undefined mathematical operations from producing silent garbage values.\n- **Traceback:** a report of the call stack at the point an exception was raised. It exists to show you exactly which function calls led to the crash, helping trace the execution path backward.\n- **pdb:** the Python Debugger module. It exists to let developers pause execution, step through code line by line, and inspect variables interactively, rather than guessing what happened.\n- **float(\'-inf\'):** a special floating-point representation of negative infinity. It exists to provide a starting comparison value guaranteed to be smaller than any real number.\n- **None:** the null object in Python. It exists to represent the absence of a value or a state where a variable hasn\'t been assigned anything meaningful yet.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **print:** A built-in function that outputs data to the standard output stream.\n- **breakpoint:** A built-in function that drops the program into the interactive debugger (pdb).\n- **enumerate:** A built-in function that adds a counter to an iterable.\n- **type:** A built-in function that returns the type of an object.\n- **id:** A built-in function that returns the unique identity of an object.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'We\'ve explored tracebacks to find the crash source, print-debugging to reveal hidden states, `pdb` for interactive exploration, bisection to narrow search spaces, and the scientific method for isolating root causes. Let\'s connect the pieces: a bug in a massive file throws a **ZeroDivisionError** (Runtime error). We read the **Traceback** bottom-to-top to find the crashed function. We use **Bisection Debugging** to find exactly where the bad `0` entered the system. We formulate a hypothesis that the user passed a `None` which converted to `0`, test it with **type()** via **print-debugging**, and finally fix the issue. Next lesson: Lesson 18 covers files — reading and writing data from disk.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 17: Debugging',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Debugging',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Three Kinds of Errors',
              prose: [
                'Programs fail. When writing software, things go wrong in different ways: sometimes a program won\'t even start, sometimes it crashes halfway through, and sometimes it finishes but gives you a completely wrong answer. Given what you already know about how Python executes code, what happens if you forget a closing parenthesis? What happens if you try to divide by zero? Pause and try predicting the exact error messages before reading further.',
                'Running this code produces: ``` Caught: ZeroDivisionError Average of [1, 2, 3]: 3.0 ``` This lab demonstrates **Syntax, Runtime, and Semantic Errors**. The output proves that runtime errors crash explicitly (`ZeroDivisionError`), while semantic errors silently return the wrong value (`3.0` instead of `2.0`). Syntax errors prevent execution entirely.'
              ],
              typeIt: true,
              solution: '# Lab: Three errors\n# 1. Syntax Error (Uncomment to see)\n# def bad_function(\n#    print(\'hello\')\n\n# 2. Runtime Error\ndef runtime_error():\n    return 1 / 0\n    \n# 3. Semantic Error\ndef average(lst):\n    return sum(lst) / len(lst) + 1  # BUG\n\ntry:\n    runtime_error()\nexcept Exception as e:\n    print(f"Caught: {type(e).__name__}")\n    \nprint(f"Average of [1, 2, 3]: {average([1, 2, 3])}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Three Kinds of Errors — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def calculate_average(numbers):` defines a new function. `def` is a keyword creating a function object.\n- `total = sum(numbers)` calls the built-in `sum` function to add up the elements.\n- `count = len(numbers)` calls the built-in `len` function to find the number of elements.\n- `return total / count + 1` performs division and addition. The `+ 1` introduces a semantic bug, meaning the function runs smoothly but produces incorrect mathematics.',
                '**Expected behavior.** ```python print(calculate_average([10, 20, 30])) ``` Output: ``` 21.0 ```',
                '**CS lens.** Also recognized in: compiler theory (lexical vs syntactic vs semantic analysis), database query planning, communication protocols (malformed packets vs logical state errors).',
                '**SE lens.** The principle here is **Fail Fast**. Syntax errors and runtime errors fail fast—they scream immediately. Semantic errors do not fail fast; they corrupt data silently. The engineering cost of a semantic bug is vastly higher because it might persist for months before being noticed, which is why testing exists.'
              ],
              typeIt: true,
              solution: 'def calculate_average(numbers):\n    total = sum(numbers)\n    count = len(numbers)\n    return total / count + 1',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Reading a Traceback',
              prose: [
                'When a program crashes deeply inside a sequence of function calls, the final error message (like `ZeroDivisionError`) tells you *what* happened, but not *how* the program got there. How can you figure out the exact path execution took? Look at a crash message. What information would you need to retrace the steps from the start of the program to the line that crashed?',
                'Running this prints: ``` Traceback (most recent call last): File "lab.py", line 10, in <module> a_lab(1) File "lab.py", line 8, in a_lab return b_lab(x - 1) File "lab.py", line 5, in b_lab return c_lab(x - 1) File "lab.py", line 2, in c_lab return 1 / x ZeroDivisionError: division by zero ``` This demonstrates a **Traceback**. The output proves that the crash happened in `c_lab` at line 2, but the root cause (passing `1`) started all the way up at line 10. By reading from bottom to top, we can follow the exact flow of data.'
              ],
              typeIt: true,
              solution: 'def c_lab(x):\n    return 1 / x\n\ndef b_lab(x):\n    return c_lab(x - 1)\n\ndef a_lab(x):\n    return b_lab(x - 1)\n\na_lab(1)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Reading a Traceback — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def divide_by(x):` defines a function.\n- `return 100 / x` performs division. If `x` is `0`, it raises a `ZeroDivisionError`.\n- `def process_data(value):` takes a value.\n- `return divide_by(value - 5)` calls `divide_by`.\n- `def run_pipeline():` starts the chain.\n- `process_data(5)` passes `5`. `5 - 5` becomes `0`, crashing `divide_by`.',
                '**Expected behavior.** ```python run_pipeline() ``` Output: ``` Traceback (most recent call last): File "math_utils.py", line 14, in <module> run_pipeline() File "math_utils.py", line 12, in run_pipeline process_data(5) File "math_utils.py", line 9, in process_data return divide_by(value - 5) File "math_utils.py", line 6, in divide_by return 100 / x ZeroDivisionError: division by zero ```',
                '**CS lens.** Also recognized in: Call stacks in operating systems, execution contexts in JavaScript, stack unwinding in C++ exceptions.',
                '**SE lens.** The principle is **Observability**. A system must record how it arrived at a failure state. The alternative is crashing silently, which requires guessing. The cost of generating a traceback is minimal compared to the hours saved during incident response.'
              ],
              typeIt: true,
              solution: 'def divide_by(x):\n    return 100 / x\n\ndef process_data(value):\n    return divide_by(value - 5)\n\ndef run_pipeline():\n    process_data(5)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Print-Debugging',
              prose: [
                'If a function returns the wrong value, a traceback won\'t help you because the code never crashed. You need to see what the variables are actually holding at different moments in time. If you have a loop that is mysteriously skipping elements, where is the most logical place to look at the data?',
                'Output: ``` DEBUG: i=0, x=-3, best=0 DEBUG: i=1, x=-1, best=0 DEBUG: i=2, x=-5, best=0 ``` This demonstrates **Print-Debugging**. The output proves that `best` starts at `0` and never updates because none of the negative numbers are greater than `0`. By using **print**, we exposed the silent logical state.'
              ],
              typeIt: true,
              solution: 'def find_max_lab(lst):\n    best = 0 \n    for i, x in enumerate(lst):\n        print(f\'DEBUG: i={i}, x={x}, best={best}\')\n        if x > best:\n            best = x\n    return best\n\nfind_max_lab([-3, -1, -5])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Print-Debugging — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `best = 0` initializes the variable to `0`.\n- `for i, x in enumerate(lst):` loops over the list. **enumerate** is a built-in function that yields both the index `i` and the value `x` simultaneously, crucial for detailed debugging.\n- `print(f\'DEBUG: i={i}, x={x}, best={best}\')` calls the built-in **print** function. **print** converts the formatted string into terminal output, revealing the internal state.\n- `if x > best:` evaluates the condition. Since all `x` values are negative, this is always false against `0`.',
                '**Expected behavior.** ```python result = find_max([-10, -20, -5]) print(f"Final: {result}") ``` Output: ``` DEBUG: i=0, x=-10, best=0 DEBUG: i=1, x=-20, best=0 DEBUG: i=2, x=-5, best=0 Final: 0 ```',
                '**CS lens.** Also recognized in: System logging, audit trails, printf-debugging in C.',
                '**SE lens.** The principle is **State Transparency**. We are taking invisible memory states and making them visible on the console. The alternative is using a heavy debugger, which can be overkill for simple logic checks. The trade-off is that `print` statements must be manually cleaned up before production.'
              ],
              typeIt: true,
              solution: 'def find_max(lst):\n    best = 0\n    for i, x in enumerate(lst):\n        print(f\'DEBUG: i={i}, x={x}, best={best}\')\n        if x > best:\n            best = x\n    return best',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'breakpoint() and pdb',
              prose: [
                'Sometimes printing isn\'t enough. If you have 10,000 items and the bug happens on item 8,900, printing everything will flood your terminal. You need to pause the program exactly when things get weird and explore the data manually. What would you do if you could freeze a running program right in the middle of a loop?',
                'This demonstrates the **pdb interactive debugger**. The `breakpoint()` function halts execution and hands control over to the terminal, where you can type `p item` to inspect values, `n` to step to the next line, or `c` to continue.'
              ],
              typeIt: true,
              solution: 'def compute_lab(data):\n    total = 0\n    for item in data:\n        # We will not actually pause in this non-interactive test, \n        # but this is exactly how you trigger pdb.\n        breakpoint() \n        total += item\n    return total',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'breakpoint() and pdb — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `for item in data:` begins a loop over the elements.\n- `breakpoint()` calls the built-in **breakpoint** function. This function pauses the program\'s execution entirely and invokes the `pdb` module. It hijacks the terminal, presenting an interactive `(Pdb)` prompt.\n- `total += item` adds the item to the total, but only after the developer types `c` (continue) or `n` (next) in the interactive prompt.',
                '**Expected behavior.** *(Stated from confidence, not executed interactively since this environment is non-interactive)* When you run `compute([10, 20])`, the terminal pauses and shows: ``` -> total += item (Pdb) p item 10 (Pdb) c -> total += item (Pdb) ```',
                '**CS lens.** Also recognized in: GDB in C/C++, hardware breakpoints in CPU architecture, browser DevTools debuggers.',
                '**SE lens.** The principle is **Interactive Introspection**. Being able to poke at live memory saves you from having to guess what state caused the crash. The trade-off is speed; interactive debugging is a manual, human-time process, unlike automated tests.'
              ],
              typeIt: true,
              solution: 'def compute(data):\n    total = 0\n    for item in data:\n        breakpoint()\n        total += item\n    return total',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Bisection Debugging',
              prose: [
                'If you have a 1,000-line script that produces the wrong output, reading all 1,000 lines top-to-bottom is incredibly slow. How can you find the exact line causing the problem faster? Think about how you look up a word in a physical dictionary. Do you read from page 1, or do you open it to the middle?',
                'Output: ``` MIDPOINT: x is 20 ``` This demonstrates **Bisection Debugging**. By printing at the midpoint, the output proves the bug (returning `-5`) happens *after* the midpoint, meaning we can completely ignore the first 50 lines of code.'
              ],
              typeIt: true,
              solution: 'def massive_process():\n    x = 10\n    # ... 50 lines of code ...\n    x = 20\n    print(f"MIDPOINT: x is {x}") # The bisection print\n    # ... 50 lines of code ...\n    x = -5 # BUG!\n    return x\n\nmassive_process()',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Bisection Debugging — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `val = val * 2` and `val = val + 10` execute the first half of the logic.\n- `print(f"MIDPOINT DEBUG: val={val}")` calls the built-in **print** function. We check the value here. If the value is correct at this point, the bug *must* be in the second half.\n- `val = val - 50` and `val = val / 2` execute the second half.',
                '**Expected behavior.** ```python result = process_data_long(10) print(f"FINAL: {result}") ``` Output: ``` MIDPOINT DEBUG: val=30 FINAL: -10.0 ```',
                '**CS lens.** Also recognized in: Binary search algorithms, Git bisect, decision trees.',
                '**SE lens.** The principle is **Logarithmic Search**. Bisection debugging is $O(\\log N)$. If a file has 1,000 lines, you can find the exact bug in just 10 midpoint checks. The alternative is linear search $O(N)$, reading line-by-line, which scales terribly.'
              ],
              typeIt: true,
              solution: 'def process_data_long(val):\n    val = val * 2\n    val = val + 10\n    print(f"MIDPOINT DEBUG: val={val}")\n    val = val - 50\n    val = val / 2\n    return val',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 11,
              cellTitle: 'Scientific Debugging',
              prose: [
                'You found the line that breaks. Now you have to fix it. Guessing and randomly changing `+` to `-` until the code works is dangerous. How do you systematically figure out what went wrong? If a machine stops working, an engineer doesn\'t just kick it; they form a hypothesis. How can you test a hypothesis in code?',
                'Output: ``` Hypothesis confirmed: Found None! ``` This demonstrates **Scientific Debugging**. The output proves our hypothesis was true without changing the fundamental logic of the program.'
              ],
              typeIt: true,
              solution: '# Symptom: This fails when passing a list with None in it.\n# Hypothesis: None is being compared with an integer.\n# Test: Print the types.\n\ndef find_smallest_lab(lst):\n    for x in lst:\n        # Test the hypothesis\n        if x is None:\n            print("Hypothesis confirmed: Found None!")\n            continue\n\nfind_smallest_lab([5, 3, None, 1])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 12,
              cellTitle: 'Scientific Debugging — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `minimum = float(\'inf\')` sets the starting value.\n- `for x in lst:` loops through items.\n- `print(f"DEBUG: Checking {x}, type: {type(x)}")` uses the built-in **print** function to output the value, and the built-in **type** function. **type** returns the exact class of the object in memory, testing our hypothesis about what data we are actually receiving.',
                '**Expected behavior.** ```python try: get_minimum([10, 5, None, 3]) except Exception as e: print(f"Crashed with: {type(e).__name__}") ``` Output: ``` DEBUG: Checking 10, type: <class \'int\'> DEBUG: Checking 5, type: <class \'int\'> DEBUG: Checking None, type: <class \'NoneType\'> Crashed with: TypeError ```',
                '**CS lens.** Also recognized in: Scientific method, root cause analysis, A/B testing.',
                '**SE lens.** The principle is **Falsifiability**. Every debug print or test should be designed to definitively prove a hypothesis true or false. Guess-and-check programming creates fragile systems because you might "fix" the bug by introducing another one.'
              ],
              typeIt: true,
              solution: 'def get_minimum(lst):\n    minimum = float(\'inf\')\n    for x in lst:\n        print(f"DEBUG: Checking {x}, type: {type(x)}")\n        if x < minimum:\n            minimum = x\n    return minimum',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 13,
              cellTitle: 'Common Bugs and How to Catch Them',
              prose: [
                'Many bugs aren\'t unique snowflakes; they are the exact same logical mistakes repeated by every programmer on earth. What happens if a loop processes 9 items instead of 10? What happens if two variables secretly point to the same list?',
                'Output: ``` list_a id: 1403212456, content: [1, 2, 3, 4] list_b id: 1403212456, content: [1, 2, 3, 4] ``` *(Memory IDs will vary, but they will be identical)* This demonstrates **Aliasing**. The output proves that modifying `list_b` also modified `list_a` because they share the same memory location, revealed by the `id()` function.'
              ],
              typeIt: true,
              solution: 'def alias_lab():\n    list_a = [1, 2, 3]\n    list_b = list_a  # Aliasing bug\n    list_b.append(4)\n    print(f"list_a id: {id(list_a)}, content: {list_a}")\n    print(f"list_b id: {id(list_b)}, content: {list_b}")\n\nalias_lab()',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 14,
              cellTitle: 'Common Bugs and How to Catch Them — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `print(f"DEBUG ID: {id(lst)}")` uses the built-in **id** function. **id** returns the unique memory address of the object, which helps us track if this list is shared elsewhere. **print** displays it.\n- `for item in lst:` iterates through the list.\n- `lst.remove(item)` modifies the list *while* the loop is running over it, causing the loop\'s internal index to skip the next item entirely.',
                '**Expected behavior.** ```python my_data = [1, -1, -2, 3] print(clean_list(my_data)) ``` Output: ``` DEBUG ID: 1234567890 [1, -2, 3] ``` *(Notice how `-2` was skipped because removing `-1` shifted `-2` into the position the loop had already processed).*',
                '**CS lens.** Also recognized in: Concurrent modification exceptions in Java, data races in multithreading, memory aliasing in C.',
                '**SE lens.** The principle is **Immutability by Default**. Modifying a data structure while iterating over it breaks the iterator\'s implicit contract. The solution is always to iterate over a copy or build a new list from scratch.'
              ],
              typeIt: true,
              solution: 'def clean_list(lst):\n    print(f"DEBUG ID: {id(lst)}")\n    for item in lst:\n        if item < 0:\n            lst.remove(item)\n    return lst',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: { prose: [], callouts: [], visualizations: [] },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If a cell\'s behavior surprises you, isolate the one line that surprised you in its own cell and experiment with small variations.',
      'Read the reference code above the editor line by line and predict what it does before you type it in — that catches most mistakes before you even run anything.',
    ],
    futureLinks: [
      'Next lesson: Files.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Traceback"?',
      options: [
        'a report of the call stack at the point an exception was raised. It exists to show you exactly which function calls led to the crash, helping trace the execution path backward.',
        'an error that occurs when Python parses the code, before execution even begins. It exists to stop the program from running at all if the code violates the language rules.',
        'the Python Debugger module. It exists to let developers pause execution, step through code line by line, and inspect variables interactively, rather than guessing what happened.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "float(\'-inf\')"?',
      options: [
        'a special floating-point representation of negative infinity. It exists to provide a starting comparison value guaranteed to be smaller than any real number.',
        'a report of the call stack at the point an exception was raised. It exists to show you exactly which function calls led to the crash, helping trace the execution path backward.',
        'an error that occurs when Python parses the code, before execution even begins. It exists to stop the program from running at all if the code violates the language rules.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "SyntaxError"?',
      options: [
        'an error that occurs when Python parses the code, before execution even begins. It exists to stop the program from running at all if the code violates the language rules.',
        'the null object in Python. It exists to represent the absence of a value or a state where a variable hasn\'t been assigned anything meaningful yet.',
        'a special floating-point representation of negative infinity. It exists to provide a starting comparison value guaranteed to be smaller than any real number.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "ZeroDivisionError"?',
      options: [
        'a special floating-point representation of negative infinity. It exists to provide a starting comparison value guaranteed to be smaller than any real number.',
        'the Python Debugger module. It exists to let developers pause execution, step through code line by line, and inspect variables interactively, rather than guessing what happened.',
        'a runtime error that occurs when dividing a number by zero. It exists to prevent undefined mathematical operations from producing silent garbage values.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**SyntaxError** — an error that occurs when Python parses the code, before execution even begins. It exists to stop the program from running at all if the code violates the language rules.',
    '**ZeroDivisionError** — a runtime error that occurs when dividing a number by zero. It exists to prevent undefined mathematical operations from producing silent garbage values.',
    '**Traceback** — a report of the call stack at the point an exception was raised. It exists to show you exactly which function calls led to the crash, helping trace the execution path backward.',
    '**pdb** — the Python Debugger module. It exists to let developers pause execution, step through code line by line, and inspect variables interactively, rather than guessing what happened.',
    '**float(\'-inf\')** — a special floating-point representation of negative infinity. It exists to provide a starting comparison value guaranteed to be smaller than any real number.',
    '**None** — the null object in Python. It exists to represent the absence of a value or a state where a variable hasn\'t been assigned anything meaningful yet.',
  ],

  checkpoints: ['read-intuition'],
}
