// Guttag — Lesson 22: Classes
// Auto-converted from src/docs/tutorials/guttag-python/lesson-22.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-22-classes',
  slug: 'classes',
  chapter: 4,
  order: 1,
  title: 'Classes',
  subtitle: 'class, __init__, and self',
  tags: ['class', 'instance', 'method', 'instance-variable', 'class-variable', 'fluent-interface'],

  hook: {
    question: 'What is "Classes", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 7 core ideas: Defining a class and creating an instance, Instance variables and methods, __str__ and __repr__, Class variables vs instance variables, Methods that return new objects, The transaction history — using a list as an instance variable, Class methods and static methods.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Class:** a blueprint for creating objects, defining their initial state and behavior. It exists so we can create many independent objects of the same type without duplicating code.\n- **Instance:** a concrete object created from a class blueprint. It exists because blueprints alone don\'t hold data; instances hold actual, separate state in memory.\n- **Method:** a function defined inside a class that operates on instances of that class. It exists to bundle behavior with the data it manipulates.\n- **Instance variable:** a variable bound to a specific instance (self.name). It exists to hold state unique to one object.\n- **Class variable:** a variable bound to the class itself, shared by all instances. It exists to hold state or configuration common to the entire type.\n- **Fluent interface:** a design pattern where methods return self to allow chaining (obj.a().b()). It exists to make sequential operations read cleanly.\n- **Mutable default argument:** a default parameter that can change (like an empty list). It exists as a Python mechanism but is a trap in __init__, because all instances would share the same list.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **BankAccount:** The main class we are building to represent an individual\'s bank account.\n- **__init__:** The initialization method called automatically when a new instance is created.\n- **type:** A built-in function that returns the type of an object.\n- **isinstance:** A built-in function that checks if an object is an instance of a class.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Creating a `BankAccount` initializes state and a list; calling `deposit` mutates that state and appends to the list; calling `statement` reads that list to output history; all while `BankAccount.account_count` ticked up silently in the background. Classes are the foundation of OOP in Python. Lesson 23 covers encapsulation — hiding implementation details and exposing a clean interface.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 22: Classes',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Classes',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Defining a class and creating an instance',
              prose: [
                'We need a way to group related data (like an owner name and balance) and behavior (like depositing). Dictionaries hold data but can\'t ensure structure or attach behaviors. How would you currently group an owner and a balance so you can pass them around together? What happens if you try to add a function that only works on that specific group?',
                'Output: ``` Fido German Shepherd <class \'__main__.Dog\'> True ``` This output proves that `fido` and `rex` are independent objects of a new type called **Dog**, and they hold their own separate data.'
              ],
              typeIt: true,
              solution: 'class Dog:\n    def __init__(self, name, breed):\n        self.name = name\n        self.breed = breed\n\nfido = Dog(\'Fido\', \'Labrador\')\nrex  = Dog(\'Rex\', \'German Shepherd\')\n\nprint(fido.name)\nprint(rex.breed)\nprint(type(fido))\nprint(isinstance(fido, Dog))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Defining a class and creating an instance — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class BankAccount:` declares a new type blueprint named BankAccount.\n- `def __init__(self, owner, balance=0):` defines the initialization method. `self` is a convention (not a keyword) for the first parameter — it refers to the instance being initialized or operated on.\n- `self.owner = owner` attaches the `owner` argument to the specific instance (`self`) as an instance variable.\n- `self.balance = balance` attaches the `balance` argument to the instance.',
                '**Expected behavior.** ```python account = BankAccount(\'Alice\', 100) print(account.owner) ``` Output: ``` Alice ```',
                '**CS lens.** Also recognized in: C++ classes, Java blueprints, database schemas, struct definitions.',
                '**SE lens.** Objects encapsulate state. The alternative was keeping separate variables or dictionaries for every account and hoping we don\'t misspell a key. The cost is a slightly heavier syntax upfront, but the tradeoff is guaranteed structure and behavior bundling.'
              ],
              typeIt: true,
              solution: 'class BankAccount:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self.balance = balance',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Instance variables and methods',
              prose: [
                'An account needs to process deposits and withdrawals. Where do we put the logic that modifies the balance so that it belongs to the account? If you wrote a free-floating `def deposit(account, amount):` function, how would you ensure someone doesn\'t accidentally change `account[\'balance\']` directly?',
                'Output: ``` 1 ``` This proves that a **method** (`increment`) can read and modify the instance\'s own state (`self.count`).'
              ],
              typeIt: true,
              solution: 'class Counter:\n    def __init__(self):\n        self.count = 0\n    def increment(self):\n        self.count += 1\n\nc = Counter()\nc.increment()\nprint(c.count)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Instance variables and methods — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def deposit(self, amount):` defines an instance method.\n- `self.balance += amount` modifies `account.balance` when Python translates `account.deposit(50)` to `BankAccount.deposit(account, 50)`. Inside `deposit`, `self` IS `account`.\n- `return self.balance` returns the updated state.\n- `def withdraw(self, amount):` defines another method.\n- `if amount > self.balance:` checks the instance\'s state to enforce business rules.\n- `raise ValueError(...)` rejects invalid operations.\n- `self.balance -= amount` performs the modification.',
                '**Expected behavior.** ```python account = BankAccount(\'Alice\', 100) print(account.deposit(50)) print(account.withdraw(30)) print(account.balance) ``` Output: ``` 150 120 120 ```',
                '**CS lens.** Also recognized in: message passing in Smalltalk, actor models, finite state machine transitions.',
                '**SE lens.** Methods enforce invariants. The alternative is letting outside code do `account.balance -= amount`, which can bypass the `Insufficient funds` check. Putting the logic inside the class protects the data.'
              ],
              typeIt: true,
              solution: '    def deposit(self, amount):\n        self.balance += amount\n        return self.balance\n\n    def withdraw(self, amount):\n        if amount > self.balance:\n            raise ValueError(\'Insufficient funds\')\n        self.balance -= amount\n        return self.balance',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: '__str__ and __repr__',
              prose: [
                'When you print an object, Python outputs something like `<__main__.BankAccount object at 0x10a2b3c40>`. How do we make objects print their actual data meaningfully? What happens if you try to `print(account)` right now? What would you ideally want it to say?',
                'Output: ``` (1, 2) Point(1, 2) ``` This proves that **dunder methods** `__str__` and `__repr__` control how objects are converted to strings.'
              ],
              typeIt: true,
              solution: 'class Point:\n    def __init__(self, x, y):\n        self.x, self.y = x, y\n    def __str__(self):\n        return f"({self.x}, {self.y})"\n    def __repr__(self):\n        return f"Point({self.x}, {self.y})"\n\np = Point(1, 2)\nprint(p)\nprint(repr(p))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: '__str__ and __repr__ — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def __repr__(self):` defines the developer-readable representation — used by `repr()`, in lists, in the REPL. Rule: `__repr__` should ideally be valid Python that recreates the object.\n- `return f\'BankAccount(owner={self.owner!r}, balance={self.balance})\'` formats the string. `!r` ensures strings are quoted.\n- `def __str__(self):` defines the human-readable representation — used by `print()` and `str()`.\n- `return f"Account[{self.owner}]: ${self.balance:.2f}"` provides a nice summary.',
                '**Expected behavior.** ```python account = BankAccount(\'Alice\', 100) print(account) print(repr(account)) accounts = [account] print(accounts) ``` Output: ``` Account[Alice]: $100.00 BankAccount(owner=\'Alice\', balance=100) [BankAccount(owner=\'Alice\', balance=100)] ```',
                '**CS lens.** Also recognized in: `toString()` in Java, `ToString()` in C#, serialization formats.',
                '**SE lens.** Separation of concerns for output. The alternative is one representation for everything, meaning logs get messy user-facing strings or users see raw code structures.'
              ],
              typeIt: true,
              solution: '    def __repr__(self):\n        return f\'BankAccount(owner={self.owner!r}, balance={self.balance})\'\n\n    def __str__(self):\n        return f"Account[{self.owner}]: ${self.balance:.2f}"',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Class variables vs instance variables',
              prose: [
                'What if all accounts share the same interest rate, and we want to update it for everyone at once? Storing `self.interest_rate = 0.02` on every instance means updating it requires looping through every account in existence. If you need a single configuration value shared across a thousand objects, where would you store it so they all see it simultaneously?',
                'Output: ``` dark dark light light ``` This proves that a **class variable** is shared by all instances, and changing it on the class affects all instances immediately.'
              ],
              typeIt: true,
              solution: 'class Settings:\n    theme = "dark"\n    \ns1 = Settings()\ns2 = Settings()\nprint(s1.theme, s2.theme)\nSettings.theme = "light"\nprint(s1.theme, s2.theme)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Class variables vs instance variables — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `interest_rate = 0.02` defines a class variable at the class level, shared by all instances.\n- `account_count = 0` defines another class variable.\n- `BankAccount.account_count += 1` increments the class variable inside `__init__` each time a new instance is created.\n- `def apply_interest(self):` defines a new method.\n- `self.balance *= (1 + BankAccount.interest_rate)` calculates interest using the class variable. Accessing a name on an instance first checks the instance\'s `__dict__`, then the class\'s `__dict__`.',
                '**Expected behavior.** ```python a1 = BankAccount(\'Alice\', 1000) a2 = BankAccount(\'Bob\', 500) print(BankAccount.account_count) print(a1.interest_rate) BankAccount.interest_rate = 0.03 print(a1.interest_rate) print(a2.interest_rate) ``` Output: ``` 2 0.02 0.03 0.03 ```',
                '**CS lens.** Also recognized in: `static` fields in Java/C++, global application state, shared memory segments.',
                '**SE lens.** Memory efficiency and single source of truth. The alternative is instance variables, duplicating `0.02` in memory for every object and risking them getting out of sync.'
              ],
              typeIt: true,
              solution: '    interest_rate = 0.02\n    account_count = 0\n\n    # Inside __init__:\n    # BankAccount.account_count += 1\n\n    def apply_interest(self):\n        self.balance *= (1 + BankAccount.interest_rate)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Methods that return new objects',
              prose: [
                'To transfer money between accounts, you need to withdraw from one and deposit into another. How do you allow chaining operations cleanly so you can write things like `account.transfer_to(bob, 50).apply_interest()`? If a method modifies the object but doesn\'t return anything, what happens when you try to chain another method call right after it?',
                'Output: ``` Hello World ``` This proves that returning `self` creates a **fluent interface**, allowing method chaining.'
              ],
              typeIt: true,
              solution: 'class TextBuilder:\n    def __init__(self, text=""):\n        self.text = text\n    def append(self, t):\n        self.text += t\n        return self\n\nb = TextBuilder()\nb.append("Hello").append(" World")\nprint(b.text)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Methods that return new objects — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def transfer_to(self, other, amount):` takes another `BankAccount` object as an argument. This is how objects collaborate.\n- `self.withdraw(amount)` calls the instance\'s own method.\n- `other.deposit(amount)` calls the collaborating object\'s method.\n- `return self` returns the current instance, enabling method chaining (fluent interface).',
                '**Expected behavior.** ```python alice = BankAccount(\'Alice\', 500) bob = BankAccount(\'Bob\', 100) alice.transfer_to(bob, 200) print(alice.balance) print(bob.balance) ``` Output: ``` 300 300 ```',
                '**CS lens.** Also recognized in: Monadic binds, jQuery API design, Builder patterns in Java.',
                '**SE lens.** Object collaboration and ergonomics. The alternative is writing freestanding functions to orchestrate interactions. Returning `self` is a convenience that makes complex sequences highly readable.'
              ],
              typeIt: true,
              solution: '    def transfer_to(self, other, amount):\n        self.withdraw(amount)\n        other.deposit(amount)\n        return self',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 11,
              cellTitle: 'The transaction history — using a list as an instance variable',
              prose: [
                'An account\'s balance isn\'t enough; we need an audit trail of every deposit and withdrawal. How do we store a growing list of actions on the object itself? Why shouldn\'t you define the history list as a default argument like `def __init__(self, owner, balance=0, history=[]):`?',
                'Output: ``` [\'A\'] [] ``` This proves that assigning a fresh list inside `__init__` gives every instance its own separate list.'
              ],
              typeIt: true,
              solution: 'class Logger:\n    def __init__(self):\n        self.logs = []\n    def log(self, msg):\n        self.logs.append(msg)\n\nl1 = Logger()\nl2 = Logger()\nl1.log("A")\nprint(l1.logs)\nprint(l2.logs)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 12,
              cellTitle: 'The transaction history — using a list as an instance variable — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `self.history = []` is initialized as an empty list in `__init__` — each instance gets its own list. Warning: never use a mutable default argument (`def __init__(self, history=[])`) — all instances would SHARE the same list!\n- `self.history.append((\'deposit\', amount, self.balance))` appends a tuple of transaction details to the list whenever state changes.\n- `def statement(self):` defines a reporting method.\n- `for tx_type, amount, balance in self.history:` unpacks the tuples from the list.\n- `print(f\'{tx_type:10s} ${amount:8.2f}  balance: ${balance:.2f}\')` formats the report row.',
                '**Expected behavior.** ```python account = BankAccount(\'Alice\', 0) account.deposit(1000) account.withdraw(250) account.deposit(500) account.statement() ``` Output: ``` deposit $ 1000.00 balance: $1000.00 withdraw $ 250.00 balance: $ 750.00 deposit $ 500.00 balance: $1250.00 ```',
                '**CS lens.** Also recognized in: Event Sourcing, append-only logs in databases, redo logs in filesystems.',
                '**SE lens.** Auditability. The alternative is throwing away data (the path to the current balance). Storing complex state like a list of tuples on the instance allows the object to answer historical queries, not just current-state queries.'
              ],
              typeIt: true,
              solution: '    # In __init__:\n    self.history = []\n\n    # In deposit, after modifying balance:\n    self.history.append((\'deposit\', amount, self.balance))\n\n    # In withdraw, after modifying balance:\n    self.history.append((\'withdraw\', amount, self.balance))\n\n    def statement(self):\n        for tx_type, amount, balance in self.history:\n            print(f\'{tx_type:10s} ${amount:8.2f}  balance: ${balance:.2f}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 13,
              cellTitle: 'Class methods and static methods',
              prose: [
                'How do you write a method that modifies a class variable (like `interest_rate`) without needing an instance? What about utility functions that belong to the concept of a BankAccount but don\'t need access to either class or instance data? If you want to validate an amount before depositing, does that logic require knowing the account\'s balance, or is it universally true?',
                'Output: ``` 12 ``` This proves that a **static method** works like a normal function but lives inside a class namespace.'
              ],
              typeIt: true,
              solution: 'class MathUtils:\n    @staticmethod\n    def add(a, b):\n        return a + b\n\nprint(MathUtils.add(5, 7))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 14,
              cellTitle: 'Class methods and static methods — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `@classmethod` is a decorator modifying the method below it.\n- `def set_interest_rate(cls, rate):` receives the CLASS as the first argument (`cls`), not an instance. It is used for factory methods or class-level operations.\n- `cls.interest_rate = rate` modifies the class variable directly.\n- `@staticmethod` modifies the method below it.\n- `def is_valid_amount(amount):` receives no implicit first argument (`self` or `cls`) — it\'s a regular function that lives in the class namespace for organizational reasons.\n- `return isinstance(amount, (int, float)) and amount > 0` performs pure logic on its arguments.',
                '**Expected behavior.** ```python BankAccount.set_interest_rate(0.05) print(BankAccount.interest_rate) print(BankAccount.is_valid_amount(100)) print(BankAccount.is_valid_amount(-50)) print(BankAccount.is_valid_amount(\'100\')) ``` Output: ``` 0.05 True False False ```',
                '**CS lens.** Also recognized in: C# static methods, Java static utility classes, Ruby class methods.',
                '**SE lens.** Namespace organization. The alternative is leaving `is_valid_amount` as a floating function in the module. Putting it in the class signals that it conceptually belongs to BankAccount domain logic.'
              ],
              typeIt: true,
              solution: '    @classmethod\n    def set_interest_rate(cls, rate):\n        cls.interest_rate = rate\n\n    @staticmethod\n    def is_valid_amount(amount):\n        return isinstance(amount, (int, float)) and amount > 0',
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
      'Next lesson: Encapsulation and Data Abstraction.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Class variable"?',
      options: [
        'a variable bound to the class itself, shared by all instances. It exists to hold state or configuration common to the entire type.',
        'a design pattern where methods return self to allow chaining (obj.a().b()). It exists to make sequential operations read cleanly.',
        'a blueprint for creating objects, defining their initial state and behavior. It exists so we can create many independent objects of the same type without duplicating code.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Fluent interface"?',
      options: [
        'a variable bound to a specific instance (self.name). It exists to hold state unique to one object.',
        'a concrete object created from a class blueprint. It exists because blueprints alone don\'t hold data; instances hold actual, separate state in memory.',
        'a design pattern where methods return self to allow chaining (obj.a().b()). It exists to make sequential operations read cleanly.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Class"?',
      options: [
        'a blueprint for creating objects, defining their initial state and behavior. It exists so we can create many independent objects of the same type without duplicating code.',
        'a variable bound to the class itself, shared by all instances. It exists to hold state or configuration common to the entire type.',
        'a variable bound to a specific instance (self.name). It exists to hold state unique to one object.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Method"?',
      options: [
        'a blueprint for creating objects, defining their initial state and behavior. It exists so we can create many independent objects of the same type without duplicating code.',
        'a variable bound to a specific instance (self.name). It exists to hold state unique to one object.',
        'a function defined inside a class that operates on instances of that class. It exists to bundle behavior with the data it manipulates.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Class** — a blueprint for creating objects, defining their initial state and behavior. It exists so we can create many independent objects of the same type without duplicating code.',
    '**Instance** — a concrete object created from a class blueprint. It exists because blueprints alone don\'t hold data; instances hold actual, separate state in memory.',
    '**Method** — a function defined inside a class that operates on instances of that class. It exists to bundle behavior with the data it manipulates.',
    '**Instance variable** — a variable bound to a specific instance (self.name). It exists to hold state unique to one object.',
    '**Class variable** — a variable bound to the class itself, shared by all instances. It exists to hold state or configuration common to the entire type.',
    '**Fluent interface** — a design pattern where methods return self to allow chaining (obj.a().b()). It exists to make sequential operations read cleanly.',
    '**Mutable default argument** — a default parameter that can change (like an empty list). It exists as a Python mechanism but is a trap in __init__, because all instances would share the same list.',
  ],

  checkpoints: ['read-intuition'],
}
