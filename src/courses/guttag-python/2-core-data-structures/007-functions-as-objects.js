// Guttag — Lesson 12: Functions as Objects
// Auto-converted from src/docs/tutorials/guttag-python/lesson-12.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-12-functions-as-objects',
  slug: 'functions-as-objects',
  chapter: 2,
  order: 7,
  title: 'Functions as Objects',
  subtitle: 'lambda, map, filter, sorted',
  tags: ['def', 'return', 'is', 'lambda', 'key', 'reverse'],

  hook: {
    question: 'What is "Functions as Objects", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 8 core ideas: Functions are Objects, Functions as arguments, lambda, sorted(), map(), filter(), Functions as return values, functools.reduce().',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **def:** keyword that creates a named function object and binds it to a variable in the current scope. Solves the problem of defining reusable logic.\n- **return:** exits a function, passing a computed value back to the caller. Solves the problem of retrieving results from function bodies.\n- **is:** identity operator. Checks if two variables refer to the exact same object in memory. Solves the problem of verifying object identity versus structural equality.\n- **lambda:** keyword for anonymous functions. Evaluates to a function object without assigning a name. Solves the problem of defining short, single-expression functions inline.\n- **key:** parameter for sort criteria. Accepts a function to extract a comparison key from each element. Solves the problem of sorting data by arbitrary attributes.\n- **reverse:** parameter for descending sort. Reverses the resulting order. Solves the problem of needing largest-first sorting without negating keys.\n- **None:** singleton representing the absence of a value. Solves the problem of needing a null literal.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **type:** Built-in function to query the runtime type of an object.\n- **abs:** Built-in absolute value function.\n- **len:** Built-in length function.\n- **print:** Built-in output function.\n- **sorted:** Built-in function that returns a new sorted list from an iterable.\n- **map:** Built-in function to apply a function to every item of an iterable.\n- **list:** Built-in mutable sequence type.\n- **range:** Built-in sequence type for numbers.\n- **str:** Built-in text sequence type.\n- **filter:** Built-in function to construct an iterator from elements for which a function returns true.\n- **functools.reduce:** Function to fold a sequence down to a single value.\n- **max:** Built-in function to find the largest item.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Functions as first-class objects enable the functional style. We proved a function could be assigned to a variable, we passed it into `apply_twice`, we created anonymous ones with `lambda` for `sorted` and `map` and `filter`, returned them as closures in `make_adder`, and finally accumulated with them via `functools.reduce`. Lesson 13 introduces recursion — the technique of a function calling itself. Exercises: write `compose(f, g)` that returns a new function that applies g then f; sort the people list by last name (split the name and sort by the last word); write `my_map(f, lst)` and `my_filter(pred, lst)` from scratch using loops.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 12: Functions as Objects',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Functions as Objects',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Functions are Objects',
              prose: [
                'How can we treat a piece of logic as a piece of data? If we define a function to square a number, what happens if we assign that function to a variable, or put it in a list? What would you try here first? Pause and sketch what you think `type(square)` would print.',
                'This proves we can assign a function to a new variable and call it via that new variable. This is called treating functions as **first-class objects**.'
              ],
              typeIt: true,
              solution: '# Lab 1\n>>> def lab_func(): return 1\n...\n>>> x = lab_func\n>>> x()\n1',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Functions are Objects — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def square(x):` defines a new function object and binds it to the name `square`.\n- `f = square` assigns the exact same function object to a new variable `f`. Note there are no parentheses `()`, meaning we are referring to the function itself, not calling it.\n- `f(5)` calls the function object held in `f` with argument `5`.\n- `type(f)` queries the class of the object, proving it is a `<class \'function\'>`.\n- `f is square` tests object identity, proving `f` and `square` are identical in memory.\n- `functions = [square, abs, len]` creates a list containing three function objects.\n- `functions[0](4)` accesses the first function in the list and calls it.',
                '**Expected behavior.** ``` 25 <class \'function\'> <class \'function\'> True 16 7 3 ``` This proves the file executes successfully and the function object has identity.',
                '**CS lens.** Functions as first-class objects is the foundation of functional programming. Also recognized in: callbacks in JavaScript, delegates in C#, function pointers in C, and closures in Lisp.',
                '**SE lens.** Treating functions as objects allows us to abstract over behavior. The alternative is writing repetitive boilerplate or complex conditionals for every variation of logic.'
              ],
              typeIt: true,
              solution: 'def square(x):\n    return x * x\n\nf = square\nprint(f(5))\nprint(type(f))\nprint(type(square))\nprint(f is square)\n\nfunctions = [square, abs, len]\nprint(functions[0](4))\nprint(functions[1](-7))\nprint(functions[2]([1, 2, 3]))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Functions as arguments',
              prose: [
                'If we can pass data to functions to abstract over values, can we pass functions to functions to abstract over actions? What happens if you define a function that takes a parameter `f`, and then does `f(x)` inside its body? Pause and try to write a function that executes another function twice.',
                'This proves a function can accept another function as an argument and execute it. Functions that accept or return other functions are called **higher-order functions**.'
              ],
              typeIt: true,
              solution: '# Lab 2\n>>> def run_it(f): return f()\n...\n>>> run_it(lambda: "hello")\n\'hello\'',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Functions as arguments — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def apply_twice(f, x):` defines a function taking a function `f` and a value `x`.\n- `f(x)` calls the incoming function with the value.\n- `f(f(x))` calls the incoming function again on the result of the first call.\n- `apply_twice(double, 3)` passes the function object `double` and the integer `3`.\n- Call `apply_twice(double, 3)`: Call frame opens. `f=double`, `x=3`.\n- First call `f(x)` is `double(3)`, evaluates to `6`.\n- Second call `f(6)` is `double(6)`, evaluates to `12`.\n- Returns `12`.',
                '**Expected behavior.** ``` 12 16 5 ``` Proves the higher-order execution works correctly for different injected behaviors.',
                '**CS lens.** Higher-order functions allow algorithms to be parameterized by behavior. Also recognized in: Strategy pattern, map/reduce, event listeners.',
                '**SE lens.** This design enables extreme reuse. The alternative is writing `apply_double_twice()`, `apply_square_twice()`, duplicating the structural logic.'
              ],
              typeIt: true,
              solution: 'def apply_twice(f, x):\n    return f(f(x))\n\ndef double(x):\n    return x * 2\n\nprint(apply_twice(double, 3))\nprint(apply_twice(square, 2))\nprint(apply_twice(abs, -5))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'lambda',
              prose: [
                'If we only need a tiny function once (like adding two numbers), writing a full `def` block is verbose. How do we create a function object directly in an expression? Pause and guess how you might write a function without a name.',
                'This proves we can create and instantly call a function without naming it. This is called a **lambda expression**.'
              ],
              typeIt: true,
              solution: '# Lab 3\n>>> (lambda: 42)()\n42',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'lambda — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `lambda x: x * x` evaluates to a new anonymous function object taking parameter `x`. The colon separates parameters from the body. There is no `return` keyword because the expression *is* the return value.\n- `square_lambda = ...` assigns the anonymous function to a variable, showing it\'s just an object.\n- `(lambda x, y: x + y)(3, 4)` creates a function object and immediately calls it with arguments `3, 4`.',
                '**Expected behavior.** ``` 25 7 30 ``` Proves lambdas evaluate correctly and can be called like normal functions.',
                '**CS lens.** Lambda calculus is the foundational mathematical system underlying functional programming. Also recognized in: arrow functions in JS, lambdas in Java/C++, closures in Swift.',
                '**SE lens.** Lambdas are ideal for one-off callbacks. The alternative is polluting the namespace with single-use named functions. Use `def` for anything more complex than a single expression.'
              ],
              typeIt: true,
              solution: 'square_lambda = lambda x: x * x\nprint(square_lambda(5))\nprint((lambda x, y: x + y)(3, 4))\nadd = lambda a, b: a + b\nprint(add(10, 20))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'sorted()',
              prose: [
                'How do you sort a list of strings by their length instead of alphabetically? Or sort a list of dictionaries by a specific key? Pause and look up the `key` parameter of the built-in `sorted` function.',
                'This proves `sorted` can accept a function to extract the sort criterion from each element. This relies on the **key function** pattern.'
              ],
              typeIt: true,
              solution: '# Lab 4\n>>> sorted(["cc", "a", "bbb"], key=len)\n[\'a\', \'cc\', \'bbb\']',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'sorted() — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `sorted(words, key=len)` passes the built-in `len` function as the sorting key.\n- `key=lambda w: w[-1]` creates a lambda that takes a word and returns its last character, using that for the alphabetical sort.\n- `key=lambda p: p[\'age\']` extracts the \'age\' value from each dictionary, instructing `sorted` to compare integers instead of dictionaries.\n- `reverse=True` passes a boolean flag reversing the final output list.\nTrace of `sorted(words, key=len)`:\n- For each word in `words`, compute `len`. `banana` -> 6, `apple` -> 5, `fig` -> 3, `cherry` -> 6, `date` -> 4.\n- Use those lengths as comparison keys.\n- Return words ordered by the key: `fig`, `date`, `apple`, `banana`, `cherry`.',
                '**Expected behavior.** ``` [\'fig\', \'date\', \'apple\', \'banana\', \'cherry\'] [\'banana\', \'apple\', \'date\', \'fig\', \'cherry\'] [{\'name\': \'Alice\', \'age\': 28}, {\'name\': \'Carol\', \'age\': 35}, {\'name\': \'Bob\', \'age\': 42}] [5, 4, 3, 1, 1] ``` Proves flexible sorting mechanisms using function injection.',
                '**CS lens.** Decorate-Sort-Undecorate (Schwartzian transform) is the underlying technique applied here. Also recognized in: SQL `ORDER BY`, custom comparators in Java `Collections.sort`.',
                '**SE lens.** Key functions are simpler and safer than writing custom full-comparator functions (`cmp` in Python 2) because they guarantee stable properties.'
              ],
              typeIt: true,
              solution: 'words = [\'banana\', \'apple\', \'fig\', \'cherry\', \'date\']\n\nprint(sorted(words, key=len))\nprint(sorted(words, key=lambda w: w[-1]))\n\npeople = [{\'name\': \'Carol\', \'age\': 35},\n          {\'name\': \'Alice\', \'age\': 28},\n          {\'name\': \'Bob\',   \'age\': 42}]\nprint(sorted(people, key=lambda p: p[\'age\']))\nprint(sorted([3,1,4,1,5], reverse=True))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'map()',
              prose: [
                'Applying a function to every item in a list usually requires a `for` loop. Can we express this more directly? Pause and consider what a function that transforms lists via another function would look like.',
                'This proves we can map a single function across a collection natively. This is the **map** primitive.'
              ],
              typeIt: true,
              solution: '# Lab 5\n>>> list(map(str, [1, 2]))\n[\'1\', \'2\']',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'map() — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `map(str, [1, 2, 3])` applies the `str` function to 1, 2, and 3. `map` returns a LAZY iterator.\n- `list(...)` forces the lazy iterator to run immediately and stores the outputs in a list.\n- `map(lambda x: x**2, range(5))` squares each number generated by `range`.\n- `map(lambda a, b: a + b, list1, list2)` consumes two iterables in parallel, passing elements pair-wise into the lambda.',
                '**Expected behavior.** ``` [\'1\', \'2\', \'3\'] [3, 3, 6] [0, 1, 4, 9, 16] [11, 22, 33] ``` Proves the mapping transformations execute successfully.',
                '**CS lens.** Map is a fundamental functor operation in category theory. Also recognized in: `.map()` in JavaScript, `Stream.map` in Java, `Select` in LINQ.',
                '**SE lens.** While `map` is powerful, Python\'s list comprehensions `[f(x) for x in iterable]` are generally preferred for clarity. They both accomplish the exact same behavior.'
              ],
              typeIt: true,
              solution: 'print(list(map(str, [1, 2, 3])))\nprint(list(map(len, [\'apple\', \'fig\', \'banana\'])))\nprint(list(map(lambda x: x**2, range(5))))\nprint(list(map(lambda a, b: a + b, [1, 2, 3], [10, 20, 30])))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 11,
              cellTitle: 'filter()',
              prose: [
                'Extracting subset elements based on a condition usually requires a loop with an `if`. Is there a functional equivalent to `map` for conditions? Pause and guess how `filter` works.',
                'This proves we can retain items using a predicate function. This is the **filter** primitive.'
              ],
              typeIt: true,
              solution: '# Lab 6\n>>> list(filter(lambda x: x > 0, [-1, 0, 1]))\n[1]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 12,
              cellTitle: 'filter() — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `filter(lambda x: x % 2 == 0, range(10))` applies the modulo lambda to each item. If the lambda returns truthy, the item is kept.\n- `filter(None, iterable)` is a special case: when `None` is the predicate, it uses the truthiness of each element directly, discarding `0`, `\'\'`, `None`, and `[]`.',
                '**Expected behavior.** ``` [0, 2, 4, 6, 8] [1, \'hello\', [1, 2]] ``` Proves filtering based on predicates and implicit truthiness.',
                '**CS lens.** Filtering is the exact complement to mapping. Also recognized in: `.filter()` in JS, `Where` in LINQ.',
                '**SE lens.** Like `map`, `filter` is largely superseded by list comprehensions with `if` conditions `[x for x in iterable if f(x)]` in modern Python code.'
              ],
              typeIt: true,
              solution: 'print(list(filter(lambda x: x % 2 == 0, range(10))))\nprint(list(filter(None, [0, 1, \'\', \'hello\', None, [], [1,2]])))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 13,
              cellTitle: 'Functions as return values',
              prose: [
                'If a function can return an object, and a function *is* an object, what happens if a function creates another function and returns it? Pause and sketch a function that returns another function.',
                'This proves a function can return a dynamically constructed nested function. This relies on **closures**.'
              ],
              typeIt: true,
              solution: '# Lab 7\n>>> def outer():\n...     def inner(): return 1\n...     return inner\n>>> outer()()\n1',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 14,
              cellTitle: 'Functions as return values — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def make_adder(n):` defines an outer function accepting `n`.\n- `def add(x): return x + n` defines a nested inner function that uses the parameter `n` from the outer scope.\n- `return add` returns the function object itself, not its execution.\n- `add5 = make_adder(5)` calls the factory, which returns a new closure where `n` is fixed to 5.\n- `add10 = make_adder(10)` creates a DIFFERENT closure where `n` is fixed to 10.\n- `lambda x: x * n` is the identical technique, just using anonymous function syntax.\nTrace for `make_adder`:\n- `make_adder(5)` executes. Inner function `add` closes over `n=5`. Returns `add`.\n- `make_adder(10)` executes. Inner function `add` closes over `n=10`. Returns new `add`.\n- Call `add10(1)`. Inside closure, `x=1, n=10`. Returns `11`.\n- Call `add5(11)`. Inside closure, `x=11, n=5`. Returns `16`.',
                '**Expected behavior.** ``` 8 13 16 14 21 ``` Proves functions dynamically generated maintain their distinct state enclosures.',
                '**CS lens.** A closure is a record storing a function together with an environment. Also recognized in: function currying, object-oriented encapsulation alternatives.',
                '**SE lens.** Returning functions allows for function factories and decorators, allowing for modular dynamic behavior assembly.'
              ],
              typeIt: true,
              solution: 'def make_adder(n):\n    def add(x):\n        return x + n\n    return add\n\nadd5 = make_adder(5)\nadd10 = make_adder(10)\nprint(add5(3))\nprint(add10(3))\nprint(add5(add10(1)))\n\ndef make_multiplier(n):\n    return lambda x: x * n\n\ndouble = make_multiplier(2)\ntriple = make_multiplier(3)\nprint(double(7))\nprint(triple(7))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 15,
              cellTitle: 'functools.reduce()',
              prose: [
                'If you have a list of numbers and want their sum, you accumulate them. How can we generalize the logic of accumulating a result over an iterable? Pause and think of how you would write a function to repeatedly apply an operation to collapse a list.',
                'This proves we can repeatedly apply a binary function to fold a sequence down to a single value. This is the **reduce** primitive.'
              ],
              typeIt: true,
              solution: '# Lab 8\n>>> import functools\n>>> functools.reduce(lambda acc, x: acc + x, [1, 2])\n3',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 16,
              cellTitle: 'functools.reduce() — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `from functools import reduce` imports the `reduce` function from the standard library module `functools`.\n- `reduce(lambda acc, x: acc + x, [1, 2, 3, 4, 5])` applies the lambda.\n- The lambda accepts an accumulator `acc` and the current item `x`.\n- `reduce(max, [...])` passes the built-in `max` function to find the largest value across the list.\nTrace for `reduce(+, [1,2,3,4,5])`:\n- Initialize `acc=1` (first element), `x=2` (second element). Function yields `3`.\n- Update `acc=3`, `x=3`. Function yields `6`.\n- Update `acc=6`, `x=4`. Function yields `10`.\n- Update `acc=10`, `x=5`. Function yields `15`. Returns `15`.',
                '**Expected behavior.** ``` 15 120 9 ``` Proves the sequence accumulates correctly according to the provided function.',
                '**CS lens.** Reduce is the canonical fold operation in functional data processing. Also recognized in: `.reduce()` in JS, `aggregate` in C#, Hadoop MapReduce framework.',
                '**SE lens.** While powerful, `reduce` is notoriously hard to read for complex logic. Python moved it out of built-ins to `functools` to encourage explicit loops or comprehensions when possible.'
              ],
              typeIt: true,
              solution: 'from functools import reduce\n\nprint(reduce(lambda acc, x: acc + x, [1, 2, 3, 4, 5]))\nprint(reduce(lambda acc, x: acc * x, [1, 2, 3, 4, 5]))\nprint(reduce(max, [3, 1, 4, 1, 5, 9, 2, 6]))',
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
      'Next lesson: Recursion.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "reverse"?',
      options: [
        'parameter for descending sort. Reverses the resulting order. Solves the problem of needing largest-first sorting without negating keys.',
        'keyword that creates a named function object and binds it to a variable in the current scope. Solves the problem of defining reusable logic.',
        'parameter for sort criteria. Accepts a function to extract a comparison key from each element. Solves the problem of sorting data by arbitrary attributes.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "def"?',
      options: [
        'singleton representing the absence of a value. Solves the problem of needing a null literal.',
        'keyword that creates a named function object and binds it to a variable in the current scope. Solves the problem of defining reusable logic.',
        'parameter for sort criteria. Accepts a function to extract a comparison key from each element. Solves the problem of sorting data by arbitrary attributes.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "lambda"?',
      options: [
        'keyword for anonymous functions. Evaluates to a function object without assigning a name. Solves the problem of defining short, single-expression functions inline.',
        'exits a function, passing a computed value back to the caller. Solves the problem of retrieving results from function bodies.',
        'singleton representing the absence of a value. Solves the problem of needing a null literal.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "key"?',
      options: [
        'keyword for anonymous functions. Evaluates to a function object without assigning a name. Solves the problem of defining short, single-expression functions inline.',
        'parameter for sort criteria. Accepts a function to extract a comparison key from each element. Solves the problem of sorting data by arbitrary attributes.',
        'keyword that creates a named function object and binds it to a variable in the current scope. Solves the problem of defining reusable logic.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**def** — keyword that creates a named function object and binds it to a variable in the current scope. Solves the problem of defining reusable logic.',
    '**return** — exits a function, passing a computed value back to the caller. Solves the problem of retrieving results from function bodies.',
    '**is** — identity operator. Checks if two variables refer to the exact same object in memory. Solves the problem of verifying object identity versus structural equality.',
    '**lambda** — keyword for anonymous functions. Evaluates to a function object without assigning a name. Solves the problem of defining short, single-expression functions inline.',
    '**key** — parameter for sort criteria. Accepts a function to extract a comparison key from each element. Solves the problem of sorting data by arbitrary attributes.',
    '**reverse** — parameter for descending sort. Reverses the resulting order. Solves the problem of needing largest-first sorting without negating keys.',
    '**None** — singleton representing the absence of a value. Solves the problem of needing a null literal.',
  ],

  checkpoints: ['read-intuition'],
}
