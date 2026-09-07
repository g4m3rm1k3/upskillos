// Guttag — Lesson 24: Inheritance
// Auto-converted from src/docs/tutorials/guttag-python/lesson-24.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-24-inheritance',
  slug: 'inheritance',
  chapter: 4,
  order: 3,
  title: 'Inheritance',
  subtitle: 'class Child(Parent)',
  tags: ['inheritance', 'subclass-child', 'superclass-parent', 'override', 'multiple-inheritance', 'mro-method-resolution-order'],

  hook: {
    question: 'What is "Inheritance", and why does it matter?',
    realWorldContext: 'The reader understands inheritance: a subclass inherits all attributes and methods of its parent, can override them, can call the parent\'s version with super(), and can add new attributes and methods. The transferable insight: inheritance models the IS-A relationship. A SavingsAccount IS-A BankAccount. Use inheritance when the subclass really is a specialization of the parent, not just when code sharing is convenient.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Basic inheritance and method resolution, super() — calling the parent, Method resolution order (MRO), Abstract base classes and the IS-A contract, Composition vs. inheritance — knowing when NOT to inherit.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Inheritance:** The mechanism by which one class acquires the properties and methods of another. It solves the problem of redefining shared behavior across related types.\n- **Subclass (Child):** A class derived from another class. It solves the problem of specializing existing behavior.\n- **Superclass (Parent):** A class from which another class inherits. It solves the problem of defining a common contract and shared implementation.\n- **Override:** Providing a new implementation for an inherited method. It solves the problem of adapting inherited behavior to the specific needs of the subclass.\n- **Multiple inheritance:** A class inheriting from more than one parent class. It allows combining behaviors from disparate base classes.\n- **MRO (Method Resolution Order):** The predictable, deterministic order in which Python searches for inherited methods. It solves the problem of ambiguity in multiple inheritance (the diamond problem).\n- **Abstract base class:** A class that cannot be instantiated and defines an interface for subclasses. It solves the problem of enforcing an IS-A contract.\n- **Composition:** A design approach where a class contains instances of other classes (HAS-A). It solves the problem of code reuse without the tight coupling and inappropriate interface exposure of inheritance.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **super():** A built-in Python function that returns a proxy object delegating method calls to a parent or sibling class.\n- **type():** A built-in function that returns the type of an object.\n- **isinstance():** A built-in function to check an object\'s type against a class or tuple of classes.\n- **ABC:** A helper class that has ABCMeta as its metaclass.\n- **@abstractmethod:** A decorator indicating abstract methods.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Trace `SavingsAccount(\'Alice\', 1000)` through all concept units: when initialized, it honors the inheritance chain by calling `super().__init__(\'Alice\', 1000)` to execute `BankAccount`\'s initialization logic. When calling `acc.deposit(500)`, the method is inherited directly from `BankAccount` due to the MRO lookup order. When we print the account, the overridden `__repr__` provides the specialized output rather than the parent\'s default. Finally, because `SavingsAccount` inherently IS-A `BankAccount`, it upholds the substitution principle without inappropriately exposing unrelated functionality like composition would seek to prevent.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 24: Inheritance',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Inheritance',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Basic inheritance and method resolution',
              prose: [
                'We have several types of animals that share properties like a name and the ability to make a sound, but the exact sound differs. How do we avoid duplicating the initialization of the name across every single animal class? If we define a common base, how do we specify that a dog says "Woof" while a cat says "Meow"?',
                'Predicted confidently: ``` Rex says Woof! Whiskers says Meow! Generic makes a sound True True False ``` This demonstrates **inheritance** and **override**. The subclasses `Dog` and `Cat` acquire the `__init__` and `__repr__` methods from `Animal`, while providing their own custom `speak` methods. It proves that a `Dog` IS-A `Animal`.'
              ],
              typeIt: true,
              solution: 'class Animal:\n    def __init__(self, name):\n        self.name = name\n\n    def speak(self):\n        return f\'{self.name} makes a sound\'\n\n    def __repr__(self):\n        return f\'{type(self).__name__}({self.name!r})\'\n\nclass Dog(Animal):      # Dog inherits from Animal\n    def speak(self):    # override speak\n        return f\'{self.name} says Woof!\'\n\nclass Cat(Animal):\n    def speak(self):\n        return f\'{self.name} says Meow!\'\n\nd = Dog(\'Rex\')\nc = Cat(\'Whiskers\')\na = Animal(\'Generic\')\n\nprint(d.speak())   \nprint(c.speak())   \nprint(a.speak())   \nprint(isinstance(d, Animal))  \nprint(isinstance(d, Dog))     \nprint(isinstance(a, Dog))     ',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Basic inheritance and method resolution — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class Dog(Animal):` declares a new class `Dog` that inherits from the parent class `Animal`.\n- `def speak(self):` defines a method on `Dog` with the exact same name and signature as a method on `Animal`, performing an **override**.\n- `return f\'{self.name} says Woof!\'` constructs and returns a string using the `name` attribute initialized by the inherited `__init__`.',
                '**Expected behavior.** Predicted confidently: `Rex says Woof!` when `Dog(\'Rex\').speak()` is called.',
                '**CS lens.** The concept here is **polymorphism** via subtype inheritance. Real-world examples include UI frameworks where `Button` and `TextField` inherit from `Widget`, game engines where `Player` and `Enemy` inherit from `GameObject`, and database drivers where `PostgresDriver` and `SqliteDriver` inherit from `DbDriver`.',
                '**SE lens.** Design Principle: The Open-Closed Principle (OCP). `Animal` is closed for modification (we didn\'t change it) but open for extension (we added `Dog` and `Cat`). Alternative NOT chosen: A single `Animal` class with a large `if type == "dog"` statement. Tradeoff: The inheritance approach separates concerns into cohesive classes but scatters the code for "all animals" across multiple files or blocks.'
              ],
              typeIt: true,
              solution: 'class Dog(Animal):\n    def speak(self):\n        return f\'{self.name} says Woof!\'',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'super() — calling the parent',
              prose: [
                'When a subclass defines its own `__init__` method, it completely overrides the parent\'s `__init__`. How do we initialize the parent\'s attributes without duplicating the assignment code? How do we say "do what the parent does, and then do my extra stuff"?',
                'Predicted confidently: ``` SavingsAccount(\'Alice\', 1000, rate=0.03) Interest: 45.00 1545.0 ``` This demonstrates the use of **super()** to delegate initialization to the parent class, ensuring `BankAccount` correctly configures `owner` and `balance` before `SavingsAccount` sets its own `rate`. It proves that we can extend, rather than replace, inherited behavior.'
              ],
              typeIt: true,
              solution: 'class BankAccount:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self.balance = balance\n\n    def deposit(self, amount):\n        self.balance += amount\n\n    def __repr__(self):\n        return f\'BankAccount({self.owner!r}, {self.balance})\'\n\nclass SavingsAccount(BankAccount):\n    def __init__(self, owner, balance=0, rate=0.05):\n        super().__init__(owner, balance)  # call parent __init__\n        self.rate = rate                  # add new attribute\n\n    def add_interest(self):\n        interest = self.balance * self.rate\n        self.deposit(interest)            # inherited method\n        return interest\n\n    def __repr__(self):\n        return f\'SavingsAccount({self.owner!r}, {self.balance}, rate={self.rate})\'\n\nacc = SavingsAccount(\'Alice\', 1000, rate=0.03)\nprint(acc)\nacc.deposit(500)\ninterest = acc.add_interest()\nprint(f\'Interest: {interest:.2f}\')\nprint(acc.balance)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'super() — calling the parent — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class SavingsAccount(BankAccount):` declares inheritance.\n- `def __init__(self, owner, balance=0, rate=0.05):` overrides the constructor to accept a new `rate` parameter.\n- `super()` calls the built-in function to obtain a proxy object representing the parent class.\n- `.__init__(owner, balance)` invokes the parent\'s `__init__` method, passing the required arguments.\n- `self.rate = rate` assigns the subclass-specific attribute.',
                '**Expected behavior.** Predicted confidently: Calling `acc.deposit(500)` correctly updates `acc.balance` because the parent\'s state was initialized properly.',
                '**CS lens.** The concept here is **Delegation**. Real-world examples include event bubbling in the DOM, middleware chains in web servers, and virtual method dispatch in language runtimes.',
                '**SE lens.** Design Principle: DRY (Don\'t Repeat Yourself). Alternative NOT chosen: Manually writing `self.owner = owner` and `self.balance = balance` inside `SavingsAccount`. Tradeoff: If the parent class initialization changes (e.g., adding a transaction history list), the subclass would break if it didn\'t use `super()`.'
              ],
              typeIt: true,
              solution: 'class SavingsAccount(BankAccount):\n    def __init__(self, owner, balance=0, rate=0.05):\n        super().__init__(owner, balance)\n        self.rate = rate',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Method resolution order (MRO)',
              prose: [
                'If a class inherits from two different parent classes, and both parent classes define a method with the same name, which one does the subclass call? How does Python resolve this ambiguity?',
                'Predicted confidently: ``` [<class \'__main__.D\'>, <class \'__main__.B\'>, <class \'__main__.C\'>, <class \'__main__.A\'>, <class \'object\'>] B True ``` This demonstrates the **Method Resolution Order (MRO)** and **Multiple inheritance**. The `mro()` method proves that Python searches `D`, then `B`, then `C`, then `A`, ensuring a deterministic path through the inheritance graph.'
              ],
              typeIt: true,
              solution: 'class A:\n    def method(self):\n        return \'A\'\n\nclass B(A):\n    def method(self):\n        return \'B\'\n\nclass C(A):\n    def method(self):\n        return \'C\'\n\nclass D(B, C):  # multiple inheritance\n    pass\n\nprint(D.mro())\n\nd = D()\nprint(d.method())\nprint(isinstance(d, object))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Method resolution order (MRO) — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class D(B, C):` uses multiple inheritance, specifying two parent classes.\n- `pass` is a null statement indicating the class has no methods or attributes of its own.\n- `D.mro()` is a class method that returns a list representing the class search path.\n- `d.method()` triggers the search: Python checks `D.__dict__` (no), `B.__dict__` (yes), and invokes it, returning `\'B\'`.',
                '**Expected behavior.** Predicted confidently: `d.method()` outputs `\'B\'`.',
                '**CS lens.** The concept here is **Linearization of partial orders**. Real-world examples include dependency resolution in package managers (like npm or pip), topological sorting in build systems (Make), and conflict resolution in distributed systems.',
                '**SE lens.** Design Principle: Predictability in resolution logic. Alternative NOT chosen: Depth-first search without deduplication (which could check `A` before `C`). Tradeoff: Python\'s C3 linearization prevents a base class (`A`) from overriding a more specific class (`C`), but makes the rules harder to compute in your head for very complex hierarchies.'
              ],
              typeIt: true,
              solution: 'class D(B, C):\n    pass',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Abstract base classes and the IS-A contract',
              prose: [
                'How do we create a base class that defines an interface (like `area()` and `perimeter()`) but isn\'t meant to be instantiated itself? How do we force subclasses to actually implement these methods, producing an error if they forget?',
                'Predicted confidently: ``` 78.53981633974483 Circle: area=78.54 ``` This demonstrates the use of an **Abstract base class (ABC)**. It proves that `Shape` cannot be instantiated directly and that `Circle` must implement both abstract methods to be considered a concrete class.'
              ],
              typeIt: true,
              solution: 'from abc import ABC, abstractmethod\n\nclass Shape(ABC):\n    @abstractmethod\n    def area(self):\n        pass\n\n    @abstractmethod\n    def perimeter(self):\n        pass\n\n    def describe(self):\n        return f\'{type(self).__name__}: area={self.area():.2f}\'\n\nclass Circle(Shape):\n    def __init__(self, radius):\n        self.radius = radius\n\n    def area(self):\n        import math\n        return math.pi * self.radius ** 2\n\n    def perimeter(self):\n        import math\n        return 2 * math.pi * self.radius\n\nc = Circle(5)\nprint(c.area())\nprint(c.describe())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Abstract base classes and the IS-A contract — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `from abc import ABC, abstractmethod` imports the base class and decorator required for abstract classes.\n- `class Shape(ABC):` declares that `Shape` is an abstract base class.\n- `@abstractmethod` decorates the `area` method.\n- `def area(self):` defines the method signature.\n- `pass` provides an empty body, as the subclass will provide the implementation.',
                '**Expected behavior.** Predicted confidently: Attempting `Shape()` will raise a `TypeError: can\'t instantiate abstract class`.',
                '**CS lens.** The concept here is **Interfaces / Contracts**. Real-world examples include network protocols (TCP requires ACK), plugin systems (plugins must expose an `init()` method), and hardware drivers (an OS expects `read()` and `write()` syscalls).',
                '**SE lens.** Design Principle: Liskov Substitution Principle (LSP). We should be able to treat any `Circle` strictly as a `Shape`. Alternative NOT chosen: Simply raising `NotImplementedError` inside the base class method. Tradeoff: The `@abstractmethod` approach catches the error at instantiation time, whereas raising an error only fails at runtime when the specific method is called.'
              ],
              typeIt: true,
              solution: 'class Shape(ABC):\n    @abstractmethod\n    def area(self):\n        pass',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Composition vs. inheritance — knowing when NOT to inherit',
              prose: [
                'If a `Stack` relies on a list internally to store elements, should `Stack` inherit from `list`? If it does, a user can call `stack.sort()` or `stack[0]`, breaking the rules of a stack (LIFO). How do we reuse `list`\'s logic without exposing all of its methods?',
                'Predicted confidently: ``` 3 2 2 ``` This demonstrates **Composition**. By wrapping a list rather than inheriting from it, `Stack` restricts its public API strictly to stack operations (push, pop, peek), proving that "HAS-A" is safer than "IS-A" when building domain abstractions.'
              ],
              typeIt: true,
              solution: '# BAD inheritance: Stack IS-A list? No. Stack USES a list.\nclass BadStack(list):     \n    def push(self, item): \n        self.append(item)\n\n# GOOD composition: Stack HAS-A list internally\nclass Stack:\n    def __init__(self):\n        self._items = []    \n\n    def push(self, item):\n        self._items.append(item)\n\n    def pop(self):\n        if not self._items:\n            raise IndexError(\'pop from empty stack\')\n        return self._items.pop()\n\n    def peek(self):\n        return self._items[-1]\n\n    def __len__(self):\n        return len(self._items)\n\ns = Stack()\ns.push(1); s.push(2); s.push(3)\nprint(s.pop())\nprint(s.peek())\nprint(len(s))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Composition vs. inheritance — knowing when NOT to inherit — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class Stack:` defines a generic base class (inheriting implicitly from `object`).\n- `def __init__(self):` is the constructor.\n- `self._items = []` initializes a private list attribute representing the internal state (composition).\n- `def push(self, item):` provides the safe, restricted public method.\n- `self._items.append(item)` delegates the actual work to the internal list.',
                '**Expected behavior.** Predicted confidently: A user cannot perform `s[0]` on the `Stack` class; it will raise a `TypeError` because `__getitem__` is not exposed.',
                '**CS lens.** The concept here is **Encapsulation** and **Adapter Pattern**. Real-world examples include wrapping a raw socket connection inside an `HttpClient`, building a set data structure using an underlying hash map, and abstracting a file system handle behind a `Logger` class.',
                '**SE lens.** Design Principle: Favor Composition over Inheritance. Alternative NOT chosen: Inheriting from `list` (the `BadStack` example). Tradeoff: Inheritance makes the implementation very short, but leaks the underlying implementation details (like `.index()` and `__setitem__`) to the caller, violating the domain contract.'
              ],
              typeIt: true,
              solution: 'class Stack:\n    def __init__(self):\n        self._items = []',
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
      'Next lesson: Special Methods.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Superclass (Parent)"?',
      options: [
        'A class from which another class inherits. It solves the problem of defining a common contract and shared implementation.',
        'The predictable, deterministic order in which Python searches for inherited methods. It solves the problem of ambiguity in multiple inheritance (the diamond problem).',
        'A class inheriting from more than one parent class. It allows combining behaviors from disparate base classes.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "MRO (Method Resolution Order)"?',
      options: [
        'Providing a new implementation for an inherited method. It solves the problem of adapting inherited behavior to the specific needs of the subclass.',
        'The predictable, deterministic order in which Python searches for inherited methods. It solves the problem of ambiguity in multiple inheritance (the diamond problem).',
        'The mechanism by which one class acquires the properties and methods of another. It solves the problem of redefining shared behavior across related types.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Subclass (Child)"?',
      options: [
        'A class inheriting from more than one parent class. It allows combining behaviors from disparate base classes.',
        'A design approach where a class contains instances of other classes (HAS-A). It solves the problem of code reuse without the tight coupling and inappropriate interface exposure of inheritance.',
        'A class derived from another class. It solves the problem of specializing existing behavior.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Multiple inheritance"?',
      options: [
        'A class inheriting from more than one parent class. It allows combining behaviors from disparate base classes.',
        'Providing a new implementation for an inherited method. It solves the problem of adapting inherited behavior to the specific needs of the subclass.',
        'A class derived from another class. It solves the problem of specializing existing behavior.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Inheritance** — The mechanism by which one class acquires the properties and methods of another. It solves the problem of redefining shared behavior across related types.',
    '**Subclass (Child)** — A class derived from another class. It solves the problem of specializing existing behavior.',
    '**Superclass (Parent)** — A class from which another class inherits. It solves the problem of defining a common contract and shared implementation.',
    '**Override** — Providing a new implementation for an inherited method. It solves the problem of adapting inherited behavior to the specific needs of the subclass.',
    '**Multiple inheritance** — A class inheriting from more than one parent class. It allows combining behaviors from disparate base classes.',
    '**MRO (Method Resolution Order)** — The predictable, deterministic order in which Python searches for inherited methods. It solves the problem of ambiguity in multiple inheritance (the diamond problem).',
    '**Abstract base class** — A class that cannot be instantiated and defines an interface for subclasses. It solves the problem of enforcing an IS-A contract.',
    '**Composition** — A design approach where a class contains instances of other classes (HAS-A). It solves the problem of code reuse without the tight coupling and inappropriate interface exposure of inheritance.',
  ],

  checkpoints: ['read-intuition'],
}
