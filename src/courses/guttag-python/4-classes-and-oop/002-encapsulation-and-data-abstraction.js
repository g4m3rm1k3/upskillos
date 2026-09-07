// Guttag — Lesson 23: Encapsulation and Data Abstraction
// Auto-converted from src/docs/tutorials/guttag-python/lesson-23.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-23-encapsulation-and-data-abstraction',
  slug: 'encapsulation-and-data-abstraction',
  chapter: 4,
  order: 2,
  title: 'Encapsulation and Data Abstraction',
  subtitle: 'Classes and OOP',
  tags: ['abstraction-barrier', 'interface', 'implementation', 'name-mangling', 'invariant', 'identity'],

  hook: {
    question: 'What is "Encapsulation and Data Abstraction", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 6 core ideas: The abstraction barrier — interface vs implementation, Name mangling — _private and __mangled, @property — computed attributes and validation, Read-only properties, Invariant enforcement, __eq__ and __hash__ — value equality vs identity.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Abstraction barrier:** A conceptual line separating what an object does from how it does it. This exists so that the implementation can change without breaking code that relies on the interface.\n- **Interface:** The set of methods and attributes that a class publicly exposes to the outside world. This is the contract the class promises to fulfill.\n- **Implementation:** The internal mechanisms, data structures, and private fields a class uses to deliver on its interface.\n- **Name mangling:** A Python mechanism that renames attributes prefixed with two underscores to include the class name, intended to prevent accidental access or overriding by subclasses.\n- **Invariant:** A logical condition about an object\'s state that must always be true for the object to be valid.\n- **Identity:** The specific memory location or inherent "sameness" of an object (checked via is in Python).\n- **Value equality:** The equivalence of two distinct objects based on their internal data being the same (checked via ==).',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **@property:** A built-in Python decorator for defining computed attributes.\n- **@property.setter:** A decorator linked to an existing @property to define how it handles assignment.\n- **ValueError:** A built-in exception raised when a function receives an argument of the correct type but an inappropriate value.\n- **TypeError:** A built-in exception raised when an operation is applied to an object of inappropriate type.\n- **__eq__:** The Python magic method for equality comparison.\n- **__hash__:** The Python magic method for hashing an object.\n- **isinstance:** A built-in function to check an object\'s type.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'A user instantiates `t = Temperature(100)`. This routes to `t.celsius = 100`, which invokes the `@celsius.setter` to enforce the absolute-zero invariant. The valid value is stored behind the abstraction barrier in `self._celsius`. Later, when `t.fahrenheit` is accessed, the `@property` dynamically calculates the output based on the protected state, demonstrating perfect encapsulation. Encapsulation and the abstraction barrier are two names for the same idea: separate what from how. Lesson 24 covers inheritance. Exercises: implement a `Fraction` class with `numerator` and `denominator` properties (enforcing denominator != 0 and auto-reducing), and `__add__`, `__mul__`, `__eq__`, `__str__`.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 23: Encapsulation and Data Abstraction',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Encapsulation and Data Abstraction',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The abstraction barrier — interface vs implementation',
              prose: [
                'When building complex systems, how do you prevent users of your class from relying on its internal details? What would happen if a caller relies on your class storing data as a list, and later you decide to change it to a dictionary for performance? Look at a real-world object like a car: you know how to use the steering wheel (interface), but you don\'t need to know how the steering column connects to the axle (implementation). How can we model this in code?',
                'This proves that Python allows you to read internal variables, but doing so binds your external code to the internal structure. If `Queue` changes to use a different internal data structure, the external code will break. This conceptual separation is called the **abstraction barrier**.'
              ],
              typeIt: true,
              solution: 'my_queue = Queue()\nmy_queue.enqueue("A")\n# BAD: accessing internal implementation directly\nprint(my_queue._data)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'The abstraction barrier — interface vs implementation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class Queue:` defines the blueprint.\n- `self._data = []` creates an internal list. The underscore is a convention indicating it is part of the implementation, not the interface.\n- `self._data.append(item)` modifies the internal state safely via the `enqueue` interface method.\n- `if self.is_empty():` relies on another interface method internally, promoting reuse.\n- `raise IndexError(...)` halts execution if the queue has no items.\n- `return self._data.pop(0)` removes and returns the first element, abstracting away the list operation.\n- `len(self._data) == 0` computes emptiness safely.\n- `q = Queue()` instantiates the class.\n- `q.enqueue(1)` calls the interface. The caller knows nothing about the underlying list.',
                '**Expected behavior.** ``` print(q.dequeue()) # verified by confidence: 1 print(len(q)) # verified by confidence: 2 ``` This is verified by confidence based on standard list operations.',
                '**CS lens.** This embodies **Encapsulation** and the **Abstraction Barrier**. Also recognized in: operating system file APIs, network sockets, database drivers, and opaque pointers in C.',
                '**SE lens.** The interface-implementation split is engineered to allow internal refactoring without breaking callers. The tradeoff is having to write wrapper methods (like `enqueue`) rather than letting users append to a list directly, but the maintenance benefit is that the implementation can be optimized later without user disruption.'
              ],
              typeIt: true,
              solution: '# Implementation A: list-based\nclass Queue:\n    def __init__(self):\n        self._data = []  # _data is internal -- not part of the interface\n\n    def enqueue(self, item):\n        self._data.append(item)\n\n    def dequeue(self):\n        if self.is_empty():\n            raise IndexError(\'dequeue from empty queue\')\n        return self._data.pop(0)\n\n    def is_empty(self):\n        return len(self._data) == 0\n\n    def __len__(self):\n        return len(self._data)\n\nq = Queue()\nq.enqueue(1)\nq.enqueue(2)\nq.enqueue(3)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Name mangling — _private and __mangled',
              prose: [
                'Since Python doesn\'t physically stop a user from touching `_data`, how do we prevent accidental overrides, especially in class hierarchies? What happens if a subclass accidentally declares an attribute with the exact same name as a parent class\'s internal variable?',
                'Output: ``` anyone can use this convention: internal use AttributeError("\'MyClass\' object has no attribute \'__private\'") name-mangled ``` This proves that `__private` triggers **name mangling**, renaming the attribute to `_ClassName__private`. It\'s not true privacy, but a safeguard against accidental collisions.'
              ],
              typeIt: true,
              solution: 'test_obj = MyClass()\nprint(test_obj.public)       # anyone can use this\nprint(test_obj._protected)   # works, but signals \'internal\'\ntry:\n    print(test_obj.__private)\nexcept AttributeError as e:\n    print(repr(e))\nprint(test_obj._MyClass__private)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Name mangling — _private and __mangled — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `self.public = ...` defines a standard, public attribute.\n- `self._protected = ...` defines a conventionally private attribute. Python doesn\'t enforce this, but the underscore signals it.\n- `self.__private = ...` triggers Python\'s compiler to mangle the name.\n- `test_obj.__private` raises an `AttributeError` because the attribute doesn\'t exist under that exact name.\n- `test_obj._MyClass__private` successfully accesses the mangled name, proving Python relies on obscurity/convention rather than strict memory access control.',
                '**Expected behavior.** Run output is embedded in the isolation step above, verified by confidence.',
                '**CS lens.** This is Python\'s approach to **Information Hiding**. Also recognized in: C++ `private` modifiers, JavaScript `#private` fields, Java access modifiers. Python chooses "we are all consenting adults here" over strict compiler enforcement.',
                '**SE lens.** We use name mangling primarily to avoid naming collisions in deep inheritance trees, not to enforce security. The tradeoff is slightly more confusing debugging (seeing `_MyClass__private` in object dictionaries) for the benefit of safe subclassing.'
              ],
              typeIt: true,
              solution: 'class MyClass:\n    def __init__(self):\n        self.public = \'anyone can use this\'\n        self._protected = \'convention: internal use\'\n        self.__private = \'name-mangled\'\n\nobj = MyClass()',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: '@property — computed attributes and validation',
              prose: [
                'If a caller expects a simple attribute like `t.celsius = 100`, but you realize you need to validate that it doesn\'t drop below absolute zero, how do you add validation without breaking every caller\'s code that already uses attribute assignment? What if you had to rewrite every `t.celsius = 100` to `t.set_celsius(100)` across a million-line codebase?',
                'Output: ``` 100 212.0 32.0 ``` This proves that **`@property`** and **`@property.setter`** allow method logic to run transparently when interacting with an attribute.'
              ],
              typeIt: true,
              solution: 't = Temperature(100)\nprint(t.celsius)     # Calls getter\nprint(t.fahrenheit)  # Calls getter, computes fahrenheit\nt.celsius = 0        # Calls setter\nprint(t.fahrenheit)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: '@property — computed attributes and validation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `ABSOLUTE_ZERO_CELSIUS = -273.15` defines a class-level constant.\n- `self.celsius = celsius` in `__init__` performs an assignment that triggers the setter, not a direct instance dictionary write.\n- `@property` decorates `def celsius(self):`, turning it into a getter.\n- `return self._celsius` accesses the true internal storage.\n- `@celsius.setter` decorates a second method named `celsius`, registering it to handle assignments.\n- `if value < Temperature.ABSOLUTE_ZERO_CELSIUS:` validates the input.\n- `raise ValueError(...)` rejects invalid data, maintaining the invariant.\n- `self._celsius = value` updates the internal state.\n- `@property def fahrenheit(self):` provides a computed attribute based on the single source of truth.',
                '**Expected behavior.** Run output is embedded in the isolation step, verified by confidence.',
                '**CS lens.** This is the **Uniform Access Principle**: client code shouldn\'t know whether a value is stored in memory or computed on the fly. Also recognized in: C# properties, Ruby\'s attribute accessors, JavaScript getter/setters.',
                '**SE lens.** Properties allow you to start with simple attributes and seamlessly upgrade to validated or computed methods later without breaking the API. The tradeoff is that attribute access, normally `O(1)`, might now run arbitrary `O(N)` logic, masking performance costs.'
              ],
              typeIt: true,
              solution: 'class Temperature:\n    ABSOLUTE_ZERO_CELSIUS = -273.15\n\n    def __init__(self, celsius):\n        self.celsius = celsius  # uses the setter below!\n\n    @property\n    def celsius(self):\n        return self._celsius\n\n    @celsius.setter\n    def celsius(self, value):\n        if value < Temperature.ABSOLUTE_ZERO_CELSIUS:\n            raise ValueError(\n                f\'Temperature {value} is below absolute zero\'\n            )\n        self._celsius = value\n\n    @property\n    def fahrenheit(self):\n        return self._celsius * 9/5 + 32',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Read-only properties',
              prose: [
                'How do you expose data to callers without letting them overwrite it? If a circle has a radius, its area must be synchronized. What happens if a user tries to manually set the `area` without changing the `radius`?',
                'Output: ``` 5 78.54 Caught: AttributeError("can\'t set attribute") ``` This proves that an `@property` without a corresponding `@property.setter` creates a **read-only property**.'
              ],
              typeIt: true,
              solution: 'c = Circle(5)\nprint(c.radius)\nprint(f\'{c.area:.2f}\')\ntry:\n    c.radius = 10\nexcept AttributeError as e:\n    print("Caught:", repr(e))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Read-only properties — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `if radius <= 0:` rejects invalid radii in `__init__`.\n- `self._radius = radius` stores the internal state directly since there\'s no setter.\n- `@property def radius(self):` exposes read access to `_radius`.\n- `@property def area(self):` computes the area dynamically using `math.pi`.\n- Because there is no `@radius.setter` or `@area.setter`, attempting to assign to `c.radius` or `c.area` natively raises an `AttributeError`.',
                '**Expected behavior.** Run output is embedded in the isolation step, verified by confidence.',
                '**CS lens.** This is **Immutability at the API Boundary**. Also recognized in: functional programming languages, database views.',
                '**SE lens.** Read-only properties guarantee that callers cannot create an inconsistent state (like changing area without changing radius). The tradeoff is that the client cannot update the object easily; they must either construct a new object or use explicit update methods if provided.'
              ],
              typeIt: true,
              solution: 'class Circle:\n    def __init__(self, radius):\n        if radius <= 0:\n            raise ValueError(\'Radius must be positive\')\n        self._radius = radius\n\n    @property\n    def radius(self):\n        return self._radius\n\n    @property\n    def area(self):\n        import math\n        return math.pi * self._radius ** 2\n\n    @property\n    def circumference(self):\n        import math\n        return 2 * math.pi * self._radius',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Invariant enforcement',
              prose: [
                'If a bank account must never have a negative balance, checking for negative values inside every single method (`deposit`, `withdraw`, `transfer`) duplicates code. How do we centralize this logic? What happens if someone bypasses `deposit` and sets the balance directly?',
                'Output: ``` 150.0 ValueError(\'Balance cannot be negative\') ``` This proves the **invariant** is maintained automatically on every assignment.'
              ],
              typeIt: true,
              solution: 'account = BankAccount(\'Alice\', 100)\naccount.deposit(50)\nprint(account.balance)\ntry:\n    account.balance = -10\nexcept ValueError as e:\n    print(repr(e))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Invariant enforcement — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `self.balance = balance` in `__init__` leverages the setter right from the start to validate initial state.\n- `if not isinstance(value, (int, float)):` uses the `isinstance` built-in to prevent non-numeric assignment.\n- `if value < 0:` enforces the non-negative business rule.\n- `self._balance = float(value)` normalizes valid inputs.\n- `self.balance += amount` in `deposit` reads the property, adds to it, and assigns it back, silently running through the setter.\n- `if amount > self.balance:` in `withdraw` implements specific transactional logic, while the setter independently guarantees the final state.',
                '**Expected behavior.** Run output is embedded in the isolation step, verified by confidence.',
                '**CS lens.** This embodies **Design by Contract** and **Invariant Enforcement**. Also recognized in: database constraints, state machines, formal verification systems.',
                '**SE lens.** Enforcing invariants in one central choke point (the setter) eliminates duplicate validation logic across methods. The tradeoff is that the setter must cover all possible ways the state can be invalidated, and you must remember to route internal updates through the property rather than writing to `_balance` directly.'
              ],
              typeIt: true,
              solution: 'class BankAccount:\n    def __init__(self, owner, balance=0):\n        self._owner = owner\n        self.balance = balance  # uses setter\n\n    @property\n    def owner(self):\n        return self._owner  # read-only: owner can\'t change\n\n    @property\n    def balance(self):\n        return self._balance\n\n    @balance.setter\n    def balance(self, value):\n        if not isinstance(value, (int, float)):\n            raise TypeError(\'Balance must be numeric\')\n        if value < 0:\n            raise ValueError(\'Balance cannot be negative\')\n        self._balance = float(value)\n\n    def deposit(self, amount):\n        if amount <= 0:\n            raise ValueError(\'Deposit amount must be positive\')\n        self.balance += amount\n\n    def withdraw(self, amount):\n        if amount <= 0:\n            raise ValueError(\'Withdrawal amount must be positive\')\n        if amount > self.balance:\n            raise ValueError(\'Insufficient funds\')\n        self.balance -= amount',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 11,
              cellTitle: '__eq__ and __hash__ — value equality vs identity',
              prose: [
                'If you create two identical Point objects, Python says they are not equal. How do we tell Python to compare their contents instead of their memory addresses? What happens if you try to use one of those objects as a dictionary key?',
                'Output: ``` True False False 1 ``` This proves that `__eq__` enables **value equality** (`==`), while `is` remains strictly for **identity** (memory address). Defining `__hash__` correctly deduplicates them in a set.'
              ],
              typeIt: true,
              solution: 'p1 = Point(1, 2)\np2 = Point(1, 2)\np3 = Point(3, 4)\n\nprint(p1 == p2)\nprint(p1 is p2)\nprint(p1 == p3)\nprint(len({p1, p2}))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 12,
              cellTitle: '__eq__ and __hash__ — value equality vs identity — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def __eq__(self, other):` intercepts the `==` operator.\n- `if not isinstance(other, Point):` checks if the incoming object is comparable.\n- `return NotImplemented` tells Python to let the other object try its own comparison, gracefully handling type mismatches.\n- `return self.x == other.x and self.y == other.y` compares the actual state, returning True if the values match.\n- `def __hash__(self):` intercepts requests for a hash code from sets or dicts.\n- `return hash((self.x, self.y))` computes a stable hash from a tuple of the fields, guaranteeing that objects with `__eq__` == True will yield the same hash code.',
                '**Expected behavior.** Run output is embedded in the isolation step, verified by confidence.',
                '**CS lens.** This differentiates **Identity vs. Value Equality**. Also recognized in: Java\'s `.equals()` vs `==`, C#\'s `Equals` vs ReferenceEquals, database primary keys vs exact record matching.',
                '**SE lens.** Custom equality allows objects to be used intuitively in tests, sets, and mappings. The tradeoff is the strict contract: if you implement `__eq__`, you *must* implement `__hash__` symmetrically, or the object will break unpredictably when used in hash-based collections.'
              ],
              typeIt: true,
              solution: 'class Point:\n    def __init__(self, x, y):\n        self.x = x\n        self.y = y\n\n    def __eq__(self, other):\n        if not isinstance(other, Point):\n            return NotImplemented\n        return self.x == other.x and self.y == other.y\n\n    def __hash__(self):\n        return hash((self.x, self.y))',
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
      'Next lesson: Inheritance.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Implementation"?',
      options: [
        'The internal mechanisms, data structures, and private fields a class uses to deliver on its interface.',
        'A Python mechanism that renames attributes prefixed with two underscores to include the class name, intended to prevent accidental access or overriding by subclasses.',
        'A conceptual line separating what an object does from how it does it. This exists so that the implementation can change without breaking code that relies on the interface.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Interface"?',
      options: [
        'The set of methods and attributes that a class publicly exposes to the outside world. This is the contract the class promises to fulfill.',
        'The equivalence of two distinct objects based on their internal data being the same (checked via ==).',
        'A Python mechanism that renames attributes prefixed with two underscores to include the class name, intended to prevent accidental access or overriding by subclasses.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Abstraction barrier"?',
      options: [
        'A Python mechanism that renames attributes prefixed with two underscores to include the class name, intended to prevent accidental access or overriding by subclasses.',
        'A logical condition about an object\'s state that must always be true for the object to be valid.',
        'A conceptual line separating what an object does from how it does it. This exists so that the implementation can change without breaking code that relies on the interface.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Invariant"?',
      options: [
        'A Python mechanism that renames attributes prefixed with two underscores to include the class name, intended to prevent accidental access or overriding by subclasses.',
        'A logical condition about an object\'s state that must always be true for the object to be valid.',
        'A conceptual line separating what an object does from how it does it. This exists so that the implementation can change without breaking code that relies on the interface.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Abstraction barrier** — A conceptual line separating what an object does from how it does it. This exists so that the implementation can change without breaking code that relies on the interface.',
    '**Interface** — The set of methods and attributes that a class publicly exposes to the outside world. This is the contract the class promises to fulfill.',
    '**Implementation** — The internal mechanisms, data structures, and private fields a class uses to deliver on its interface.',
    '**Name mangling** — A Python mechanism that renames attributes prefixed with two underscores to include the class name, intended to prevent accidental access or overriding by subclasses.',
    '**Invariant** — A logical condition about an object\'s state that must always be true for the object to be valid.',
    '**Identity** — The specific memory location or inherent "sameness" of an object (checked via is in Python).',
    '**Value equality** — The equivalence of two distinct objects based on their internal data being the same (checked via ==).',
  ],

  checkpoints: ['read-intuition'],
}
