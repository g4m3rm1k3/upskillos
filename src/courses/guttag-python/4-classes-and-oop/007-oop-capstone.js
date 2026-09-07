// Guttag — Lesson 28: OOP Capstone
// Auto-converted from src/docs/tutorials/guttag-python/lesson-28.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-28-oop-capstone',
  slug: 'oop-capstone',
  chapter: 4,
  order: 7,
  title: 'OOP Capstone',
  subtitle: 'BankAccount, SavingsAccount, and Portfolio',
  tags: ['encapsulation', 'inheritance', 'composition', 'duck-typing', 'property', 'class-method'],

  hook: {
    question: 'What is "OOP Capstone", and why does it matter?',
    realWorldContext: 'The reader builds a complete OOP system: BankAccount base class, SavingsAccount subclass, and Portfolio aggregator, applying all OOP concepts from previous lessons. The transferable insight: OOP is not about inheritance hierarchies. It is about encapsulation (data + behavior in one unit), single responsibility (each class does one thing), and separation of concerns (Portfolio doesn\'t know how accounts work internally).',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: BankAccount — encapsulation and invariants, SavingsAccount — extending with interest, Portfolio — composition over inheritance, Properties and encapsulation, Class methods, static methods, and __slots__.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Encapsulation:** Bundling data with the methods that operate on that data, restricting direct access to some of the object\'s components. This prevents external code from putting the object into an invalid state.\n- **Inheritance:** A mechanism where a new class derives properties and behaviors from an existing class. It models an "is-a" relationship, allowing reuse of the base class\'s code.\n- **Composition:** A design principle where a class is composed of one or more objects of other classes to provide complex behavior. It models a "has-a" relationship.\n- **Duck typing:** A concept where the type or the class of an object is less important than the methods it defines. If it walks like a duck and quacks like a duck, it is treated as a duck.\n- **Property:** A way to define methods that can be accessed like attributes, allowing computation or validation on access/mutation while maintaining an intuitive syntax.\n- **Class method:** A method bound to the class and not the instance of the class, allowing it to modify class state that applies across all instances.\n- **Static method:** A utility method that belongs to a class conceptually but doesn\'t require access to class or instance state.\n- **Single responsibility:** The principle that every class should have exactly one job or responsibility.\n- **Separation of concerns:** Organizing a system such that different sections address separate concerns, reducing dependencies between them.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **BankAccount:** A base class for representing a bank account.\n- **SavingsAccount:** A specialized type of bank account.\n- **Portfolio:** A collection of accounts owned by a single entity.\n- **@property:** A built-in decorator function.\n- **@classmethod:** A built-in decorator that changes a method to receive the class as the first implicit argument.\n- **@staticmethod:** A built-in decorator that changes a method to not receive an implicit first argument.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s look at the flow of data through our entire system when Alice makes a deposit and the portfolio checks its status: 1. `SavingsAccount(\'Alice\', 10000, 0.05)` is called. This triggers `__init__`, which uses `super().__init__` to increment the `BankAccount._count` class variable. 2. `Portfolio(\'Alice\')` is created, and `portfolio.add_account(...)` links the new `SavingsAccount` into its `_accounts` list, demonstrating composition. 3. A call to `portfolio.apply_interest()` iterates over `_accounts`. Using duck typing, it finds `add_interest` on the `SavingsAccount`. 4. `add_interest` calculates the interest and calls its inherited `self.deposit(...)` method. 5. `deposit` enforces its invariants, updates the private `_balance`, and logs the transaction. 6. The `Portfolio` then reports its `total_balance()` by aggregating the encapsulated `.balance` properties from all its accounts. Through encapsulation, inheritance, composition, properties, and class methods, the data remains valid at every step, and no class is forced to understand the internal mechanisms of the others.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 28: OOP Capstone',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'OOP Capstone',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'BankAccount — encapsulation and invariants',
              prose: [
                'How do we group related data (like a balance and owner) with the operations that modify it (like deposit and withdraw) while preventing invalid states (like a negative deposit)? - What happens if we just use a dictionary for an account and write standalone functions? - How can we stop external code from just changing the balance directly?',
                'Predicted confidently: `1`. This proves that we can hide the internal state (`_count`) and only allow modification through a controlled method (`increment`). This is called **Encapsulation**.'
              ],
              typeIt: true,
              solution: 'class Counter:\n    def __init__(self):\n        self._count = 0\n    def increment(self):\n        self._count += 1\n    def get_count(self):\n        return self._count\n\nc = Counter()\nc.increment()\nprint(c.get_count())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'BankAccount — encapsulation and invariants — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class BankAccount:` defines a new class.\n- `def __init__(...):` initializes a new object, validating inputs.\n- `self._balance` creates a private-by-convention attribute.\n- `@property` makes the `balance` and `owner` methods act like read-only attributes.\n- `def deposit(...)` and `def withdraw(...)` define actions that mutate the state while enforcing rules via `if amount <= 0: raise ValueError(...)`.\n- `self._transactions.append(...)` logs a tuple of the action, amount, and resulting balance.\n- `def statement(...)` iterates over transactions and formats them into a string.\n- `def __repr__(...)` provides a developer-friendly string representation of the object.',
                '**Expected behavior.** ```python acc = BankAccount(\'Alice\', 1000) acc.deposit(500) acc.withdraw(200) print(acc.statement()) ``` Predicted confidently: ``` Account: Alice Balance: $1300.00 Transactions: deposit: $ 500.00 -> $1500.00 withdraw: $ 200.00 -> $1300.00 ```',
                '**CS lens.** This is **Encapsulation** and **Invariants**. Invariants are rules that must always be true for an object to be valid. This appears in database constraints, networking protocols maintaining valid state machines, and OS permissions structures.',
                '**SE lens.** This demonstrates the **Single Responsibility Principle**. The class manages its own data and guarantees its validity. We could have used a plain dictionary, but that would force every caller to validate the rules themselves, risking inconsistencies.'
              ],
              typeIt: true,
              solution: 'class BankAccount:\n    def __init__(self, owner: str, balance: float = 0.0):\n        if balance < 0:\n            raise ValueError(\'Initial balance cannot be negative\')\n        self._owner = owner          # _: convention for \'private\'\n        self._balance = balance\n        self._transactions = []\n\n    @property\n    def balance(self):\n        return self._balance\n\n    @property\n    def owner(self):\n        return self._owner\n\n    def deposit(self, amount: float) -> float:\n        if amount <= 0:\n            raise ValueError(f\'Deposit amount must be positive, got {amount}\')\n        self._balance += amount\n        self._transactions.append((\'deposit\', amount, self._balance))\n        return self._balance\n\n    def withdraw(self, amount: float) -> float:\n        if amount <= 0:\n            raise ValueError(f\'Withdrawal must be positive, got {amount}\')\n        if amount > self._balance:\n            raise ValueError(f\'Insufficient funds: balance {self._balance}, requested {amount}\')\n        self._balance -= amount\n        self._transactions.append((\'withdraw\', amount, self._balance))\n        return self._balance\n\n    def statement(self):\n        lines = [f\'Account: {self._owner}\', f\'Balance: ${self._balance:.2f}\', \'Transactions:\']\n        for txn_type, amount, bal in self._transactions:\n            lines.append(f\'  {txn_type:>8}: ${amount:8.2f} -> ${bal:.2f}\')\n        return \'\\n\'.join(lines)\n\n    def __repr__(self):\n        return f\'BankAccount({self._owner!r}, balance={self._balance:.2f})\'',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'SavingsAccount — extending with interest',
              prose: [
                'We need an account that earns interest, but it should still be able to do everything a regular bank account does. - How can we reuse all the logic for balances and transactions? - Do we copy and paste the `BankAccount` code into a new class?',
                'Predicted confidently: `Woof`. This proves that a child class can inherit and override behavior from a parent class. This is called **Inheritance**.'
              ],
              typeIt: true,
              solution: 'class Animal:\n    def speak(self): return "..."\nclass Dog(Animal):\n    def speak(self): return "Woof"\nd = Dog()\nprint(d.speak())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'SavingsAccount — extending with interest — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class SavingsAccount(BankAccount):` defines a subclass inheriting from `BankAccount`.\n- `def __init__(...)` accepts additional arguments like `rate`.\n- `super().__init__(owner, balance)` calls the parent class\'s constructor to handle common initialization.\n- `self._rate = rate` stores the subclass-specific data.\n- `def add_interest(...)` calculates the interest and calls `self.deposit(interest)`, reusing the inherited method.\n- `def __repr__(...)` overrides the parent\'s string representation.',
                '**Expected behavior.** ```python sav = SavingsAccount(\'Bob\', 2000, rate=0.03) interest = sav.add_interest() print(f\'Interest added: ${interest:.2f}\') # $60.00 print(sav.balance) # 2060.0 print(sav.statement()) ``` Predicted confidently: ``` Interest added: $60.00 2060.0 Account: Bob Balance: $2060.00 Transactions: deposit: $ 60.00 -> $2060.00 ```',
                '**CS lens.** This is **Inheritance**. It allows for code reuse and polymorphism. This concept appears in GUI frameworks, ORM models in web frameworks, and game engines.',
                '**SE lens.** This demonstrates the **Open/Closed Principle**. We extended the behavior of our account system without modifying the original `BankAccount` code. The alternative would be adding `is_savings` flags and branches inside `BankAccount`, which scales poorly.'
              ],
              typeIt: true,
              solution: 'class SavingsAccount(BankAccount):\n    def __init__(self, owner: str, balance: float = 0.0, rate: float = 0.05):\n        super().__init__(owner, balance)\n        if not 0 < rate <= 1:\n            raise ValueError(f\'Rate must be between 0 and 1, got {rate}\')\n        self._rate = rate\n\n    @property\n    def rate(self):\n        return self._rate\n\n    def add_interest(self) -> float:\n        interest = round(self._balance * self._rate, 2)\n        self.deposit(interest)   # reuse inherited method; logs as transaction\n        return interest\n\n    def __repr__(self):\n        return f\'SavingsAccount({self._owner!r}, balance={self._balance:.2f}, rate={self._rate})\'',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Portfolio — composition over inheritance',
              prose: [
                'A user often has multiple accounts. How do we group them and calculate aggregate data, like the total balance across all accounts? - Should `Portfolio` inherit from `BankAccount`? - How does `Portfolio` interact with both `BankAccount` and `SavingsAccount` at the same time?',
                'Predicted confidently: `Vroom`. This proves that a class can contain instances of other classes to build complex structures. This is called **Composition**.'
              ],
              typeIt: true,
              solution: 'class Engine:\n    def start(self): return "Vroom"\nclass Car:\n    def __init__(self):\n        self.engine = Engine()\n    def start_car(self):\n        return self.engine.start()\nc = Car()\nprint(c.start_car())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Portfolio — composition over inheritance — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class Portfolio:` defines the aggregator class.\n- `self._accounts = []` initializes an empty list to hold account instances.\n- `def add_account(...)` appends to the list and returns `self` to allow method chaining.\n- `def total_balance(...)` iterates over `self._accounts` and sums their `.balance` properties.\n- `def apply_interest(...)` checks if each account has an `add_interest` method using `hasattr(acc, \'add_interest\')`.\n- If it does, it calls it and keeps a running total of the applied interest. This is **Duck Typing**.',
                '**Expected behavior.** ```python portfolio = Portfolio(\'Alice\') portfolio.add_account(BankAccount(\'Checking\', 5000)) portfolio.add_account(SavingsAccount(\'Savings\', 10000, rate=0.04)) print(portfolio.summary()) print(f\'Interest earned: ${portfolio.apply_interest():.2f}\') ``` Predicted confidently: ``` Portfolio: Alice BankAccount(\'Checking\', balance=5000.00) SavingsAccount(\'Savings\', balance=10000.00, rate=0.04) Total: $15000.00 Interest earned: $400.00 ```',
                '**CS lens.** This is **Composition** and **Duck Typing**. Composition models "has-a" relationships. Duck typing focuses on object capabilities rather than inheritance hierarchies. This appears in plugin architectures, dynamic dispatch systems, and DOM node trees.',
                '**SE lens.** This demonstrates **Separation of Concerns**. The `Portfolio` doesn\'t know how `add_interest` is calculated or how a `BankAccount` stores its balance. It just knows they expose those interfaces.'
              ],
              typeIt: true,
              solution: 'class Portfolio:\n    def __init__(self, owner: str):\n        self._owner = owner\n        self._accounts = []      # list of BankAccount objects\n\n    def add_account(self, account):\n        self._accounts.append(account)\n        return self\n\n    def total_balance(self) -> float:\n        return sum(acc.balance for acc in self._accounts)\n\n    def apply_interest(self):\n        total = 0\n        for acc in self._accounts:\n            if hasattr(acc, \'add_interest\'):   # duck typing\n                total += acc.add_interest()\n        return total\n\n    def summary(self) -> str:\n        lines = [f\'Portfolio: {self._owner}\']\n        for acc in self._accounts:\n            lines.append(f\'  {acc!r}\')\n        lines.append(f\'  Total: ${self.total_balance():.2f}\')\n        return \'\\n\'.join(lines)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Properties and encapsulation',
              prose: [
                'If we make a field public, anyone can set it to an invalid value. If we use a setter method like `set_celsius(value)`, the syntax feels clunky compared to just `t.celsius = value`. - How do we allow assignment syntax but still validate the input?',
                'Predicted confidently: ``` 100 212.0 32.0 ``` This proves that we can intercept attribute access and assignment using methods. This is called a **Property**.'
              ],
              typeIt: true,
              solution: 'class Temperature:\n    def __init__(self, celsius: float):\n        self.celsius = celsius   # calls the setter\n\n    @property\n    def celsius(self):\n        return self._celsius\n\n    @celsius.setter\n    def celsius(self, value):\n        if value < -273.15:\n            raise ValueError(f\'Temperature below absolute zero: {value}\')\n        self._celsius = value\n\n    @property\n    def fahrenheit(self):\n        return self._celsius * 9/5 + 32   # computed, read-only\n\nt = Temperature(100)\nprint(t.celsius)     # 100\nprint(t.fahrenheit)  # 212.0\nt.celsius = 0\nprint(t.fahrenheit)  # 32.0\n# t.celsius = -300   # ValueError: Temperature below absolute zero',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Properties and encapsulation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `@property` decorates a method to be accessed as an attribute (the getter).\n- `@celsius.setter` decorates a method to handle assignments to that attribute (the setter).\n- Inside the setter, `if value < -273.15:` intercepts and rejects invalid data.\n- The `fahrenheit` property computes its value dynamically rather than storing it, proving properties can be computed on the fly.',
                '**Expected behavior.** Predicted confidently: We ran it in isolation above.',
                '**CS lens.** This is **Accessor Methods** (getters/setters). In some languages, they are explicit function calls; in others like C# or Python, they are wrapped in property syntax to look like field access. This appears in reactivity systems, data binding libraries, and ORM lazy-loading logic.',
                '**SE lens.** This demonstrates **Information Hiding**. The internal representation (`_celsius`) is completely hidden from the consumer, who just interacts with `celsius` and `fahrenheit`.'
              ],
              typeIt: true,
              solution: '# No new code added to models.py for this unit.',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Class methods, static methods, and __slots__',
              prose: [
                'Sometimes a method is related to the class concept, but doesn\'t operate on a specific instance (e.g., parsing a dictionary to create an account, or keeping track of how many accounts exist). - How do we define methods on the class itself rather than on instances? - What if we have a utility function that needs no state at all?',
                'Predicted confidently: ``` 1 True ``` This proves that we can attach methods to the class scope and state. These are called **Class Methods** and **Static Methods**.'
              ],
              typeIt: true,
              solution: 'class Utility:\n    count = 0\n    \n    @classmethod\n    def increment(cls):\n        cls.count += 1\n        return cls.count\n        \n    @staticmethod\n    def is_even(num):\n        return num % 2 == 0\n\nprint(Utility.increment())\nprint(Utility.is_even(4))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Class methods, static methods, and __slots__ — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `_count = 0` is a class variable, shared across all instances of `BankAccount`.\n- `BankAccount._count += 1` inside `__init__` increments this shared counter whenever a new instance is created.\n- `@classmethod` decorates a method to receive the class itself (`cls`) as its first argument instead of an instance (`self`).\n- `cls(data[\'owner\'], ...)` uses `cls` to instantiate a new object dynamically. This is a factory method.\n- `@staticmethod` decorates a method that receives neither `self` nor `cls`. It behaves like a normal function but is logically scoped inside the class namespace.',
                '**Expected behavior.** ```python acc = BankAccount.from_dict({\'owner\': \'Alice\', \'balance\': 500}) print(acc.balance) # 500 print(BankAccount.is_valid_amount(100)) # True print(BankAccount.account_count()) # 1 ``` Predicted confidently: ``` 500 True 1 ```',
                '**CS lens.** These are **Factory Methods** and **Class-Level State**. Factory methods provide alternative ways to instantiate objects. This appears in JSON deserializers, Singleton patterns, and thread pool executors.',
                '**SE lens.** This demonstrates the **Factory Pattern**. Instead of having a giant, complex `__init__` that tries to guess whether you passed a dictionary or standard arguments, we provide a dedicated factory method `from_dict` with a clear, specific intention.'
              ],
              typeIt: true,
              solution: '    _count = 0    # class variable: shared across all instances\n\n    @classmethod\n    def from_dict(cls, data: dict):\n        \'\'\'Create account from a dict: {\'owner\': ..., \'balance\': ...}\'\'\'\n        return cls(data[\'owner\'], data.get(\'balance\', 0))\n\n    @staticmethod\n    def is_valid_amount(amount) -> bool:\n        return isinstance(amount, (int, float)) and amount > 0\n\n    @classmethod\n    def account_count(cls):\n        return cls._count',
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
      'Next lesson: Algorithmic Complexity.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Encapsulation"?',
      options: [
        'Bundling data with the methods that operate on that data, restricting direct access to some of the object\'s components. This prevents external code from putting the object into an invalid state.',
        'Organizing a system such that different sections address separate concerns, reducing dependencies between them.',
        'A way to define methods that can be accessed like attributes, allowing computation or validation on access/mutation while maintaining an intuitive syntax.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Inheritance"?',
      options: [
        'A way to define methods that can be accessed like attributes, allowing computation or validation on access/mutation while maintaining an intuitive syntax.',
        'Bundling data with the methods that operate on that data, restricting direct access to some of the object\'s components. This prevents external code from putting the object into an invalid state.',
        'A mechanism where a new class derives properties and behaviors from an existing class. It models an "is-a" relationship, allowing reuse of the base class\'s code.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Composition"?',
      options: [
        'A mechanism where a new class derives properties and behaviors from an existing class. It models an "is-a" relationship, allowing reuse of the base class\'s code.',
        'The principle that every class should have exactly one job or responsibility.',
        'A design principle where a class is composed of one or more objects of other classes to provide complex behavior. It models a "has-a" relationship.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Class method"?',
      options: [
        'A utility method that belongs to a class conceptually but doesn\'t require access to class or instance state.',
        'A mechanism where a new class derives properties and behaviors from an existing class. It models an "is-a" relationship, allowing reuse of the base class\'s code.',
        'A method bound to the class and not the instance of the class, allowing it to modify class state that applies across all instances.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Encapsulation** — Bundling data with the methods that operate on that data, restricting direct access to some of the object\'s components. This prevents external code from putting the object into an invalid state.',
    '**Inheritance** — A mechanism where a new class derives properties and behaviors from an existing class. It models an "is-a" relationship, allowing reuse of the base class\'s code.',
    '**Composition** — A design principle where a class is composed of one or more objects of other classes to provide complex behavior. It models a "has-a" relationship.',
    '**Duck typing** — A concept where the type or the class of an object is less important than the methods it defines. If it walks like a duck and quacks like a duck, it is treated as a duck.',
    '**Property** — A way to define methods that can be accessed like attributes, allowing computation or validation on access/mutation while maintaining an intuitive syntax.',
    '**Class method** — A method bound to the class and not the instance of the class, allowing it to modify class state that applies across all instances.',
    '**Static method** — A utility method that belongs to a class conceptually but doesn\'t require access to class or instance state.',
    '**Single responsibility** — The principle that every class should have exactly one job or responsibility.',
  ],

  checkpoints: ['read-intuition'],
}
