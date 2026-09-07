// Guttag — Lesson 26: Polymorphism and Duck Typing
// Auto-converted from src/docs/tutorials/guttag-python/lesson-26.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-26-polymorphism-and-duck-typing',
  slug: 'polymorphism-and-duck-typing',
  chapter: 4,
  order: 5,
  title: 'Polymorphism and Duck Typing',
  subtitle: 'Classes and OOP',
  tags: ['polymorphism', 'duck-typing', 'eafp-easier-to-ask-forgiveness-than-permission', 'protocol-structural-typing', 'operator-overloading'],

  hook: {
    question: 'What is "Polymorphism and Duck Typing", and why does it matter?',
    realWorldContext: 'The reader understands Python polymorphism: the same operation working on different types (via method overriding), and duck typing (\'if it walks like a duck and quacks like a duck, it IS a duck\'). The transferable insight: Python does not check types before calling a method. It just calls the method. If the method exists and works: success. If not: AttributeError at runtime. This is duck typing. It enables writing functions that work on any object with the right interface, without requiring a shared base class.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Polymorphism via method overriding, Duck typing — no inheritance required, Protocols and structural typing, typing.Protocol — explicit structural typing, Operator overloading as polymorphism.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Polymorphism:** the provision of a single interface to entities of different types. It allows one function or operator to act on multiple types of objects without needing type-checking logic.\n- **Duck typing:** a programming style where the type or class of an object is less important than the methods it defines. Python checks for the presence of a method, not the class inheritance.\n- **EAFP (Easier to Ask Forgiveness than Permission):** a common Python coding style that assumes the existence of valid keys or attributes and catches exceptions if the assumption proves false, rather than checking beforehand.\n- **Protocol (structural typing):** an informal or formal interface specifying that an object must have a certain set of methods.\n- **Operator overloading:** providing a custom implementation for standard operators (like + or len()) for user-defined classes by defining special methods like __add__ or __len__.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **sum():** A built-in function that adds items of an iterable from left to right and returns the total.\n- **isinstance():** A built-in function that checks if an object is an instance or subclass of a class or a tuple of classes.\n- **typing.Protocol:** A base class for creating structural types in type hints.\n- **typing.runtime_checkable:** A decorator to mark a protocol class as a runtime protocol.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s trace what happens when we call `total_area([Circle(5), Square(3), Triangle(4,3)])` through the concepts we\'ve explored. First, **method overriding** ensures that when the loop calls `s.area()`, it executes `Circle.area` or `Square.area` respectively, dispatching to the correct implementation. Second, **duck typing** means `total_area` never checks if the objects inherit from `Shape`; it blindly trusts the objects to respond to `.area()`, allowing us to pass a `Rectangle` just as easily. Third, **protocol satisfaction** powers the `sum()` function and the `for` loop, which rely on the list\'s `__iter__` method to yield the geometric shapes one by one. Finally, **operator polymorphism** allows `math.pi * self.radius ** 2` to seamlessly multiply floats and integers behind the scenes. Python\'s power lies in trusting the object to handle the operation.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 26: Polymorphism and Duck Typing',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Polymorphism and Duck Typing',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Polymorphism via method overriding',
              prose: [
                'When you have a list of different geometric shapes, how do you calculate the total area without writing a massive `if/elif` chain checking the specific type of each shape? What happens if you add a new shape type later? If you use a single loop calling `.area()` on every shape, how does Python know which shape\'s area calculation to run?',
                'This prints `Woof!` then `Meow!`. What this proves: we can call the exact same method name (`speak`) on different objects, and Python executes the specific method implementation belonging to each object\'s class. This is called **Polymorphism**.'
              ],
              typeIt: true,
              solution: 'class Animal:\n    def speak(self):\n        return "..."\n\nclass Dog(Animal):\n    def speak(self):\n        return "Woof!"\n\nclass Cat(Animal):\n    def speak(self):\n        return "Meow!"\n\nanimals = [Dog(), Cat()]\nfor animal in animals:\n    print(animal.speak())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Polymorphism via method overriding — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class Shape:` defines the base class.\n- `def area(self):` is the method signature expected in subclasses.\n- `raise NotImplementedError` ensures subclasses must provide their own `area()` implementation.\n- `class Circle(Shape):` defines a subclass inheriting from `Shape`.\n- `def __init__(self, radius):` is the constructor.\n- `self.radius = radius` stores state.\n- `def area(self):` overrides the base class method.\n- `import math` brings in mathematical constants.\n- `return math.pi * self.radius ** 2` performs the circle area math.\n- `class Square(Shape):` creates a square subclass.\n- `return self.side ** 2` performs the square area math.\n- `class Triangle(Shape):` creates a triangle subclass.\n- `return 0.5 * self.base * self.height` performs the triangle area math.\n- `def total_area(shapes):` defines a function taking an iterable of shapes.\n- `sum(...)` computes the numerical total.\n- `s.area() for s in shapes` is a generator expression invoking the polymorphic `area()` method on each object.',
                '**Expected behavior.** Predicted confidently: ```python shapes = [Circle(5), Square(3), Triangle(4, 3)] for s in shapes: print(f\'{type(s).__name__}: area = {s.area():.2f}\') print(f\'Total: {total_area(shapes):.2f}\') # Circle: area = 78.54 # Square: area = 9.00 # Triangle: area = 6.00 # Total: 93.54 ```',
                '**CS lens.** This is **Polymorphism**. In computer science, this is subtyping polymorphism where an operation (like `.area()`) behaves differently depending on the type of object it is invoked upon. You see this in user interface rendering systems (calling `.draw()` on varied widgets), file systems (calling `.read()` on different file descriptor types), and payment processors (calling `.process()` on different credit card handlers).',
                '**SE lens.** Design Principle: The Open-Closed Principle. You can add new shapes (like `Hexagon`) without modifying the `total_area` function. Alternative NOT chosen: an `if isinstance(s, Circle): ... elif isinstance(s, Square): ...` block. The tradeoff is that the logic for calculating an area is decentralized into many classes instead of living in one procedural function, making it harder to see all area formulas at once but much easier to extend.'
              ],
              typeIt: true,
              solution: 'class Shape:\n    def area(self):\n        raise NotImplementedError\n\nclass Circle(Shape):\n    def __init__(self, radius):\n        self.radius = radius\n    def area(self):\n        import math\n        return math.pi * self.radius ** 2\n\nclass Square(Shape):\n    def __init__(self, side):\n        self.side = side\n    def area(self):\n        return self.side ** 2\n\nclass Triangle(Shape):\n    def __init__(self, base, height):\n        self.base = base\n        self.height = height\n    def area(self):\n        return 0.5 * self.base * self.height\n\ndef total_area(shapes):\n    return sum(s.area() for s in shapes)  # same call, different behavior',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Duck typing — no inheritance required',
              prose: [
                'Does Python actually care that `Circle` and `Square` inherit from `Shape`? What if we pass an object to `total_area` that doesn\'t inherit from `Shape`, but still has an `.area()` method?',
                'This prints `Quack!` and `I am impersonating a duck.`. What this proves: `Person` doesn\'t inherit from `Duck`, but because it has a `quack()` method, Python calls it successfully. Python checks for the method\'s presence at runtime, not the object\'s pedigree. This is called **Duck typing**.'
              ],
              typeIt: true,
              solution: 'class Duck:\n    def quack(self):\n        return "Quack!"\n\nclass Person:\n    def quack(self):\n        return "I am impersonating a duck."\n\ndef make_it_quack(obj):\n    print(obj.quack())\n\nmake_it_quack(Duck())\nmake_it_quack(Person())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Duck typing — no inheritance required — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class Rectangle:` defines a new class without `(Shape)`.\n- `def __init__(self, w, h):` initializes the state.\n- `def area(self):` provides the required method name for duck typing.\n- `return self.w * self.h` computes area.\n- `class Pentagon:` defines another standalone class.\n- `import math` is used for the complex area formula.\n- `def get_area(obj):` defines a helper function taking any object.\n- `try:` begins a block expecting potential errors.\n- `return obj.area()` attempts the method call.\n- `except AttributeError:` catches the specific error if `.area()` doesn\'t exist.\n- `raise TypeError(...)` throws a more descriptive error if it fails.',
                '**Expected behavior.** Predicted confidently: ```python print(total_area([Rectangle(4, 5), Pentagon(3)])) # 20 + 15.48... = 35.48... ```',
                '**CS lens.** This is **Duck typing**. It is a form of dynamic structural typing. You see this everywhere in dynamically typed languages like Ruby or JavaScript: functions that expect "file-like" objects with `.read()` and `.write()` methods, serialization functions expecting objects with `.to_json()` methods, and loggers expecting objects with `.format()` methods.',
                '**SE lens.** Design Principle: **EAFP (Easier to Ask Forgiveness than Permission)**. By trying `obj.area()` directly inside a `try/except` block, Python avoids the cost and fragility of an `hasattr(obj, \'area\')` check. Alternative NOT chosen: "LBYL" (Look Before You Leap) checking types ahead of time. The tradeoff is that setting up a try/except block has some overhead if exceptions are frequent, but it\'s typically faster in Python for the common case where the operation succeeds.'
              ],
              typeIt: true,
              solution: '# Duck typing: Python doesn\'t check isinstance. It just calls the method.\n# Any object with an .area() method works in total_area().\n\nclass Rectangle:     # does NOT inherit from Shape\n    def __init__(self, w, h):\n        self.w, self.h = w, h\n    def area(self):\n        return self.w * self.h\n\nclass Pentagon:      # also not a Shape subclass\n    def __init__(self, side):\n        self.side = side\n    def area(self):\n        import math\n        return (math.sqrt(5*(5+2*math.sqrt(5)))/4) * self.side**2\n\n# EAFP (Easier to Ask Forgiveness than Permission):\ndef get_area(obj):\n    try:\n        return obj.area()   # just try it\n    except AttributeError:\n        raise TypeError(f\'{type(obj).__name__} has no area() method\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Protocols and structural typing',
              prose: [
                'If Python lets you use any object as long as it has the right methods, how does a standard function like `sum()` or `list()` know that it can loop over our objects? What is the specific informal interface those built-in tools expect?',
                'This prints `0`, `10`, `20`. What this proves: By merely providing a `__getitem__` method, our object satisfies a sequence protocol that Python\'s `for` loop recognizes. This informal set of required methods is called a **Protocol**.'
              ],
              typeIt: true,
              solution: 'class MySequence:\n    def __getitem__(self, index):\n        if index < 3:\n            return index * 10\n        raise IndexError\n\nfor num in MySequence():\n    print(num)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Protocols and structural typing — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `class CountDown:` defines a custom class.\n- `def __init__(self, n):` saves the starting number.\n- `def __iter__(self):` is the special method that satisfies the **iterable protocol**.\n- `yield i` returns a value and suspends the function\'s execution until the next value is requested.',
                '**Expected behavior.** Predicted confidently: ```python print(list(CountDown(5))) # [5, 4, 3, 2, 1, 0] print(sum(CountDown(5))) # 15 ```',
                '**CS lens.** This is **Protocol satisfaction** or informal structural typing. In computer science, this is similar to interfaces in Java or traits in Rust, but implicit. You see this pattern in iterating over database cursors, streaming lines from a network socket, or lazily yielding paginated API results.',
                '**SE lens.** Design Principle: Programming to an Interface, not an Implementation. Python\'s built-in functions don\'t care if an object is a list or a dictionary; they only care if it yields values via `__iter__`. Alternative NOT chosen: restricting `list()` or `sum()` to only accept `list` objects. The tradeoff is that runtime errors occur if an object claims to implement a protocol but fails to yield the expected types, sacrificing compile-time safety for flexibility.'
              ],
              typeIt: true,
              solution: '# A protocol is an informal interface: a set of methods an object must have.\n# The \'iterable protocol\': object must have __iter__ or __getitem__\n\nclass CountDown:\n    def __init__(self, n):\n        self.n = n\n    def __iter__(self):\n        i = self.n\n        while i >= 0:\n            yield i\n            i -= 1',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'typing.Protocol — explicit structural typing',
              prose: [
                'Duck typing is great for flexibility, but how do we catch errors *before* the code runs? If an IDE or a tool like `mypy` is checking our code, how do we tell it "this function needs any object that has an `.area()` method" without forcing everything to inherit from `Shape`?',
                'What this proves: `CanFly` defines a formal structural type. A static type checker will allow passing a `Bird` to `launch` but will flag `Rock` as an error because it lacks a `fly` method, even though neither inherits from `CanFly`. This is called **explicit structural typing**.'
              ],
              typeIt: true,
              solution: 'from typing import Protocol\n\nclass CanFly(Protocol):\n    def fly(self) -> None: ...\n\nclass Bird:\n    def fly(self) -> None: pass\n\nclass Rock:\n    pass\n\ndef launch(item: CanFly):\n    item.fly()',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'typing.Protocol — explicit structural typing — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `from typing import Protocol, runtime_checkable` imports the required tools.\n- `@runtime_checkable` is a decorator that allows `isinstance()` to work with our protocol at runtime.\n- `class HasArea(Protocol):` defines a structural type.\n- `def area(self) -> float: ...` declares the required signature. The `...` (ellipsis) is literal syntax here acting as a placeholder.\n- `class NotAShape:` creates an empty class to test failure.\n- `c = Circle(5)` and `n = NotAShape()` instantiate objects.\n- `def print_area(shape: HasArea) -> None:` uses the protocol as a type hint.',
                '**Expected behavior.** Predicted confidently: ```python print(isinstance(c, HasArea)) # True: Circle has .area() print(isinstance(n, HasArea)) # False: NotAShape has no .area() print_area(c) # area = 78.54 # print_area(n) # mypy error: NotAShape doesn\'t implement HasArea ```',
                '**CS lens.** This is **Explicit Structural Typing**. Unlike nominal typing (where an object must inherit the exact type name), structural typing means an object is a match if its structure (its methods and properties) matches the requirement. You see this heavily in TypeScript\'s interface system and Go\'s interfaces.',
                '**SE lens.** Design Principle: Static Analysis and Tooling Support. Providing a `Protocol` allows tools like `mypy` to find bugs statically without abandoning the flexibility of duck typing at runtime. Alternative NOT chosen: requiring a strict `Shape` base class to satisfy type checkers. The tradeoff is adding cognitive overhead and boilerplate to define the protocol interfaces in exchange for earlier bug detection.'
              ],
              typeIt: true,
              solution: 'from typing import Protocol, runtime_checkable\n\n@runtime_checkable\nclass HasArea(Protocol):\n    def area(self) -> float: ...\n\nclass NotAShape:\n    pass\n\nc = Circle(5)\nn = NotAShape()\n\ndef print_area(shape: HasArea) -> None:\n    print(f\'area = {shape.area():.2f}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Operator overloading as polymorphism',
              prose: [
                'When you use the `+` operator, it adds numbers. But if you use it on strings, it concatenates them. How does one operator know how to handle fundamentally different types of data, and how can we make our own objects support these standard operators?',
                'This prints `30`. What this proves: We can define special double-underscore methods (like `__add__`) to dictate how standard operators behave on our custom objects. This is called **Operator overloading**.'
              ],
              typeIt: true,
              solution: 'class Wallet:\n    def __init__(self, dollars):\n        self.dollars = dollars\n    def __add__(self, other):\n        return Wallet(self.dollars + other.dollars)\n\nw1 = Wallet(10)\nw2 = Wallet(20)\nw3 = w1 + w2\nprint(w3.dollars)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Operator overloading as polymorphism — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `# \'+\' is polymorphic:` conceptually references the `__add__` method mapped to the `+` syntax.\n- `# len() is polymorphic:` references the `__len__` method.\n- `# sorted() is polymorphic over any iterable:` references the `__iter__` method used by the sorting utility.',
                '**Expected behavior.** Predicted confidently: ```python print(1 + 2) # 3 -- int.__add__ print(\'a\' + \'b\') # \'ab\' -- str.__add__ print([1] + [2]) # [1, 2] -- list.__add__ print(len(\'hello\')) # 5 -- str.__len__ print(len([1,2,3])) # 3 -- list.__len__ print(len({\'a\':1})) # 1 -- dict.__len__ print(sorted(\'hello\')) # [\'e\',\'h\',\'l\',\'l\',\'o\'] print(sorted({3,1,2})) # [1,2,3] print(sorted(range(5,0,-1))) # [1,2,3,4,5] ```',
                '**CS lens.** This is **Ad-hoc Polymorphism** or **Operator Overloading**. The same symbol (like `+`) is dispatched to different implementations depending on the types of its operands. You see this in matrix math libraries (where `*` does matrix multiplication), path manipulation libraries (where `/` joins file paths), and database query builders (where `==` constructs an SQL WHERE clause).',
                '**SE lens.** Design Principle: Principle of Least Astonishment. Overloading standard operators makes custom objects feel like built-in native types, integrating smoothly into the language. Alternative NOT chosen: forcing users to call `w1.add(w2)` instead of `w1 + w2`. The tradeoff is that heavily overloaded operators can become confusing if the meaning strays too far from conventional mathematics (e.g., using `+` to mean "delete").'
              ],
              typeIt: true,
              solution: '# \'+\' is polymorphic: works on int, str, list, etc.\n# len() is polymorphic:\n# sorted() is polymorphic over any iterable:\n# The power: one function, many types. No if isinstance() checks needed.',
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
      'Next lesson: Dataclasses and Named Tuples.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Operator overloading"?',
      options: [
        'providing a custom implementation for standard operators (like + or len()) for user-defined classes by defining special methods like __add__ or __len__.',
        'a common Python coding style that assumes the existence of valid keys or attributes and catches exceptions if the assumption proves false, rather than checking beforehand.',
        'the provision of a single interface to entities of different types. It allows one function or operator to act on multiple types of objects without needing type-checking logic.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "EAFP (Easier to Ask Forgiveness than Permission)"?',
      options: [
        'a common Python coding style that assumes the existence of valid keys or attributes and catches exceptions if the assumption proves false, rather than checking beforehand.',
        'providing a custom implementation for standard operators (like + or len()) for user-defined classes by defining special methods like __add__ or __len__.',
        'an informal or formal interface specifying that an object must have a certain set of methods.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Duck typing"?',
      options: [
        'a programming style where the type or class of an object is less important than the methods it defines. Python checks for the presence of a method, not the class inheritance.',
        'providing a custom implementation for standard operators (like + or len()) for user-defined classes by defining special methods like __add__ or __len__.',
        'the provision of a single interface to entities of different types. It allows one function or operator to act on multiple types of objects without needing type-checking logic.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Protocol (structural typing)"?',
      options: [
        'providing a custom implementation for standard operators (like + or len()) for user-defined classes by defining special methods like __add__ or __len__.',
        'a common Python coding style that assumes the existence of valid keys or attributes and catches exceptions if the assumption proves false, rather than checking beforehand.',
        'an informal or formal interface specifying that an object must have a certain set of methods.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Polymorphism** — the provision of a single interface to entities of different types. It allows one function or operator to act on multiple types of objects without needing type-checking logic.',
    '**Duck typing** — a programming style where the type or class of an object is less important than the methods it defines. Python checks for the presence of a method, not the class inheritance.',
    '**EAFP (Easier to Ask Forgiveness than Permission)** — a common Python coding style that assumes the existence of valid keys or attributes and catches exceptions if the assumption proves false, rather than checking beforehand.',
    '**Protocol (structural typing)** — an informal or formal interface specifying that an object must have a certain set of methods.',
    '**Operator overloading** — providing a custom implementation for standard operators (like + or len()) for user-defined classes by defining special methods like __add__ or __len__.',
  ],

  checkpoints: ['read-intuition'],
}
