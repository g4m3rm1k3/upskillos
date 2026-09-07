// Guttag — Lesson 20: Iterators and Generators
// Auto-converted from src/docs/tutorials/guttag-python/lesson-20.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-20-iterators-and-generators',
  slug: 'iterators-and-generators',
  chapter: 3,
  order: 1,
  title: 'Iterators and Generators',
  subtitle: 'Lazy Computation',
  tags: ['iterator-protocol', 'generator-function', 'stopiteration', 'iter', 'next', 'yield'],

  hook: {
    question: 'What is "Iterators and Generators", and why does it matter?',
    realWorldContext: 'The reader will understand the iterator protocol (`__iter__`, `__next__`), write generator functions with `yield`, build infinite generators, and use the `itertools` module. The transferable problems: (1) the iterator protocol is how Python\'s `for` loop actually works — it calls `__next__()` repeatedly; understanding this means you can make ANY object work with `for`; (2) a generator function suspends at each `yield` and resumes where it left off — it does not build the whole sequence in memory; (3) `itertools` gives you combinatorial generators (product, combinations, permutations) and sequence tools (chain, islice, cycle) that work lazily.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 7 core ideas: The Iterator Protocol, Making a custom iterator class, Generator functions — yield, Infinite generators, Generator expressions, itertools, Using yield from.',
    ],
    callouts: [],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 20: Iterators and Generators',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Iterators and Generators',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Iterator Protocol',
              prose: [
                'When you write `for item in [1, 2, 3]:`, Python somehow knows how to start at the beginning of the list, hand you one item at a time, and stop perfectly when the list runs out. What is the actual mechanism making this work, and how could we make our own objects participate in it? **Socratic prompt:** Think about what a loop needs to function mechanically. If you had to write a `while` loop that did exactly what a `for` loop does for a list, what three specific pieces of state or logic would you need to manage? Take a moment to sketch pseudocode for how a generic loop might ask an object for its next item.',
                '*Output (predicted with certainty without running):* ``` 1 2 3 StopIteration ``` This sequence proves that iteration is stateful. The `iter()` function takes an iterable and returns an iterator object (which keeps track of where we are). Calling `next()` advances the state and returns the item. When there is nothing left, a `StopIteration` exception is raised. The `for` loop is simply a syntactic wrapper around this `try/except` pattern. This is called the **iterator protocol**.',
                '## How the Code Works',
                '- `lst = [1, 2, 3]` — creates a standard Python list, which is an iterable.\n- `it = iter(lst)` — calls the built-in `iter` function, which delegates to the list\'s `__iter__()` method, returning a stateful iterator object.\n- `while True:` — begins an infinite loop, exactly what `for` does internally before finding an exit condition.\n- `try:` — sets up an exception handler, because the end of iteration is signaled via an exception in Python.\n- `item = next(it)` — calls the built-in `next` function, which delegates to the iterator\'s `__next__()` method. This fetches the value and advances the internal pointer.\n- `except StopIteration:` — catches the specific `StopIteration` exception that `__next__()` raises when no items remain.\n- `break` — exits the infinite loop cleanly.\n- `print(item)` — the actual body of what would be the `for` loop.\n- `iter(lst)` runs, requesting the iterator.\n- `next(it)` runs, returning `1`.\n- `next(it)` runs, returning `2`.\n- `next(it)` runs, returning `3`.\n- `next(it)` runs, raising `StopIteration`. The loop catches it and breaks.',
                '**CS lens.** This embodies the **Iterator pattern**, a behavioral design pattern that lets you traverse elements of a collection without exposing its underlying representation (list, stack, tree, etc.). Also recognized in: database cursors fetching rows one by one, file stream readers processing a file line by line without loading the whole file into RAM, and linked list traversal algorithms.',
                '**SE lens.** By designing iteration around a protocol (`__iter__` and `__next__`) rather than hardcoding how lists or dictionaries are traversed, Python achieves immense decoupling. The `for` loop code doesn\'t need to know whether it\'s iterating over a list, a string, an open file, or a custom object. The alternative would be writing different loop constructs for every data type (`for_list`, `for_dict`), which scales terribly and breaks the moment a developer creates a custom container class.'
              ],
              typeIt: true,
              solution: 'lst = [1, 2, 3]\nit = iter(lst)          \nprint(next(it))         \nprint(next(it))         \nprint(next(it))         \nnext(it)                ',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Making a custom iterator class',
              prose: [
                'If we want to build our own data structure, how do we let other developers loop over it using a standard `for` loop without them needing to call our custom `.get_item_at_index()` methods? **Socratic prompt:** Look at the iterator protocol we just covered. If you were defining a class `CountUp(start, stop)`, what specific methods would you need to define inside the class to satisfy the `iter()` and `next()` calls?',
                '*Output (predicted with certainty):* Nothing is printed. This proves that `for` is completely reliant on these magic methods. The `for` loop called `__iter__`, got `self`, called `__next__`, immediately hit `StopIteration`, and exited before ever running the loop body.',
                '## How the Code Works',
                '- `class CountUp:` — defines a new class.\n- `def __init__(self, start, stop):` — the constructor initializing the state (`self.current`) and the boundary (`self.stop`).\n- `def __iter__(self): return self` — the required method for the iterator protocol. By returning `self`, the object declares that it is its own iterator.\n- `def __next__(self):` — the required method to advance state.\n- `if self.current >= self.stop: raise StopIteration` — the exit condition. Once the count reaches the stop limit, it signals exhaustion.\n- `value = self.current` — stores the value to return before mutating state.\n- `self.current += 1` — mutates the state, preparing for the next call.\n- `return value` — yields the value back to the caller.\n- `for n in CountUp(1, 4):` — constructs the object, implicitly calls `iter()`, and begins the loop.\n- `CountUp(1, 4)` creates the object. `current=1`, `stop=4`.\n- `for` calls `iter()`, which returns the object itself.\n- `for` calls `next()`. `current` (1) is less than `stop` (4). Returns 1, increments `current` to 2.\n- `for` calls `next()`. Returns 2, increments `current` to 3.\n- `for` calls `next()`. Returns 3, increments `current` to 4.\n- `for` calls `next()`. `current` (4) equals `stop` (4). `StopIteration` raised. Loop ends.',
                '**CS lens.** This is **State Machine** behavior. The iterator maintains an internal state (`self.current`) and transitions to a new state every time `__next__` is called.',
                '**SE lens.** Writing a full class with `__iter__` and `__next__` is verbose, but it gives you total control over the iteration process. The tradeoff is boilerplate: for simple sequences, writing a full class with initialization and state mutation is heavy compared to just writing a function. We\'ll see the alternative next.'
              ],
              typeIt: true,
              solution: 'class DummyIter:\n    def __iter__(self):\n        return self\n    def __next__(self):\n        raise StopIteration\n\nfor x in DummyIter():\n    print("This will never print")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Generator functions — yield',
              prose: [
                'How can we create an iterator without the verbose boilerplate of defining a class with `__iter__` and `__next__` methods? **Socratic prompt:** If a normal function uses `return` to pass a value back and destroy its local variables, what would a function need to do to pass a value back but *keep* its local variables intact for the next time it\'s called?',
                '*Output (predicted with certainty):* ``` first second ``` This proves that `yield` suspends the function rather than destroying it. The function **generator** emits `"first"`, goes to sleep, and when `next()` is called again, it wakes up on the line immediately following the first `yield` and continues to the second. This is called a **generator function**.',
                '## How the Code Works',
                '- `def count_up(start, stop):` — defines a function. However, because the body contains the `yield` keyword, Python\'s parser marks this as a generator function, not a regular function.\n- `current = start` — initializes the local state.\n- `while current < stop:` — loops based on the boundary condition.\n- `yield current` — suspends the function, saves all local state (including the value of `current`), and emits the value to the caller.\n- `current += 1` — when the generator is resumed via `next()`, execution starts exactly here, mutating the state.\n- `gen = count_up(1, 4)` — calling a generator function does *not* execute its body. It returns a generator object.\n- `print(type(gen))` — prints `<class \'generator\'>`.\n- `print(next(gen))` — advances the generator, yielding `1`.\n- `next(gen)` (last line) — the `while` condition fails, the function naturally ends, which Python translates into raising `StopIteration`.\n- Call `count_up(1,4)` → nothing runs yet, returns a generator object.\n- First `next(gen)` → execution enters function, `current` is 1, hits `yield 1`, suspends, returns 1.\n- Second `next(gen)` → resumes after yield, increments `current` to 2, loops, hits `yield 2`, returns 2.\n- Third `next(gen)` → resumes after yield, increments `current` to 3, hits `yield 3`, returns 3.\n- Fourth `next(gen)` → increments to 4, `while 4 < 4` is False, loop exits, function ends, `StopIteration` raised.',
                '**CS lens.** This is **Coroutines** or **Continuations** (specifically, asymmetric coroutines). A routine that can suspend its execution and yield control back to the caller, only to be resumed later from the exact point of suspension.',
                '**SE lens.** The `yield` keyword shifts the burden of writing state machines from the developer to the compiler. The tradeoff is that generator functions can be slightly harder to debug conceptually because control flow jumps back and forth between the caller and the generator, breaking the traditional "functions run top-to-bottom and return once" mental model.'
              ],
              typeIt: true,
              solution: 'def pause_demo():\n    yield "first"\n    yield "second"\n\ngen = pause_demo()\nprint(next(gen))\nprint(next(gen))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Infinite generators',
              prose: [
                'If a list holds its data in memory, a list of all positive integers is impossible. How can we represent a mathematically infinite sequence in a finite program? **Socratic prompt:** If a generator only runs when `next()` is called, what happens if the generator has a `while True:` loop inside it? Will it crash the program immediately, or will it just wait patiently?',
                '*Output (predicted with certainty):* ``` 0 1 ``` This proves that infinite loops in generators do not freeze the program. The generator yields and waits. It only computes the next value when `next()` is called. We can represent infinity lazily.',
                '## How the Code Works',
                '- `import itertools` — brings in Python\'s standard library for iterator manipulation.\n- `def fibonacci():` — defines a generator function.\n- `a, b = 0, 1` — initializes the first two Fibonacci numbers.\n- `while True:` — creates an infinite loop.\n- `yield a` — yields the current Fibonacci number and suspends.\n- `a, b = b, a + b` — on resume, advances the sequence using tuple unpacking to update both variables simultaneously.\n- `itertools.islice(fibonacci(), 10)` — calls `islice`, which wraps the infinite generator. It will internally call `next()` exactly 10 times and then raise `StopIteration`, shielding the caller from the infinite loop.\n- `list(...)` — consumes the finite slice and collects the yielded items into memory.\n- `fibonacci()` returns an infinite generator object.\n- `islice` wraps it, creating a new iterator configured to stop after 10 pulls.\n- `list()` rapidly pulls 10 times.\n- `islice` reaches 10, raises `StopIteration`.\n- `list()` catches it and returns the completed list.',
                '**CS lens.** This embodies **Lazy Evaluation** (or call-by-need). Values are computed exactly at the moment they are needed, rather than computed upfront. This is identical to streams in Lisp or Scheme, providing a way to decouple the definition of a sequence (infinite) from the consumption of a sequence (finite).',
                '**SE lens.** Infinite generators perfectly separate the *generation* logic from the *termination* logic. The `fibonacci()` function doesn\'t need to accept a `max_terms` argument. The consumer decides when to stop. This increases the reusability of the generator.'
              ],
              typeIt: true,
              solution: 'def naturals():\n    n = 0\n    while True:\n        yield n\n        n += 1\n\ngen = naturals()\nprint(next(gen))\nprint(next(gen))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Generator expressions',
              prose: [
                'List comprehensions build a whole list in memory (`[x**2 for x in range(1_000_000)]`). If we only want to iterate over the squared numbers one by one, can we write a one-liner that doesn\'t waste RAM? **Socratic prompt:** A list comprehension uses brackets `[]`. If you change those brackets to parentheses `()`, what kind of object might Python construct instead?',
                '*Output (predicted with certainty):* ``` 8448728 208 ``` This proves that generator expressions (`()`) are fundamentally different from list comprehensions (`[]`). The list computes all million items immediately, consuming ~8MB. The generator expression computes nothing upfront, storing only the rule for how to compute items, consuming a constant ~208 bytes regardless of the sequence size.',
                '## How the Code Works',
                '- `(x**2 for x in range(10) if x % 2 == 0)` — a **generator expression**. The syntax is identical to a list comprehension, but bounded by parentheses. It returns a generator object.\n- `gen = ...` — stores the generator object.\n- `print(next(gen))` — pulls the first item (`0**2` = `0`).\n- `print(next(gen))` — pulls the second item (skips 1, calculates `2**2` = `4`).\n- `print(list(gen))` — pulls all *remaining* items into a list. Because 0 and 4 were already consumed, the list only contains `[16, 36, 64]`.\n- `next(gen)` yields 0.\n- `next(gen)` yields 4.\n- `list(gen)` exhausts the iterator, gathering the rest.',
                '**CS lens.** This is **Stream Processing**. Data flows through transformations without ever being materialized in a large intermediate buffer.',
                '**SE lens.** Generator expressions are stateful and consumable. Once an item is pulled out, it is gone forever. If you need to iterate over the data multiple times, a generator is the wrong choice; you must convert it to a list first. The tradeoff is memory efficiency vs. reusability.'
              ],
              typeIt: true,
              solution: 'import sys\nbig_list = [x**2 for x in range(1_000_000)]\nbig_gen = (x**2 for x in range(1_000_000))\n\nprint(sys.getsizeof(big_list)) \nprint(sys.getsizeof(big_gen))  ',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'itertools',
              prose: [
                'If you want to concatenate two lazy generators, you can\'t use the `+` operator, because `+` only works on realized lists in memory. How do we perform complex operations (chaining, zipping, permutations) while maintaining laziness? **Socratic prompt:** If you have an iterator of letters and an iterator of numbers, how would you lazily yield from the first until it\'s empty, and then instantly start yielding from the second?',
                '*Output (predicted with certainty):* ``` A B 1 ``` This proves `itertools.chain` seamlessly glues iterators together without materializing a new list in memory.',
                '## How the Code Works',
                '- `import itertools` — imports the iterator tools module.\n- `itertools.zip_longest([1,2],[10,20,30], fillvalue=0)` — standard `zip` stops when the shortest iterable stops. `zip_longest` continues until the longest one stops, padding the missing slots of the shorter one with `0`. Returns an iterator yielding tuples.\n- `list(...)` — consumes the tuples to display them.\n- `itertools.product(\'AB\', repeat=2)` — computes the Cartesian product (every possible combination with replacement). `repeat=2` is equivalent to `product(\'AB\', \'AB\')`. Returns an iterator yielding tuples.\n- `itertools.combinations(\'ABC\', 2)` — yields unique combinations of length 2 from the input iterable, without replacement. Order does not matter (`A,B` is the same as `B,A`, so only one is yielded). Returns an iterator yielding tuples.',
                '**CS lens.** This is **Combinatorics**. `itertools` provides highly optimized, C-level implementations of foundational mathematical permutations and combinations.',
                '**SE lens.** Using `itertools` avoids deeply nested `for` loops. `itertools.product` flattens what would be a multi-level nested loop into a single, lazy stream. The tradeoff is readability for those unfamiliar with the module, but it is heavily idiomatic in professional Python codebases.'
              ],
              typeIt: true,
              solution: 'import itertools\nletters = (x for x in "AB")\nnumbers = (x for x in [1, 2])\nchained = itertools.chain(letters, numbers)\nprint(next(chained))\nprint(next(chained))\nprint(next(chained))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Using yield from',
              prose: [
                'If a generator needs to yield every item from a list or another generator, writing `for item in sub_iterable: yield item` is verbose and slow. How can a generator directly delegate its output to a sub-iterator? **Socratic prompt:** If you have a recursive data structure like a list containing other lists, how would a generator dive into the inner lists and yield their items?',
                '*Output (predicted with certainty):* ``` [1, 2, 3] ``` This proves `yield from` directly connects the inner iterable to the outer caller. The `main_gen` delegates control entirely to `sub_gen` until `sub_gen` is exhausted, then resumes.',
                '## How the Code Works',
                '- `def flatten(lst):` — defines the generator function.\n- `for item in lst:` — iterates over the incoming iterable.\n- `if isinstance(item, list):` — checks if the current item is itself a list.\n- `yield from flatten(item)` — if it is a list, recursively calls `flatten(item)`. `yield from` unpacks the recursively yielded items and forwards them directly to the original caller.\n- `else:` — if it\'s a scalar value.\n- `yield item` — yields it normally.\n- `print(list(...))` — consumes the generator.\n- `flatten` sees `1`, yields `1`.\n- Sees `[2, 3]`, makes recursive call, `yield from` pipes `2` and `3` out.\n- Sees `[4, [5, 6]]`, recursively flattens, piping `4`, `5`, `6` out.\n- Sees `7`, yields `7`.',
                '**CS lens.** This is **Tree Traversal**. A nested list is structurally a tree. The generator is performing a depth-first search (DFS) over the tree, yielding leaf nodes.',
                '**SE lens.** `yield from` is functionally equivalent to writing an inner `for` loop, but it is heavily optimized in C under the hood, making it significantly faster for deep recursion. It also automatically handles propagating `StopIteration` and generator return values correctly, eliminating subtle edge case bugs.'
              ],
              typeIt: true,
              solution: 'def sub_gen():\n    yield 1\n    yield 2\n\ndef main_gen():\n    yield from sub_gen()\n    yield 3\n\nprint(list(main_gen()))',
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
    'Iterators and generators are the foundation of Python\'s memory-efficient processing. All of Python\'s built-in iteration tools (for, list comprehensions, map, filter, zip) use the same iterator protocol. Lesson 21 closes Module 2 with program structure, decomposition, and style.',
      'Next lesson: Program Structure.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "StopIteration"?',
      options: [
        'the specific exception raised by an iterator\'s __next__ method when there are no more items to return. It exists as a formal signal to consumers (like the for loop) that the iteration has cleanly finished, rather than crashing due to an error.',
        'the built-in function that requests an iterator object from an iterable. It exists to initialize the iteration process by calling the underlying __iter__ method on the target object.',
        'a function that uses yield instead of return to emit a sequence of values over time. It exists to allow computing a series of values lazily without storing the entire sequence in memory at once.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "next"?',
      options: [
        'the built-in function that requests the next value from an iterator. It exists to advance the iteration by calling the underlying __next__ method, handling the transition from one item to the next.',
        'the specific exception raised by an iterator\'s __next__ method when there are no more items to return. It exists as a formal signal to consumers (like the for loop) that the iteration has cleanly finished, rather than crashing due to an error.',
        'the built-in function that requests an iterator object from an iterable. It exists to initialize the iteration process by calling the underlying __iter__ method on the target object.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Generator function"?',
      options: [
        'the built-in function that requests the next value from an iterator. It exists to advance the iteration by calling the underlying __next__ method, handling the transition from one item to the next.',
        'the built-in function that requests an iterator object from an iterable. It exists to initialize the iteration process by calling the underlying __iter__ method on the target object.',
        'a function that uses yield instead of return to emit a sequence of values over time. It exists to allow computing a series of values lazily without storing the entire sequence in memory at once.'
      ],
      correct: 2,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "iter"?',
      options: [
        'the built-in function that requests an iterator object from an iterable. It exists to initialize the iteration process by calling the underlying __iter__ method on the target object.',
        'a function that uses yield instead of return to emit a sequence of values over time. It exists to allow computing a series of values lazily without storing the entire sequence in memory at once.',
        'the pair of methods (__iter__ and __next__) that an object must implement to support Python\'s iteration. It exists so that language constructs like for loops have a standardized way to request the "next" item from a sequence, regardless of how that sequence is stored or computed.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Iterator protocol** — the pair of methods (__iter__ and __next__) that an object must implement to support Python\'s iteration. It exists so that language constructs like for loops have a standardized way to request the "next" item from a sequence, regardless of how that sequence is stored or computed.',
    '**Generator function** — a function that uses yield instead of return to emit a sequence of values over time. It exists to allow computing a series of values lazily without storing the entire sequence in memory at once.',
    '**StopIteration** — the specific exception raised by an iterator\'s __next__ method when there are no more items to return. It exists as a formal signal to consumers (like the for loop) that the iteration has cleanly finished, rather than crashing due to an error.',
    '**iter** — the built-in function that requests an iterator object from an iterable. It exists to initialize the iteration process by calling the underlying __iter__ method on the target object.',
    '**next** — the built-in function that requests the next value from an iterator. It exists to advance the iteration by calling the underlying __next__ method, handling the transition from one item to the next.',
    '**yield** — the keyword that suspends a function\'s execution and emits a value to the caller. It exists to maintain the function\'s internal state between calls, so that the next time it is invoked, it resumes exactly where it left off instead of starting over.',
    '**yield from** — the keyword combination that delegates yielding to a sub-generator or another iterable. It exists to simplify writing recursive generators or yielding everything from another sequence without writing a manual for loop.',
  ],

  checkpoints: ['read-intuition'],
}
