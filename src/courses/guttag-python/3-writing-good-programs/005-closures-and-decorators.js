// Guttag — Lesson 19: Closures and Decorators
// Auto-converted from src/docs/tutorials/guttag-python/lesson-19.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-19-closures-and-decorators',
  slug: 'closures-and-decorators',
  chapter: 3,
  order: 5,
  title: 'Closures and Decorators',
  subtitle: 'Writing Good Programs',
  tags: ['first-class-function', 'closure', 'enclosing-scope', 'decorator', 'syntactic-sugar', 'args-and-kwargs'],

  hook: {
    question: 'What is "Closures and Decorators", and why does it matter?',
    realWorldContext: 'The reader understands closures (a function that captures variables from its enclosing scope) and decorators (`@` syntax, wrapping functions to add behavior). The transferable insight: a decorator is a function that takes a function and returns a new function. `@decorator` is just syntactic sugar for `func = decorator(func)`. This pattern enables cross-cutting concerns (logging, timing, caching, auth) to be added to any function without modifying it.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: First-class functions, Closures, Writing a decorator manually, The @ decorator syntax, Practical decorators — memoize.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **First-class function:** A function that can be treated like any other object (assigned to variables, passed as arguments, returned from other functions), because it is fundamentally just a value in memory, allowing functions to operate on functions.\n- **Closure:** A function that remembers and has access to variables from its enclosing scope even after that outer scope has finished executing, because it captures those variables in a hidden data structure (__closure__), solving the problem of maintaining state without global variables or classes.\n- **Enclosing scope:** The local namespace of an outer function that surrounds an inner function, because lexical scoping dictates that inner functions can read variables defined outside them.\n- **Decorator:** A design pattern and syntax (@) for taking a function, wrapping it in another function to add behavior, and returning the new function, because it allows separating cross-cutting concerns (like timing or caching) from core business logic.\n- **Syntactic sugar:** Syntax designed to make things easier to read or express, because @decorator is just a shorthand for func = decorator(func), not a fundamentally new capability.\n- **args and kwargs:** Syntax used in function definitions to accept an arbitrary number of positional and keyword arguments respectively, because a wrapper function must be able to accept whatever arguments the original function takes and forward them perfectly.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **type:** A built-in Python function that returns the type/class of an object.\n- **str.upper:** A string method that returns a copy of the string with all characters uppercase.\n- **time.perf_counter:** A function from the time module that returns a high-resolution time counter.\n- **sum:** A built-in function that sums an iterable.\n- **range:** A built-in type that represents an immutable sequence of numbers.\n- **functools.wraps:** A decorator from the functools module used for creating well-behaved decorators.\n- **functools.lru_cache:** A standard library decorator that caches the return values of a function.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s trace how the `@timer` decorator applies to `slow_sum` from start to finish, using all the concepts we learned: 1. **First-class functions**: When Python reads `def slow_sum(n):`, it creates a function object in memory. Because functions are first-class, this object can be passed around. 2. **The @ decorator syntax**: Python sees `@timer` above `slow_sum`. This is syntactic sugar. Instead of just assigning `slow_sum` to the new function object, Python immediately executes `timer(slow_sum)`. 3. **Closures**: Inside `timer`, a new `wrapper` function is defined. This `wrapper` needs access to the original `slow_sum` function, so it captures it in a closure. Even though `timer` finishes executing and returns, `wrapper` permanently remembers the original `slow_sum`. 4. **Returning the wrapper**: The `timer` function returns the `wrapper` function object. 5. **Reassignment**: Python takes the returned `wrapper` and assigns it to the name `slow_sum`. The original function object still exists in memory (inside the closure), but the name `slow_sum` now points to the wrapper. 6. **Execution**: When you call `slow_sum(100)`, you are actually calling `wrapper(100)`. The wrapper records the start time, uses its closure to call the original `func(100)`, records the end time, prints the duration, and returns the result. The caller receives the correct sum and never even realizes the function was wrapped.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 19: Closures and Decorators',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Closures and Decorators',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'First-class functions',
              prose: [
                'How do we write code that manipulates or extends the behavior of existing functions without copying their source code? If a function is just an instruction set, can we pass it around like a variable? What would happen if you tried to assign a function to a variable, without calling it? Pause and imagine what `my_var = print` might do. How would you then use `my_var`?',
                'Predicted confidently: ``` <class \'function\'> <function greet at 0x...> Hello, Alice! Hello, Bob! HELLO ``` This proves that functions are objects in Python, meaning they have a type (`<class \'function\'>`) and can be assigned to variables, passed into other functions, and invoked through those variables. This is called a **first-class function**.'
              ],
              typeIt: true,
              solution: 'def greet(name):\n    return f\'Hello, {name}!\'\n\n# Functions are objects:\nprint(type(greet))      \nprint(greet)            \n\n# Assign to a variable:\nsay_hi = greet          \nprint(say_hi(\'Alice\'))  \n\n# Pass as argument:\ndef apply(func, value):\n    return func(value)\n\nprint(apply(greet, \'Bob\'))   \nprint(apply(str.upper, \'hello\'))  ',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'First-class functions — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def apply(func, value):`: Defines a new function named `apply` that takes two parameters: `func` (expected to be a callable object) and `value`.\n- `return func(value)`: Calls the `func` object passing `value` as its argument, and returns the result back to the caller.',
                '**Expected behavior.** Predicted confidently: nothing happens until `apply` is called.',
                '**CS lens.** First-class functions are a foundational concept in functional programming languages (like Lisp, Scheme, Haskell) and modern multi-paradigm languages (JavaScript, Python, Go). They allow for higher-order functions (functions that take or return other functions). Real-world applications include passing callback functions to event listeners in UI programming, providing sorting keys to sorting algorithms, passing map/filter operations to data processing pipelines, and structuring strategy patterns without needing heavy class hierarchies.',
                '**SE lens.** The design principle here is treating behavior as data. The alternative NOT chosen is passing strings or enums that tell a switch-statement which hardcoded behavior to run. The tradeoff is that passing functions directly is highly flexible and decoupled, but can make the code harder to trace statically because you don\'t always know exactly which function will be passed at runtime until it executes.'
              ],
              typeIt: true,
              solution: 'def apply(func, value):\n    return func(value)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Closures',
              prose: [
                'If a function is returned from another function, what happens to the local variables of the outer function once it finishes executing? Normally, local variables are destroyed when a function returns. If an inner function needs them, how can it survive? If you create two different inner functions from the same outer function, do they share variables or get their own? Pause and sketch a function that returns another function. How would the inner one use a parameter from the outer one?',
                'Predicted confidently: ``` 10 15 14 2 3 ``` This proves that the inner function captures and remembers the variables from its enclosing scope (like `n`), even after the outer function `make_multiplier` has returned. Each instance gets its own independent snapshot of those variables. This is called a **closure**.'
              ],
              typeIt: true,
              solution: 'def make_multiplier(n):\n    def inner(x):\n        return x * n    \n    return inner        \n\ndouble = make_multiplier(2)\ntriple = make_multiplier(3)\n\nprint(double(5))   \nprint(triple(5))   \nprint(double(7))   \n\nprint(double.__closure__[0].cell_contents)  \nprint(triple.__closure__[0].cell_contents)  ',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Closures — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def make_multiplier(n):`: Defines the outer function taking parameter `n`.\n- `def inner(x):`: Defines an inner function taking parameter `x`.\n- `return x * n`: Multiplies `x` by `n`. Because `n` is not defined in `inner`, Python looks at the enclosing scope (`make_multiplier`) and captures `n` in a closure.\n- `return inner`: Returns the `inner` function object itself (without calling it).',
                '**Expected behavior.** Predicted confidently: defining the function produces no output.',
                '**CS lens.** A closure is a record storing a function together with an environment (a mapping associating each free variable of the function with the value or reference to which the name was bound when the closure was created). Real-world applications include state encapsulation (simulating private object fields), function currying/partial application, callback handlers in asynchronous code that need to remember request IDs, and decorator implementations.',
                '**SE lens.** The design principle is encapsulation of state without requiring a full class definition. The alternative NOT chosen is defining a class with an `__init__` method to store `n` and a `__call__` method to perform the multiplication. The real tradeoff is that closures are lightweight and concise for simple single-method state, but classes scale better when you need multiple methods or complex shared state manipulation.'
              ],
              typeIt: true,
              solution: 'def make_multiplier(n):\n    def inner(x):\n        return x * n\n    return inner',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Writing a decorator manually',
              prose: [
                'If we want to time how long several different functions take to run, how can we add timing code without copying and pasting `time.perf_counter()` into every single function? How can we use first-class functions and closures to intercept a function call, do something before it, call it, and do something after? If the wrapper function replaces the original, how does it handle the original function\'s arguments? Pause and think: write a function `timer(func)` that returns a new function. What should that new function do?',
                'Predicted confidently (time may vary): ``` slow_sum took 0.034521s 499999500000 ``` This proves that we can write a function `timer` that takes `slow_sum`, creates a `wrapper` closure capturing `func`, and returns that `wrapper`. Assigning `slow_sum = timer(slow_sum)` completely replaces the original function with the wrapper, automatically adding timing logic. This pattern is called a **decorator**.'
              ],
              typeIt: true,
              solution: 'import time\n\ndef timer(func):\n    def wrapper(*args, **kwargs):\n        start = time.perf_counter()\n        result = func(*args, **kwargs)   \n        end = time.perf_counter()\n        print(f\'{func.__name__} took {end-start:.6f}s\')\n        return result\n    return wrapper\n\ndef slow_sum(n):\n    return sum(range(n))\n\nslow_sum = timer(slow_sum)\nprint(slow_sum(1_000_000))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Writing a decorator manually — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import time`: Imports the time module.\n- `def timer(func):`: Defines the outer function that takes a target `func` to be wrapped.\n- `def wrapper(*args, **kwargs):`: Defines the inner closure. `*args` and `**kwargs` catch any positional or keyword arguments so this wrapper can wrap functions with any signature.\n- `start = time.perf_counter()`: Records the high-resolution start time.\n- `result = func(*args, **kwargs)`: Calls the original `func` (captured via closure) passing along all arguments, and stores the return value.\n- `end = time.perf_counter()`: Records the end time.\n- `print(f\'{func.__name__} took {end-start:.6f}s\')`: Prints the original function\'s name and elapsed time.\n- `return result`: Returns the result from the original function call so the wrapper behaves exactly like the original.\n- `return wrapper`: Returns the inner function object.',
                '**Expected behavior.** Predicted confidently: defining the function produces no output.',
                '**CS lens.** The decorator pattern is a structural design pattern that allows behavior to be added to an individual object, statically or dynamically, without affecting the behavior of other objects from the same class. Real-world applications include Aspect-Oriented Programming (AOP), adding authentication checks to web routes, adding logging/telemetry, and transaction management in database layers.',
                '**SE lens.** The design principle is the Open/Closed Principle and separation of concerns: the core function remains unchanged (closed for modification), while the new behavior is added from the outside (open for extension). The alternative NOT chosen is modifying the source code of `slow_sum` directly to add `perf_counter` calls. The real tradeoff is that decorators keep the core business logic clean, but they add layers of indirection that can make stack traces deeper and debugging slightly harder.'
              ],
              typeIt: true,
              solution: 'import time\n\ndef timer(func):\n    def wrapper(*args, **kwargs):\n        start = time.perf_counter()\n        result = func(*args, **kwargs)\n        end = time.perf_counter()\n        print(f\'{func.__name__} took {end-start:.6f}s\')\n        return result\n    return wrapper',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'The @ decorator syntax',
              prose: [
                'Writing `my_func = decorator(my_func)` after every function definition is repetitive and detaches the wrapping from the definition itself. How can we tell Python to apply the decorator immediately when the function is defined? If we replace the original function with `wrapper`, what happens to metadata like the function\'s name (`__name__`) or docstring? Pause and consider: what if you need to inspect the function later and it says its name is "wrapper"? How would you fix it?',
                'Predicted confidently (time varies): ``` slow_sum((100000,), {}) -> 0.0031s 4999950000 greet((\'Alice\',), {}) -> 0.0000s Hello, Alice! ``` This proves that placing `@timer` directly above the function definition automatically passes the function to `timer` and replaces it with the returned wrapper. `functools.wraps` copies the original function\'s name to the wrapper. The `@` syntax is called **syntactic sugar** for the decorator pattern.'
              ],
              typeIt: true,
              solution: 'import time\nimport functools\n\ndef timer(func):\n    @functools.wraps(func)\n    def wrapper(*args, **kwargs):\n        start = time.perf_counter()\n        result = func(*args, **kwargs)\n        elapsed = time.perf_counter() - start\n        print(f\'{func.__name__}({args}, {kwargs}) -> {elapsed:.4f}s\')\n        return result\n    return wrapper\n\n@timer               \ndef slow_sum(n):\n    return sum(range(n))\n\n@timer\ndef greet(name, greeting=\'Hello\'):\n    return f\'{greeting}, {name}!\'\n\nprint(slow_sum(100_000))\nprint(greet(\'Alice\'))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'The @ decorator syntax — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `@timer`: Syntactic sugar placed on the line immediately preceding a function definition. At load time, Python evaluates `def slow_sum(n): ...`, creates the function object, then immediately calls `timer(slow_sum)`, and assigns the returned wrapper back to the name `slow_sum`.\n- `def slow_sum(n):`: Defines the original function.\n- `return sum(range(n))`: The body of the original function.',
                '**Expected behavior.** Predicted confidently: defining the function produces no output.',
                '**CS lens.** Syntactic sugar describes language features that do not add new functionality but make the language sweeter for humans to read and write. Real-world applications include `+=` instead of `x = x + 1`, list comprehensions instead of loops, `async`/`await` instead of manual promise chaining, and `@decorator` syntax in Python/TypeScript.',
                '**SE lens.** The design principle is readability and declarative programming. The alternative NOT chosen is leaving the manual `slow_sum = timer(slow_sum)` at the bottom of the file. The real tradeoff is that `@decorator` makes it immediately obvious to the reader that the function is wrapped, right where the function is declared, but it hides the explicit function call and reassignment, which can confuse beginners about what is actually happening at runtime.'
              ],
              typeIt: true,
              solution: '@timer\ndef slow_sum(n):\n    return sum(range(n))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Practical decorators — memoize',
              prose: [
                'If a function performs an expensive calculation (like recursive Fibonacci) and is called with the same arguments repeatedly, how can we avoid re-doing the work? How can a decorator maintain state (like a dictionary of saved results) that persists across multiple calls to the wrapper? Is there a built-in way to do this in Python? Pause and think: write a `cache = {}` inside a decorator. When should the wrapper check the cache, and when should it call the original function?',
                'Predicted confidently: ``` 12586269025 354224848179261915075 ``` This proves that the closure in `memoize` captures the `cache` dictionary. Because dictionaries are mutable, the `wrapper` can read and write to it across multiple calls. If the result is already in the cache, it returns instantly instead of recursing exponentially. This specific caching technique is called **memoization**.'
              ],
              typeIt: true,
              solution: 'import functools\n\ndef memoize(func):\n    cache = {}   \n    @functools.wraps(func)\n    def wrapper(*args):\n        if args not in cache:\n            cache[args] = func(*args)\n        return cache[args]\n    return wrapper\n\n@memoize\ndef fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\n\nprint(fib(50))  \n\nfrom functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib2(n):\n    if n <= 1:\n        return n\n    return fib2(n-1) + fib2(n-2)\n\nprint(fib2(100))  ',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Practical decorators — memoize — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `from functools import lru_cache`: Imports the built-in decorator for caching.\n- `@lru_cache(maxsize=None)`: Applies the decorator. `maxsize=None` tells it to cache an unlimited number of arguments. Note that `lru_cache` is a decorator factory (a function that returns a decorator), which is why it has `()`.\n- `def fib2(n):`: Defines the recursive Fibonacci function.\n- `if n <= 1: return n`: The base case for the recursion.\n- `return fib2(n-1) + fib2(n-2)`: The recursive step.',
                '**Expected behavior.** Predicted confidently: defining the function produces no output.',
                '**CS lens.** Memoization is an optimization technique used primarily to speed up computer programs by storing the results of expensive function calls and returning the cached result when the same inputs occur again. Real-world applications include Dynamic Programming algorithms, rendering engines skipping UI repaints for unchanged components, database query result caching, and HTTP proxy caching.',
                '**SE lens.** The design principle is cross-cutting concerns and the single responsibility principle. The alternative NOT chosen is modifying `fib2` to manually pass a `cache` dictionary around in its arguments. The real tradeoff is that decorators keep the core math logic absolutely pure and readable, while caching is handled externally, but decorators can mask performance characteristics—a reader looking only at `fib2` without noticing the `@` might incorrectly assume it runs in exponential time.'
              ],
              typeIt: true,
              solution: 'from functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib2(n):\n    if n <= 1:\n        return n\n    return fib2(n-1) + fib2(n-2)',
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
      'Next lesson: Iterators and Generators.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Decorator"?',
      options: [
        'A design pattern and syntax (@) for taking a function, wrapping it in another function to add behavior, and returning the new function, because it allows separating cross-cutting concerns (like timing or caching) from core business logic.',
        'A function that remembers and has access to variables from its enclosing scope even after that outer scope has finished executing, because it captures those variables in a hidden data structure (__closure__), solving the problem of maintaining state without global variables or classes.',
        'Syntax designed to make things easier to read or express, because @decorator is just a shorthand for func = decorator(func), not a fundamentally new capability.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Syntactic sugar"?',
      options: [
        'The local namespace of an outer function that surrounds an inner function, because lexical scoping dictates that inner functions can read variables defined outside them.',
        'Syntax designed to make things easier to read or express, because @decorator is just a shorthand for func = decorator(func), not a fundamentally new capability.',
        'A design pattern and syntax (@) for taking a function, wrapping it in another function to add behavior, and returning the new function, because it allows separating cross-cutting concerns (like timing or caching) from core business logic.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "args and kwargs"?',
      options: [
        'Syntax used in function definitions to accept an arbitrary number of positional and keyword arguments respectively, because a wrapper function must be able to accept whatever arguments the original function takes and forward them perfectly.',
        'The local namespace of an outer function that surrounds an inner function, because lexical scoping dictates that inner functions can read variables defined outside them.',
        'A function that can be treated like any other object (assigned to variables, passed as arguments, returned from other functions), because it is fundamentally just a value in memory, allowing functions to operate on functions.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Closure"?',
      options: [
        'A function that can be treated like any other object (assigned to variables, passed as arguments, returned from other functions), because it is fundamentally just a value in memory, allowing functions to operate on functions.',
        'Syntax designed to make things easier to read or express, because @decorator is just a shorthand for func = decorator(func), not a fundamentally new capability.',
        'A function that remembers and has access to variables from its enclosing scope even after that outer scope has finished executing, because it captures those variables in a hidden data structure (__closure__), solving the problem of maintaining state without global variables or classes.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**First-class function** — A function that can be treated like any other object (assigned to variables, passed as arguments, returned from other functions), because it is fundamentally just a value in memory, allowing functions to operate on functions.',
    '**Closure** — A function that remembers and has access to variables from its enclosing scope even after that outer scope has finished executing, because it captures those variables in a hidden data structure (__closure__), solving the problem of maintaining state without global variables or classes.',
    '**Enclosing scope** — The local namespace of an outer function that surrounds an inner function, because lexical scoping dictates that inner functions can read variables defined outside them.',
    '**Decorator** — A design pattern and syntax (@) for taking a function, wrapping it in another function to add behavior, and returning the new function, because it allows separating cross-cutting concerns (like timing or caching) from core business logic.',
    '**Syntactic sugar** — Syntax designed to make things easier to read or express, because @decorator is just a shorthand for func = decorator(func), not a fundamentally new capability.',
    '**args and kwargs** — Syntax used in function definitions to accept an arbitrary number of positional and keyword arguments respectively, because a wrapper function must be able to accept whatever arguments the original function takes and forward them perfectly.',
  ],

  checkpoints: ['read-intuition'],
}
