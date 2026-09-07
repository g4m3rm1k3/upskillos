// Guttag — Lesson 25: Special Methods
// Auto-converted from src/docs/tutorials/guttag-python/lesson-25.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-25-special-methods',
  slug: 'special-methods',
  chapter: 4,
  order: 4,
  title: 'Special Methods',
  subtitle: 'Making Objects Feel Like Python',
  tags: ['special-methods-dunder-methods', 'generator', 'context-manager'],

  hook: {
    question: 'What is "Special Methods", and why does it matter?',
    realWorldContext: 'The reader understands Python\'s special (dunder) methods: `__repr__`, `__str__`, `__eq__`, `__lt__`, `__add__`, `__len__`, `__contains__`, `__iter__`, `__getitem__`. These make user-defined classes work with Python\'s built-in functions and operators. The transferable insight: Python\'s operators and built-ins are backed by method calls. `+` calls `__add__`. `len()` calls `__len__`. `in` calls `__contains__`. By implementing these methods, your class integrates with Python\'s entire ecosystem of tools (`sorted`, `max`, `in`, `print`, `==`, etc.).',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: __repr__ and __str__ — string representations, __eq__ and __lt__ — comparison operators, __add__, __mul__, __len__ — arithmetic and sizing, __iter__ and __getitem__ — iteration protocol, __enter__ and __exit__ — context managers.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Special methods (dunder methods):** Methods with double underscores before and after their names (e.g., __init__). They are called implicitly by Python when objects are used with standard operators and built-in functions, allowing custom classes to emulate built-in behavior.\n- **Generator:** A function that returns an iterator that produces a sequence of values one at a time using yield, preserving state between calls. It solves the problem of returning multiple values without storing them all in memory at once.\n- **Context manager:** An object that defines the runtime context established when executing a with statement. It guarantees that setup and teardown actions (like closing a file or stopping a timer) happen reliably, even if an exception occurs.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **__repr__:** A special method for the "official" string representation of an object.\n- **__str__:** A special method for the "informal" or nicely printable string representation of an object.\n- **__eq__:** A special method for equality comparison.\n- **__lt__:** A special method for less-than comparison.\n- **functools.total_ordering:** A class decorator.\n- **__add__:** A special method for addition.\n- **__len__:** A special method for length.\n- **__iter__:** A special method for iteration.\n- **__getitem__:** A special method for indexing.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s trace a `Vector(1, 2, 3)` through these concepts: - **`__repr__`**: If we inspect the vector, `Vector(1, 2, 3)` is clearly logged. - **`__add__`**: If we calculate `Vector(1, 2, 3) + Vector(4, 5, 6)`, `__add__` yields a new Vector instance `Vector(5, 7, 9)`. - **`__mul__`**: If we do `3 * Vector(1, 2, 3)`, `__rmul__` catches the reverse operation and calls `__mul__`, returning `Vector(3, 6, 9)`. - **`__len__`**: We can call `len(Vector(1, 2, 3))` directly, and `__len__` returns `3`. - **`__iter__`**: Though we didn\'t add it to `Vector` above, if we implemented `__iter__` to yield components, we could do `for component in Vector(1, 2, 3):`. Python\'s data model uses methods starting and ending with double underscores to integrate your objects with the language syntax. Overriding them transforms a basic class into a native citizen of the Python environment.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 25: Special Methods',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Special Methods',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: '__repr__ and __str__ — string representations',
              prose: [
                'When you print an object in Python, you often get a generic string like `<__main__.Point object at 0x...>`. If you want to log what\'s actually inside the object, this is useless. How can we make our object format itself nicely when printed, or precisely when debugged?',
                'This proves that Python hooks the built-in functions `repr()`, `str()`, and `print()` directly to the **special methods** `__repr__` and `__str__` defined on the class. `__repr__` returns an unambiguous representation, while `__str__` returns a readable one.'
              ],
              typeIt: true,
              solution: 'class Point:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n\n    def __repr__(self):\n        return f\'Point({self.x!r}, {self.y!r})\'\n\n    def __str__(self):\n        return f\'({self.x}, {self.y})\'\n\np = Point(3, 4)\nprint(repr(p))   # Point(3, 4)\nprint(str(p))    # (3, 4)\nprint(p)         # (3, 4)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: '__repr__ and __str__ — string representations — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def __repr__(self):` defines the method called by `repr()`.\n- `return f\'Point({self.x!r}, {self.y!r})\'` uses an f-string to inject the values. The `!r` suffix specifically calls `repr()` on `self.x` and `self.y`, ensuring strings get quotes around them.\n- `def __str__(self):` defines the method called by `str()` and implicitly by `print()`.\n- `return f\'({self.x}, {self.y})\'` returns a purely human-readable format.',
                '**Expected behavior.** Predicted confidently: `Point(3, 4)` for `repr(p)` and `(3, 4)` for `str(p)`.',
                '**CS lens.** Data representation. Every system distinguishes between "how data is stored" and "how data is serialized for communication." This mirrors serialization formats like JSON, debugging views in IDEs, and logging payloads.',
                '**SE lens.** Separation of concerns for output. By having two different methods, Python explicitly acknowledges that developers need rigorous detail (for debugging and logging) and users need clean summaries (for display). We don\'t have to pollute one with the constraints of the other.'
              ],
              typeIt: true,
              solution: 'class Point:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n\n    def __repr__(self):\n        # Goal: unambiguous, ideally evaluable: eval(repr(p)) == p\n        return f\'Point({self.x!r}, {self.y!r})\'\n\n    def __str__(self):\n        # Goal: human-readable\n        return f\'({self.x}, {self.y})\'',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: '__eq__ and __lt__ — comparison operators',
              prose: [
                'If you create `Point(1, 2)` and another `Point(1, 2)`, Python considers them unequal by default because they occupy different memory addresses. How do we tell Python that equality should be based on their coordinates?',
                'This proves that overriding **special methods** `__eq__` and `__lt__` completely redefines how `==` and sorting behave for these instances.'
              ],
              typeIt: true,
              solution: 'from functools import total_ordering\n\n@total_ordering\nclass Point:\n    def __init__(self, x, y):\n        self.x, self.y = x, y\n\n    def __eq__(self, other):\n        if not isinstance(other, Point):\n            return NotImplemented\n        return self.x == other.x and self.y == other.y\n\n    def __lt__(self, other):\n        return (self.x**2 + self.y**2) < (other.x**2 + other.y**2)\n\n    def __repr__(self):\n        return f\'Point({self.x}, {self.y})\'\n\np1 = Point(1, 2)\np2 = Point(1, 2)\np3 = Point(3, 4)\nprint(p1 == p2)\nprint(sorted([p3, p1, p2]))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: '__eq__ and __lt__ — comparison operators — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def __eq__(self, other):` is called when `p1 == p2` is evaluated. `self` is `p1`, `other` is `p2`.\n- `if not isinstance(other, Point):` guards against comparing a `Point` to unrelated types like strings.\n- `return NotImplemented` tells Python to fall back to other comparison strategies or return `False`.\n- `return self.x == other.x and self.y == other.y` defines structural equality based on fields.\n- `def __lt__(self, other):` is called when `p1 < p2` is evaluated.\n- `return (self.x**2 + self.y**2) < (other.x**2 + other.y**2)` compares the squared distance from the origin for each point.',
                '**Expected behavior.** Predicted confidently: `p1 == p2` evaluates to `True`. `sorted` yields `[Point(1, 2), Point(1, 2), Point(3, 4)]`.',
                '**CS lens.** Value semantics vs. Reference semantics. By default, user-defined classes in Python use reference equality (memory address). Overriding `__eq__` switches the class to value equality, treating objects with identical data as mathematically identical.',
                '**SE lens.** Fail-safe typing. Returning `NotImplemented` instead of raising an error allows Python\'s operator resolution to attempt the comparison from the reverse direction (`other.__eq__(self)`) before cleanly giving up. It is cooperative rather than destructive.'
              ],
              typeIt: true,
              solution: '    def __eq__(self, other):\n        if not isinstance(other, Point):\n            return NotImplemented\n        return self.x == other.x and self.y == other.y\n\n    def __lt__(self, other):\n        # Compare by distance from origin\n        return (self.x**2 + self.y**2) < (other.x**2 + other.y**2)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: '__add__, __mul__, __len__ — arithmetic and sizing',
              prose: [
                'If we have two vectors, mathematically we should be able to add them directly like `v1 + v2`. Python natively restricts `+` to numbers and strings. How do we teach the `+` operator to understand a custom `Vector` class?',
                'This proves that by defining **special methods** for arithmetic (`__add__`, `__mul__`) and sizing (`__len__`), custom objects act identical to built-in numbers and collections.'
              ],
              typeIt: true,
              solution: 'class Vector:\n    def __init__(self, *components):\n        self.components = tuple(components)\n\n    def __add__(self, other):\n        return Vector(*(a + b for a, b in zip(self.components, other.components)))\n\n    def __mul__(self, scalar):\n        return Vector(*(x * scalar for x in self.components))\n\n    def __rmul__(self, scalar):\n        return self.__mul__(scalar)\n\n    def __len__(self):\n        return len(self.components)\n        \nv1 = Vector(1, 2, 3)\nprint(v1 + Vector(4, 5, 6))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: '__add__, __mul__, __len__ — arithmetic and sizing — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def __add__(self, other):` binds to the `+` operator.\n- `len(self) != len(other)` checks dimensions by implicitly calling `self.__len__()`.\n- `Vector(*(a + b for a, b in zip(self.components, other.components)))` pairwise-adds the elements and unpacks them into a new `Vector` instance.\n- `def __mul__(self, scalar):` binds to `*` when the vector is on the left (`v * 3`).\n- `def __rmul__(self, scalar):` binds to `*` when the vector is on the right (`3 * v`). Python tries `3.__mul__(v)`, fails, and falls back to `v.__rmul__(3)`.\n- `def __len__(self):` binds to the built-in `len()` function, delegating to the tuple\'s length.',
                '**Expected behavior.** Predicted confidently: `v1 + v2` creates `Vector(5, 7, 9)`. `len(v1)` yields `3`.',
                '**CS lens.** Operator overloading. By enabling user types to participate in native language syntax (like `+` or `len`), languages reduce boilerplate function calls (`v1.add(v2)`) and increase readability for domains like math and graphics.',
                '**SE lens.** Immutability. `__add__` and `__mul__` return entirely new `Vector` instances rather than modifying `self`. This prevents side effects when passing vectors around the system.'
              ],
              typeIt: true,
              solution: 'class Vector:\n    def __init__(self, *components):\n        self.components = tuple(components)\n\n    def __add__(self, other):\n        if len(self) != len(other):\n            raise ValueError(\'Vectors must have same dimension\')\n        return Vector(*(a + b for a, b in zip(self.components, other.components)))\n\n    def __mul__(self, scalar):\n        return Vector(*(x * scalar for x in self.components))\n\n    def __rmul__(self, scalar):  # scalar * vector\n        return self.__mul__(scalar)\n\n    def __len__(self):\n        return len(self.components)\n\n    def __repr__(self):\n        return f\'Vector{self.components}\'',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: '__iter__ and __getitem__ — iteration protocol',
              prose: [
                'If we have a custom range of numbers, how do we make `for x in my_range:` work? Python\'s `for` loop doesn\'t inherently know how to get the "next" item from a custom class.',
                'This proves that by yielding values via the **special method** `__iter__`, an object acts as an iterable sequence.'
              ],
              typeIt: true,
              solution: 'class NumberRange:\n    def __init__(self, start, stop):\n        self.start, self.stop = start, stop\n\n    def __iter__(self):\n        current = self.start\n        while current < self.stop:\n            yield current\n            current += 1\n\nr = NumberRange(3, 8)\nprint(list(r))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: '__iter__ and __getitem__ — iteration protocol — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def __iter__(self):` binds to `iter()`, which is called implicitly by `for` loops.\n- `yield current` turns `__iter__` into a **Generator**. It pauses execution, returns `current`, and resumes from that spot on the next loop iteration.\n- `def __contains__(self, item):` binds to the `in` operator (e.g., `5 in r`).\n- `def __getitem__(self, index):` binds to the bracket syntax `r[index]`.\n- `raise IndexError(index)` adheres to Python\'s contract: invalid indices must raise an `IndexError` to stop implicit iterations appropriately.',
                '**Expected behavior.** Predicted confidently: `list(r)` creates `[3, 4, 5, 6, 7]`. `5 in r` evaluates to `True`. `r[2]` yields `5`.',
                '**CS lens.** Lazy Evaluation. The `NumberRange` does not allocate memory for a list of numbers. It computes them only exactly when asked, via the generator, saving unbounded memory overhead.',
                '**SE lens.** Adhering to interfaces without inheritance. Python relies on "duck typing". `NumberRange` doesn\'t need to inherit from `List` or `Iterable` base classes; simply implementing `__iter__` and `__getitem__` is enough for Python to treat it as a full-fledged collection.'
              ],
              typeIt: true,
              solution: 'class NumberRange:\n    def __init__(self, start, stop):\n        self.start = start\n        self.stop = stop\n\n    def __iter__(self):\n        current = self.start\n        while current < self.stop:\n            yield current         # generator: one value at a time\n            current += 1\n\n    def __contains__(self, item):\n        return self.start <= item < self.stop\n\n    def __len__(self):\n        return max(0, self.stop - self.start)\n\n    def __getitem__(self, index):\n        if index < 0 or index >= len(self):\n            raise IndexError(index)\n        return self.start + index',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: '__enter__ and __exit__ — context managers',
              prose: [
                'When you open a file, you must close it, even if an error occurs while reading it. The `with open(...) as f:` syntax guarantees this cleanup. How do we create our own objects that safely setup and teardown resources automatically in a `with` block?',
                'This proves that the **special methods** `__enter__` and `__exit__` hook directly into the lifecycle of a `with` statement, executing predictably before and after the block.'
              ],
              typeIt: true,
              solution: 'class Timer:\n    import time as _time\n    def __enter__(self):\n        self.start = self._time.perf_counter()\n        return self\n\n    def __exit__(self, exc_type, exc_val, exc_tb):\n        self.elapsed = self._time.perf_counter() - self.start\n        print(f\'Elapsed: {self.elapsed:.4f}s\')\n        return False\n\nimport time\nwith Timer() as t:\n    time.sleep(0.1)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: '__enter__ and __exit__ — context managers — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def __enter__(self):` is called exactly when the `with Timer() as t:` block begins.\n- `return self` specifies that the returned value is assigned to `t`, the variable named after `as`.\n- `def __exit__(self, exc_type, exc_val, exc_tb):` is called exactly when the block ends, regardless of success or failure.\n- `exc_type, exc_val, exc_tb` hold exception information if an error occurred inside the `with` block.\n- `return False` tells Python not to silently suppress exceptions, allowing them to propagate up normally.',
                '**Expected behavior.** Predicted confidently: The output will print approximately `Elapsed: 0.1001s`.',
                '**CS lens.** Resource acquisition is initialization (RAII). This pattern ensures that resources (locks, files, sockets, or timers) are tied inextricably to the lifespan of an object, guaranteeing cleanup upon destruction.',
                '**SE lens.** Deterministic teardown. By embedding teardown directly into `__exit__`, the caller physically cannot forget to invoke it. The API protects itself against misuse.'
              ],
              typeIt: true,
              solution: 'class Timer:\n    import time as _time\n\n    def __enter__(self):\n        self.start = self._time.perf_counter()\n        return self                 # bound to \'as\' variable\n\n    def __exit__(self, exc_type, exc_val, exc_tb):\n        self.elapsed = self._time.perf_counter() - self.start\n        print(f\'Elapsed: {self.elapsed:.4f}s\')\n        return False  # False: don\'t suppress exceptions',
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
      'Next lesson: Polymorphism and Duck Typing.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Generator"?',
      options: [
        'An object that defines the runtime context established when executing a with statement. It guarantees that setup and teardown actions (like closing a file or stopping a timer) happen reliably, even if an exception occurs.',
        'A function that returns an iterator that produces a sequence of values one at a time using yield, preserving state between calls. It solves the problem of returning multiple values without storing them all in memory at once.',
        'Methods with double underscores before and after their names (e.g., __init__). They are called implicitly by Python when objects are used with standard operators and built-in functions, allowing custom classes to emulate built-in behavior.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Context manager"?',
      options: [
        'An object that defines the runtime context established when executing a with statement. It guarantees that setup and teardown actions (like closing a file or stopping a timer) happen reliably, even if an exception occurs.',
        'Methods with double underscores before and after their names (e.g., __init__). They are called implicitly by Python when objects are used with standard operators and built-in functions, allowing custom classes to emulate built-in behavior.',
        'A function that returns an iterator that produces a sequence of values one at a time using yield, preserving state between calls. It solves the problem of returning multiple values without storing them all in memory at once.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Special methods (dunder methods)"?',
      options: [
        'A function that returns an iterator that produces a sequence of values one at a time using yield, preserving state between calls. It solves the problem of returning multiple values without storing them all in memory at once.',
        'An object that defines the runtime context established when executing a with statement. It guarantees that setup and teardown actions (like closing a file or stopping a timer) happen reliably, even if an exception occurs.',
        'Methods with double underscores before and after their names (e.g., __init__). They are called implicitly by Python when objects are used with standard operators and built-in functions, allowing custom classes to emulate built-in behavior.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Special methods (dunder methods)** — Methods with double underscores before and after their names (e.g., __init__). They are called implicitly by Python when objects are used with standard operators and built-in functions, allowing custom classes to emulate built-in behavior.',
    '**Generator** — A function that returns an iterator that produces a sequence of values one at a time using yield, preserving state between calls. It solves the problem of returning multiple values without storing them all in memory at once.',
    '**Context manager** — An object that defines the runtime context established when executing a with statement. It guarantees that setup and teardown actions (like closing a file or stopping a timer) happen reliably, even if an exception occurs.',
  ],

  checkpoints: ['read-intuition'],
}
