// Guttag — Lesson 14: Modules and Packages
// Auto-converted from src/docs/tutorials/guttag-python/lesson-14.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-14-modules-and-packages',
  slug: 'modules-and-packages',
  chapter: 2,
  order: 9,
  title: 'Modules and Packages',
  subtitle: 'import and the Standard Library',
  tags: ['module', 'package', 'namespace', 'alias', 'standard-library'],

  hook: {
    question: 'What is "Modules and Packages", and why does it matter?',
    realWorldContext: 'The reader understands Python\'s module system: `import`, `from...import`, aliasing (`as`), writing their own module, and key standard library modules (`math`, `random`, `os`, `sys`, `collections`, `itertools`). The transferable insight: a module is a namespace. `import math` gives you the `math` namespace; `math.sqrt` is the `sqrt` function in that namespace. This prevents name conflicts and enables code reuse across files.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: import and module namespaces, from...import and import...as, Writing your own module, Key standard library modules, Package structure and __init__.py.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Module:** a single Python file containing code (functions, classes, variables) meant to be reused. It serves as an isolated namespace, preventing naming collisions.\n- **Package:** a directory containing multiple modules, usually marked by an __init__.py file, allowing hierarchical organization of code.\n- **Namespace:** a container where names (variables, functions, classes) are mapped to objects. It ensures that names in different modules don\'t clash.\n- **Alias:** a temporary alternative name given to an imported module or function (using as), usually to make the code shorter or avoid name conflicts.\n- **Standard Library:** the collection of built-in modules that come packaged with Python, providing ready-to-use tools for math, system operations, and data structures.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **math:** A standard library module for mathematical functions.\n- **math.sqrt:** A function to calculate the square root of a number.\n- **math.pi:** The mathematical constant π.\n- **dir():** A built-in function to list names within a namespace.\n- **type():** A built-in function to get an object\'s exact type.\n- **random:** A standard library module for random number generation.\n- **os:** A standard library module for operating system interfaces.\n- **sys:** A standard library module for interpreter system-specific parameters.\n- **collections.Counter:** A dictionary subclass designed for counting hashable objects.\n- **__name__:** A special built-in variable inside every Python module.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'We started by importing a built-in module, tracing how `import math` creates a namespace and allows us to call `math.sqrt(144)`. We then learned how to define our own functionality by writing `mymath.py` with a `square()` function. We traced how `import mymath` creates a namespace from our file, letting us execute `mymath.square(12)`. We leveraged other powerful standard libraries like `random`, `os`, and `Counter` to get complex behavior for free. Finally, we grouped modules into packages using `__init__.py`, organizing our codebase into hierarchical namespaces. Whether using `import math` or `import mypackage.utils`, the transferable insight is the same: modules are namespaces that cleanly organize and encapsulate code.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 14: Modules and Packages',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Modules and Packages',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'import and module namespaces',
              prose: [
                'How do we use code that someone else wrote, or organize our own code across multiple files without names colliding? What if two files both define a `calculate()` function? How do we tell Python which one we mean?',
                'This is called an **import**. It proves that `math` behaves as an isolated container (a namespace) where all mathematical functions live. Python finds `math.py` in the standard library, executes it, stores the resulting namespace as the name `math`, and allows us to look up functions like `sqrt` using the `.` operator.'
              ],
              typeIt: true,
              solution: 'import math\n\nprint(math.pi)          # 3.141592653589793\nprint(math.sqrt(16))    # 4.0\nprint(math.floor(3.7))  # 3\nprint(type(math))       # <class \'module\'>\n\nprint([x for x in dir(math) if not x.startswith(\'_\')][:5])\n# [\'acos\', \'acosh\', \'asin\', \'asinh\', \'atan\']',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'import and module namespaces — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import` is a keyword that tells Python to load a module.\n- `math` is the name of the standard library module to load.\n- `print` is the built-in function to display output.\n- `(` opens the call to print.\n- `math.sqrt` accesses the `sqrt` function inside the `math` namespace using the `.` operator.\n- `(` opens the call to `math.sqrt`.\n- `144` is the integer argument passed to `sqrt`.\n- `)` closes the call to `math.sqrt`.\n- `)` closes the call to `print`.',
                '**Expected behavior.** Predicted confidently: `12.0`',
                '**CS lens.** This is the concept of a **Namespace**. In computer science, namespaces provide scope for names so that the same name can be used in different contexts without ambiguity. Real-world appearances include file systems (directories), XML namespaces, domain names (DNS), and network subnets.',
                '**SE lens.** This demonstrates the principle of **Encapsulation** and **Modularity**. The alternative not chosen would be to have all functions loaded globally (e.g., just `sqrt()`). The tradeoff is that typing `math.` is slightly more verbose, but it completely eliminates name collisions, keeping the global scope clean and organized.'
              ],
              typeIt: true,
              solution: 'import math\nprint(math.sqrt(144))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'from...import and import...as',
              prose: [
                'What if we use `math.sqrt` dozens of times and typing `math.` becomes tedious? Is there a way to bring a specific function directly into our current namespace without bringing in everything else?',
                'This is called a **from...import** and **import...as**. It proves that you can extract specific names into the local namespace, binding the local name `sqrt` directly to the `math.sqrt` function object. It also proves you can rename a module locally (`as m`) to save typing while avoiding the module prefix.'
              ],
              typeIt: true,
              solution: 'from math import sqrt, pi\nprint(sqrt(25))  # 5.0\nprint(pi)        # 3.141592653589793\n\nimport math as m\nprint(m.sqrt(9)) # 3.0',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'from...import and import...as — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `from` is a keyword indicating the source module.\n- `math` is the module name.\n- `import` is the keyword indicating what names to extract.\n- `sqrt` is the specific function being brought into the local namespace.\n- `print` is the built-in output function.\n- `(` opens the call to print.\n- `sqrt` is called directly without the `math.` prefix.\n- `(` opens the call to `sqrt`.\n- `144` is the integer argument.\n- `)` closes the `sqrt` call.\n- `)` closes the `print` call.',
                '**Expected behavior.** Predicted confidently: `12.0`',
                '**CS lens.** This is **Symbol Binding**. We are binding a specific symbol (`sqrt`) from an external dictionary directly into our current environment dictionary. Real-world appearances include dynamic linking in C (`dlsym`), destructuring imports in JavaScript, SQL aliasing (`SELECT name AS n`), and shell aliases.',
                '**SE lens.** This touches on **Coupling vs. Convenience**. The alternative not chosen is `from math import *`. The real tradeoff is that `from math import *` is highly convenient but creates "namespace pollution," where it becomes impossible to track where a function originated if multiple modules are imported this way. `from math import sqrt` is explicit, trackable, and much safer.'
              ],
              typeIt: true,
              solution: 'from math import sqrt\nprint(sqrt(144))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Writing your own module',
              prose: [
                'How do we separate our own code into multiple files? If we define a function in one file, how do we use it in another without copy-pasting it?',
                'This is called a **custom module**. It proves that any Python file can be imported by another Python file. It also proves that when imported, Python looks for the file in `sys.path`, executes it, but skips the `if __name__ == \'__main__\'` block because `__name__` is not `\'__main__\'` during an import.'
              ],
              typeIt: true,
              solution: '# File: throwaway_math.py\ndef square(x):\n    return x * x\n\nif __name__ == \'__main__\':\n    print(square(3))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Writing your own module — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def square(x):` defines a function named `square` taking parameter `x`.\n- `return x * x` calculates and returns the square.\n- `def cube(x):` defines a function `cube`.\n- `return x * x * x` returns the cube.\n- `PI = 3.14159` defines a module-level constant.\n- `if` starts a conditional statement.\n- `__name__` is a built-in variable holding the context name.\n- `==` is the equality operator.\n- `\'__main__\'` is the string value `__name__` gets when the script is run directly.\n- `:` starts the block.\n- `print` outputs testing information.\n- `import mymath` in `main.py` locates `mymath.py` and creates a namespace.\n- `mymath.square(12)` calls the `square` function from our custom module namespace.\n- `mymath.PI` accesses the constant from our custom module namespace.',
                '**Expected behavior.** Predicted confidently: ``` 144 3.14159 ```',
                '**CS lens.** This is **Code Organization**. Software is decomposed into separate files for maintainability and code reuse. Real-world appearances include header files in C/C++, classes in Java, modules in Rust, and components in React.',
                '**SE lens.** This relies on the **Single Responsibility Principle**. A module should group related functionality (like math operations). The alternative not chosen is putting all code in a massive `main.py` file. The tradeoff is having to manage multiple files and imports, but it scales to large codebases where a single file would be completely unreadable.'
              ],
              typeIt: true,
              solution: '# mymath.py\ndef square(x):\n    return x * x\n\ndef cube(x):\n    return x * x * x\n\nPI = 3.14159\n\nif __name__ == \'__main__\':\n    print(\'Testing mymath:\')\n    print(square(3))\n    print(cube(3))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Key standard library modules',
              prose: [
                'How do we generate random numbers, interact with the operating system, or efficiently count items without writing everything from scratch?',
                'This is the **Standard Library**. It proves that Python comes with batteries included for common system, math, and data structure tasks. For example, `Counter` iterates the string, counts each character, and `most_common` returns the highest occurrences.'
              ],
              typeIt: true,
              solution: 'import random\nimport os\nimport sys\nfrom collections import Counter\n\nprint(random.randint(1, 6))\nprint(os.getcwd())\nprint(sys.version[:5])\nc = Counter(\'abracadabra\')\nprint(c.most_common(1))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Key standard library modules — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import random` loads the random number generator module.\n- `import os` loads the operating system interface module.\n- `import sys` loads interpreter system tools.\n- `from collections import Counter` imports a specific class for counting.\n- `random.randint` is called to generate an integer.\n- `1, 6` are the bounds passed to `randint`.\n- `os.getcwd()` calls a function to get the Current Working Directory.\n- `sys.version` accesses a string property containing the Python version.\n- `Counter` is instantiated with the string literal `\'abracadabra\'`.\n- `c` is the variable storing the Counter object.\n- `c.most_common` is a method on the Counter object.\n- `(3)` specifies we want the top 3 items.',
                '**Expected behavior.** Predicted confidently: *(Output will vary due to random/os/sys, but structurally:)* ``` 4 /current/directory/path 3.x.x (version info) [(\'a\', 5), (\'b\', 2), (\'r\', 2)] ```',
                '**CS lens.** This is **Standard API usage**. Most ecosystems provide a core set of battle-tested utilities. Real-world appearances include the POSIX standard in C, the JDK in Java, the .NET Base Class Library, and Node\'s core modules (`fs`, `path`).',
                '**SE lens.** This shows **Don\'t Reinvent the Wheel**. The alternative not chosen is writing a custom pseudo-random number generator or building a custom tallying dictionary. The tradeoff: you must learn the standard API\'s specific quirks, but you gain reliability, performance (many are backed by fast C code), and your code is instantly recognizable to other developers.'
              ],
              typeIt: true,
              solution: 'import random\nimport os\nimport sys\nfrom collections import Counter\n\nprint(random.randint(1, 6))\nprint(os.getcwd())\nprint(sys.version)\nc = Counter(\'abracadabra\')\nprint(c.most_common(3))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Package structure and __init__.py',
              prose: [
                'What if we have dozens of modules? How do we group related modules (like multiple files for database interaction) into a single folder and import them cleanly?',
                'This is called a **Package**. It proves that a directory containing an `__init__.py` file acts as a hierarchical module namespace. Python checks `sys.path`, finds the `mypackage/` directory with `__init__.py`, executes the package init, executes `utils.py`, and binds `mypackage.utils` as a namespace.'
              ],
              typeIt: true,
              solution: '# Directory mypackage/\n# mypackage/__init__.py\n# mypackage/utils.py\n\n# In main.py:\n# import mypackage.utils',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Package structure and __init__.py — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `mypackage/` is a physical directory created on the filesystem.\n- `__init__.py` is a special file name that tells Python to treat the directory as a package.\n- `def helper_fn():` defines a function inside `utils.py`.\n- `return "Helper working!"` returns a string.\n- `import mypackage.utils` uses dot notation to import a submodule from a package namespace.\n- `print` is called to output the result.\n- `mypackage.utils.helper_fn()` accesses the function through the package and module namespaces.\n- `import sys` loads the system module.\n- `sys.path` accesses the list of directories Python searches for imports.\n- `[:1]` slices the list to show just the first entry.',
                '**Expected behavior.** Predicted confidently: ``` Helper working! [\'/current/working/directory\'] ```',
                '**CS lens.** This is **Hierarchical Namespaces**. By using directories, namespaces become a tree rather than a flat list. Real-world appearances include Java packages (`com.company.project`), DNS domains (`www.example.com`), URL paths, and REST API route grouping.',
                '**SE lens.** This supports **Large-Scale Architecture**. The alternative not chosen is prefixing filenames (e.g., `mypackage_utils.py`) in a flat directory. The tradeoff: packages require maintaining `__init__.py` files and managing deep imports, but they allow proper encapsulation of subsystems.'
              ],
              typeIt: true,
              solution: '# mypackage/__init__.py\n# (Empty file to mark the directory as a package)\n\n# mypackage/utils.py\ndef helper_fn():\n    return "Helper working!"',
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
      'Next lesson: Exceptions.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Namespace"?',
      options: [
        'a directory containing multiple modules, usually marked by an __init__.py file, allowing hierarchical organization of code.',
        'a container where names (variables, functions, classes) are mapped to objects. It ensures that names in different modules don\'t clash.',
        'a single Python file containing code (functions, classes, variables) meant to be reused. It serves as an isolated namespace, preventing naming collisions.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Package"?',
      options: [
        'a directory containing multiple modules, usually marked by an __init__.py file, allowing hierarchical organization of code.',
        'a temporary alternative name given to an imported module or function (using as), usually to make the code shorter or avoid name conflicts.',
        'the collection of built-in modules that come packaged with Python, providing ready-to-use tools for math, system operations, and data structures.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Alias"?',
      options: [
        'a container where names (variables, functions, classes) are mapped to objects. It ensures that names in different modules don\'t clash.',
        'a temporary alternative name given to an imported module or function (using as), usually to make the code shorter or avoid name conflicts.',
        'the collection of built-in modules that come packaged with Python, providing ready-to-use tools for math, system operations, and data structures.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Module"?',
      options: [
        'a directory containing multiple modules, usually marked by an __init__.py file, allowing hierarchical organization of code.',
        'a single Python file containing code (functions, classes, variables) meant to be reused. It serves as an isolated namespace, preventing naming collisions.',
        'the collection of built-in modules that come packaged with Python, providing ready-to-use tools for math, system operations, and data structures.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Module** — a single Python file containing code (functions, classes, variables) meant to be reused. It serves as an isolated namespace, preventing naming collisions.',
    '**Package** — a directory containing multiple modules, usually marked by an __init__.py file, allowing hierarchical organization of code.',
    '**Namespace** — a container where names (variables, functions, classes) are mapped to objects. It ensures that names in different modules don\'t clash.',
    '**Alias** — a temporary alternative name given to an imported module or function (using as), usually to make the code shorter or avoid name conflicts.',
    '**Standard Library** — the collection of built-in modules that come packaged with Python, providing ready-to-use tools for math, system operations, and data structures.',
  ],

  checkpoints: ['read-intuition'],
}
