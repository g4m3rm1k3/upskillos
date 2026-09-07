// Guttag — Lesson 27: Dataclasses and Named Tuples
// Auto-converted from src/docs/tutorials/guttag-python/lesson-27.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-27-dataclasses-and-named-tuples',
  slug: 'dataclasses-and-named-tuples',
  chapter: 4,
  order: 6,
  title: 'Dataclasses and Named Tuples',
  subtitle: 'Lightweight Records',
  tags: ['dataclass', 'boilerplate', 'decorator', 'frozen', 'immutable', 'tuple-compatibility'],

  hook: {
    question: 'What is "Dataclasses and Named Tuples", and why does it matter?',
    realWorldContext: 'The reader understands @dataclass (auto-generates `__init__`, `__repr__`, `__eq__`, with optional ordering and freezing) and collections.namedtuple / typing.NamedTuple (immutable, tuple-compatible records with named fields). The transferable insight: most custom classes that just hold data should be dataclasses. Writing `__init__`, `__repr__`, and `__eq__` by hand is repetitive boilerplate. @dataclass generates them for you from field annotations.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: @dataclass — auto-generated boilerplate, Default values, frozen, and ordering, collections.namedtuple — immutable named tuple, typing.NamedTuple — typed named tuple, Choosing between dataclass, NamedTuple, and plain class.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **@dataclass:** A decorator that automatically generates boilerplate methods for data-holding classes, eliminating the need to write repetitive __init__, __repr__, and __eq__ implementations.\n- **Boilerplate:** Repetitive code that must be written in many places with little to no variation, which distracts from the core logic.\n- **Decorator:** A special syntax starting with @ that modifies or wraps a class or function to change its behavior dynamically.\n- **Frozen:** A state where an object cannot be modified after it is created; making it immutable.\n- **Immutable:** An object whose state cannot be changed after creation, making it safe to share across code or use as a dictionary key.\n- **Tuple compatibility:** The ability for an object to behave like a standard Python tuple, such as allowing index access (p[0]) and unpacking (x, y = p).',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **dataclass:** A class decorator.\n- **field:** A function used to customize the behavior of individual fields in a dataclass.\n- **collections.namedtuple:** A factory function for creating tuple subclasses with named fields.\n- **typing.NamedTuple:** A typed version of collections.namedtuple.\n- **asdict:** A helper function to convert a dataclass instance to a dictionary.\n- **astuple:** A helper function to convert a dataclass instance to a tuple.\n- **json.dumps:** A function to serialize an object to a JSON formatted string.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Throughout this lesson, we transitioned from writing repetitive boilerplate to cleanly defining data structures. If we trace a `Student` dataclass through its lifecycle: 1. `Student(\'Alice\', 92.5)` is created instantly without us writing `__init__`, thanks to the `@dataclass` decorator dynamically building it based on the `name` and `grade` type hints. 2. Because it was defined with `order=True`, `s1 < s2` seamlessly delegates to a generated `__lt__` method that automatically checks fields sequentially. 3. Sorting a list `sorted(students)` naturally uses that same ordering capability without any custom lambda functions. 4. If we had needed that `Student` object to be sent as a JSON payload to a web API, `asdict(student)` would immediately convert it, ready for `json.dumps`. By abstracting away the boilerplate, Python allows us to focus purely on the structure and types of the data we\'re handling.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 27: Dataclasses and Named Tuples',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Dataclasses and Named Tuples',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: '@dataclass — auto-generated boilerplate',
              prose: [
                'If you need a class just to hold x and y coordinates, you have to write an `__init__` method to assign them, a `__repr__` method to print it nicely, and an `__eq__` method to compare two instances. Why should you have to write all this repetitive boilerplate code for something so simple? What if the language could generate it for you?',
                'Predicted confidently: `Point(x=3.0, y=4.0)`. This proves that the **@dataclass** decorator automatically generates a custom `__repr__` method behind the scenes just from reading the type annotations.'
              ],
              typeIt: true,
              solution: 'from dataclasses import dataclass\n\n@dataclass\nclass Point:\n    x: float\n    y: float\n\np1 = Point(3.0, 4.0)\nprint(p1)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: '@dataclass — auto-generated boilerplate — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `from dataclasses import dataclass, field`: Imports the decorator and field configurator from the standard library.\n- `@dataclass`: The decorator applied to the `Point` class. It tells Python to automatically add special methods like `__init__`, `__repr__`, and `__eq__` to the class based on the type annotations below.\n- `class Point:`: Defines the class `Point`.\n- `x: float` and `y: float`: Type annotations defining the fields of the dataclass. `@dataclass` reads these to know what attributes the class should have.\n- `Point(3.0, 4.0)`: Calls the automatically generated `__init__(self, x: float, y: float)` method, setting `self.x=3.0` and `self.y=4.0`.\n- `print(p1)`: Calls the automatically generated `__repr__`, formatting the output as `Point(x=3.0, y=4.0)`.\n- `p1 == p2`: Calls the automatically generated `__eq__`, comparing the `x` and `y` fields. Since `3.0 == 3.0` and `4.0 == 4.0`, it returns `True`.\n- `p1 == p3`: Compares the fields, which are different, returning `False`.\n- `p1.x`: Accesses the attribute `x` directly, returning `3.0`.',
                '**Expected behavior.** Predicted confidently: ``` Point(x=3.0, y=4.0) True False 3.0 ```',
                '**CS lens.** This is **Metaprogramming** / **Code Generation**. The program writes code for you dynamically at load time. Real-world examples include Object-Relational Mappers (ORMs) generating SQL queries, compilers generating boilerplate C code from schemas, and dependency injection frameworks auto-generating factory classes.',
                '**SE lens.** **Don\'t Repeat Yourself (DRY)**. The alternative not chosen is writing `__init__`, `__repr__`, and `__eq__` manually. The tradeoff is that there is a slight performance overhead when the class is first imported and decorated, and it obscures exactly what code is running (magic behavior). But it vastly reduces bug-prone boilerplate, making the intent clearer.'
              ],
              typeIt: true,
              solution: 'from dataclasses import dataclass, field\n\n@dataclass\nclass Point:\n    x: float\n    y: float\n\np1 = Point(3.0, 4.0)\np2 = Point(3.0, 4.0)\np3 = Point(1.0, 2.0)\n\nprint(p1)\nprint(p1 == p2)\nprint(p1 == p3)\nprint(p1.x)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Default values, frozen, and ordering',
              prose: [
                'What if we want to sort objects in a list, or ensure that once created, an object\'s fields cannot be altered? How can we enforce these properties without writing complex custom equality and hash methods?',
                'Predicted confidently: `100`. This proves that the **frozen** parameter creates an immutable class where assigning to an attribute after instantiation is prevented.'
              ],
              typeIt: true,
              solution: 'from dataclasses import dataclass\n\n@dataclass(frozen=True)\nclass Score:\n    value: int\n\ns = Score(100)\n# s.value = 50  # This would crash!\nprint(s.value)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Default values, frozen, and ordering — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `@dataclass(order=True, frozen=True)`: Instructs the decorator to generate ordering methods (`__lt__`, `__le__`, etc.) and to make the instance immutable (raising an `AttributeError` on mutation).\n- `class Student:`: Declares the class.\n- `name: str` and `grade: float`: Fields that will be part of initialization, comparison, and ordering.\n- `courses: tuple = field(default_factory=tuple, compare=False)`: Uses the `field` function. `default_factory=tuple` means if no courses are provided, a new empty tuple is created. `compare=False` tells the dataclass to ignore this field when checking equality or ordering.\n- `def gpa_letter(self):`: Dataclasses can still have normal methods defined.\n- `s1 = Student(\'Alice\', 92.5)`: Initializes the object. `courses` gets the default empty tuple.\n- `s1 < s2`: Uses the generated `__lt__` method. It compares fields in declaration order: first `name`, then `grade`. Since `\'Alice\' < \'Bob\'`, it evaluates to `True`.\n- `s1 == s3`: Compares the generated `__eq__`. The names differ, so it\'s `False`.\n- `sorted([s2, s3, s1])`: Uses the generated ordering to sort the list of students by `name` then `grade`.',
                '**Expected behavior.** Predicted confidently: ``` True False [Student(name=\'Alice\', grade=92.5, courses=()), Student(name=\'Bob\', grade=87.0, courses=()), Student(name=\'Charlie\', grade=92.5, courses=())] ```',
                '**CS lens.** This is **Immutability**. An immutable object\'s state cannot be modified after it is created. Real-world examples include strings in most high-level languages, functional programming data structures, and database transaction logs.',
                '**SE lens.** **Configuration vs Boilerplate**. The alternative not chosen is implementing `__lt__`, `__le__`, `__gt__`, `__ge__`, `__eq__`, and `__hash__` manually just to allow sorting and immutability. The tradeoff is that the explicit ordering logic is hidden, meaning readers must know that `@dataclass` compares fields top-to-bottom sequentially.'
              ],
              typeIt: true,
              solution: '@dataclass(order=True, frozen=True)\nclass Student:\n    name: str\n    grade: float\n    courses: tuple = field(default_factory=tuple, compare=False)\n\n    def gpa_letter(self):\n        if self.grade >= 90: return \'A\'\n        if self.grade >= 80: return \'B\'\n        return \'C\'\n\ns1 = Student(\'Alice\', 92.5)\ns2 = Student(\'Bob\', 87.0)\ns3 = Student(\'Charlie\', 92.5)\n\nprint(s1 < s2)\nprint(s1 == s3)\nprint(sorted([s2, s3, s1]))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'collections.namedtuple — immutable named tuple',
              prose: [
                'If you need an object that can be accessed via dot notation (`p.x`) but MUST also be perfectly compatible with older code that unpacks a sequence (`x, y = p`), how do you bridge the gap?',
                'Predicted confidently: `1`. This proves that **namedtuple** produces a real tuple subclass that allows index-based access, despite having named attributes.'
              ],
              typeIt: true,
              solution: 'from collections import namedtuple\n\nPointTuple = namedtuple(\'PointTuple\', [\'x\', \'y\'])\npt = PointTuple(1, 2)\nprint(pt[0])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'collections.namedtuple — immutable named tuple — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `from collections import namedtuple`: Imports the factory function.\n- `namedtuple(\'PointNamed\', [\'x\', \'y\'])`: Generates a new tuple subclass called `PointNamed` with fields `x` and `y`.\n- `namedtuple(\'Color\', \'red green blue\')`: An alternative syntax passing a space-separated string of field names instead of a list.\n- `PointNamed(3, 4)`: Instantiates the tuple.\n- `p.x`: Attribute access, returning `3`.\n- `p[0]`: Index access, demonstrating it is fundamentally a tuple, returning `3`.\n- `p._asdict()`: A built-in method of namedtuples to convert the tuple into a dictionary. Returns `{\'x\': 3, \'y\': 4}`.\n- `x, y = p`: Demonstrates unpacking compatibility.\n- `p == (3, 4)`: Evaluates to `True`, because `namedtuple` instances are literally tuple instances and compare equal to plain tuples with the same elements.\n- `p._replace(x=10)`: Since it is immutable, `_replace` is used to return a *new* instance with the specified fields swapped out.\n- `print(p)`: The original object remains unchanged.',
                '**Expected behavior.** Predicted confidently: ``` PointNamed(x=3, y=4) 3 3 {\'x\': 3, \'y\': 4} True PointNamed(x=10, y=4) PointNamed(x=3, y=4) ```',
                '**CS lens.** This is **Structural Subtyping** (behavioral compatibility). The `namedtuple` perfectly mimics a tuple\'s structure, allowing it to seamlessly drop into older APIs expecting plain arrays or tuples. Real-world examples include Unix file descriptors, duck-typed iterables in dynamically typed languages, and standard POSIX interfaces.',
                '**SE lens.** **Backward Compatibility**. The alternative not chosen is rewriting every legacy function that expects a `(x, y)` tuple to instead take a custom class object. The tradeoff is that namedtuple exposes confusing internal methods prefixed with underscores (like `_asdict` or `_replace`) to avoid naming collisions with user fields, which looks messy.'
              ],
              typeIt: true,
              solution: 'from collections import namedtuple\n\nPointNamed = namedtuple(\'PointNamed\', [\'x\', \'y\'])\nColor = namedtuple(\'Color\', \'red green blue\')\n\np = PointNamed(3, 4)\nc = Color(255, 128, 0)\n\nprint(p)\nprint(p.x)\nprint(p[0])\nprint(p._asdict())\n\nx, y = p\nprint(p == (3, 4))\n\np2 = p._replace(x=10)\nprint(p2)\nprint(p)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'typing.NamedTuple — typed named tuple',
              prose: [
                'If we want the perfect backwards compatibility of a namedtuple, but we *also* want the strict type hints and default values that we got from our dataclass, how do we combine them?',
                'Predicted confidently: `5`. This proves that **NamedTuple** allows creating named tuples using modern class-based syntax and type hints.'
              ],
              typeIt: true,
              solution: 'from typing import NamedTuple\n\nclass Simple(NamedTuple):\n    val: int\n\ns = Simple(5)\nprint(s.val)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'typing.NamedTuple — typed named tuple — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `from typing import NamedTuple`: Imports the base class for typed named tuples.\n- `class Employee(NamedTuple):`: Defines the new tuple by subclassing `NamedTuple`. This is syntax sugar that triggers a metaclass generation under the hood.\n- `name: str` and `department: str`: Typed fields.\n- `salary: float = 50000.0`: A typed field with a default value.\n- `Employee(\'Alice\', \'Engineering\', 95000)`: Uses `__new__` (since tuples are immutable) to instantiate the tuple.\n- `Employee(\'Bob\', \'Marketing\')`: Uses the default `salary`.\n- `e1._fields`: A generated property containing the tuple of field names: `(\'name\', \'department\', \'salary\')`.\n- `list(e1)`: Since it\'s a tuple, it\'s iterable, so it easily converts to a list: `[\'Alice\', \'Engineering\', 95000]`.\n- `sorted(..., key=lambda e: e.salary, reverse=True)`: Sorts the iterable using a custom lambda function targeting the `salary` attribute.',
                '**Expected behavior.** Predicted confidently: ``` Employee(name=\'Alice\', department=\'Engineering\', salary=95000) 50000.0 (\'name\', \'department\', \'salary\') [\'Alice\', \'Engineering\', 95000] [Employee(name=\'Alice\', department=\'Engineering\', salary=95000), Employee(name=\'Bob\', department=\'Marketing\', salary=50000.0)] ```',
                '**CS lens.** This is **Static Typing Integration**. Python is fundamentally dynamic, but this construct allows static analysis tools (like `mypy`) to verify data correctness before the program ever runs. Real-world examples include TypeScript layering types over JavaScript, Rust\'s strict compiler checks, and GraphQL schema validation.',
                '**SE lens.** **Developer Experience (DX)**. The alternative not chosen is sticking with `collections.namedtuple`. The tradeoff is that the class-based syntax of `NamedTuple` is slightly more verbose, but it drastically improves IDE autocompletion and type checker visibility, saving debug time later.'
              ],
              typeIt: true,
              solution: 'from typing import NamedTuple\n\nclass Employee(NamedTuple):\n    name: str\n    department: str\n    salary: float = 50000.0\n\ne1 = Employee(\'Alice\', \'Engineering\', 95000)\ne2 = Employee(\'Bob\', \'Marketing\')\n\nprint(e1)\nprint(e2.salary)\nprint(e1._fields)\nprint(list(e1))\n\nemployees = [e1, e2]\nprint(sorted(employees, key=lambda e: e.salary, reverse=True))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Choosing between dataclass, NamedTuple, and plain class',
              prose: [
                'When building a new system, how do you decide which of these data holder constructs is the right tool for the job, and how do you export that data to other systems?',
                'Predicted confidently: `{\'port\': 80}`. This proves that the **asdict** function can dynamically inspect a dataclass and convert it to a standard dictionary.'
              ],
              typeIt: true,
              solution: 'from dataclasses import dataclass, asdict\n\n@dataclass\nclass SimpleConfig:\n    port: int = 80\n\nc = SimpleConfig()\nprint(asdict(c))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Choosing between dataclass, NamedTuple, and plain class — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `from dataclasses import asdict, astuple`: Imports the helper functions that serialize dataclasses.\n- `import json`: Imports the standard library JSON module.\n- `@dataclass`: We choose a regular dataclass because configs might need to mutate later, and we don\'t need tuple compatibility.\n- `class Config:`: Defines the config block with default values.\n- `Config(port=9090)`: Instantiates the object, overriding just one default.\n- `asdict(c)`: Recursively converts the instance to a dictionary. Returns `{\'host\': \'localhost\', \'port\': 9090, \'debug\': False}`.\n- `astuple(c)`: Converts the instance to a tuple: `(\'localhost\', 9090, False)`.\n- `json.dumps(asdict(c))`: `asdict(c)` generates a raw dict, which is passed to `json.dumps`, which converts it to a serialized string for network transit: `\'{"host": "localhost", "port": 9090, "debug": false}\'`.',
                '**Expected behavior.** Predicted confidently: ``` {\'host\': \'localhost\', \'port\': 9090, \'debug\': False} (\'localhost\', 9090, False) {"host": "localhost", "port": 9090, "debug": false} ```',
                '**CS lens.** This is **Serialization**. Converting an in-memory object into a flat string or binary format that can be stored or transmitted across a network. Real-world examples include writing to JSON, Google\'s Protocol Buffers, and XML payloads.',
                '**SE lens.** **The Right Tool for the Job**. The alternative not chosen is using a plain dictionary for config. The tradeoff is that dicts lack type hints and dot-attribute access (`c.port` vs `c[\'port\']`). - Choose `NamedTuple` when you strictly need an immutable record and backwards compatibility with tuples. - Choose `@dataclass` as the default for readable, mutable, feature-rich data objects. - Choose `@dataclass(frozen=True)` when you want immutability but richer features than a tuple. - Choose plain classes only when complex logic heavily outweighs pure data storage.'
              ],
              typeIt: true,
              solution: 'from dataclasses import asdict, astuple\nimport json\n\n@dataclass\nclass Config:\n    host: str = \'localhost\'\n    port: int = 8080\n    debug: bool = False\n\nc = Config(port=9090)\nprint(asdict(c))\nprint(astuple(c))\n\nprint(json.dumps(asdict(c)))',
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
      'Next lesson: OOP Capstone.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Frozen"?',
      options: [
        'A state where an object cannot be modified after it is created; making it immutable.',
        'Repetitive code that must be written in many places with little to no variation, which distracts from the core logic.',
        'A decorator that automatically generates boilerplate methods for data-holding classes, eliminating the need to write repetitive __init__, __repr__, and __eq__ implementations.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Boilerplate"?',
      options: [
        'The ability for an object to behave like a standard Python tuple, such as allowing index access (p[0]) and unpacking (x, y = p).',
        'Repetitive code that must be written in many places with little to no variation, which distracts from the core logic.',
        'A decorator that automatically generates boilerplate methods for data-holding classes, eliminating the need to write repetitive __init__, __repr__, and __eq__ implementations.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Decorator"?',
      options: [
        'A special syntax starting with @ that modifies or wraps a class or function to change its behavior dynamically.',
        'A state where an object cannot be modified after it is created; making it immutable.',
        'The ability for an object to behave like a standard Python tuple, such as allowing index access (p[0]) and unpacking (x, y = p).'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Immutable"?',
      options: [
        'A decorator that automatically generates boilerplate methods for data-holding classes, eliminating the need to write repetitive __init__, __repr__, and __eq__ implementations.',
        'An object whose state cannot be changed after creation, making it safe to share across code or use as a dictionary key.',
        'A state where an object cannot be modified after it is created; making it immutable.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**@dataclass** — A decorator that automatically generates boilerplate methods for data-holding classes, eliminating the need to write repetitive __init__, __repr__, and __eq__ implementations.',
    '**Boilerplate** — Repetitive code that must be written in many places with little to no variation, which distracts from the core logic.',
    '**Decorator** — A special syntax starting with @ that modifies or wraps a class or function to change its behavior dynamically.',
    '**Frozen** — A state where an object cannot be modified after it is created; making it immutable.',
    '**Immutable** — An object whose state cannot be changed after creation, making it safe to share across code or use as a dictionary key.',
    '**Tuple compatibility** — The ability for an object to behave like a standard Python tuple, such as allowing index access (p[0]) and unpacking (x, y = p).',
  ],

  checkpoints: ['read-intuition'],
}
