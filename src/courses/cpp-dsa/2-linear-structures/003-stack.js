// cpp-dsa — Lesson 6: Stack
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 06 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-06-stack',
  slug: 'stack',
  chapter: 2,
  order: 3,
  title: 'Stack',
  subtitle: 'Linear Data Structures',
  tags: ['stack', 'lifo-last-in-first-out', 'call-stack'],

  hook: {
    question: 'What is "Stack", and why does it matter?',
    realWorldContext: 'You will implement a Last-In, First-Out (LIFO) stack from scratch using a singly linked list, exploring how strictly controlling access to data guarantees order. Then, you will visualize how the C++ language itself relies on a stack to manage function calls, before finally using the Standard Library\'s production-ready `std::stack`. The transferable problem this solves is managing strictly nested operations like undo histories, syntax parsing, or execution pausing.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Implementing LIFO over a Linked List, The Call Stack, std::stack.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Stack:** A data structure that strictly enforces Last-In, First-Out (LIFO) access. It exists To track state where the most recently added item must be processed before older items, preventing arbitrary mid-collection modifications.\n- **LIFO (Last-In, First-Out):** The semantic rule dictating that the last element added to a collection is the first one removed. It exists To guarantee that nested operations unwind in exact reverse order.\n- **Call Stack:** The internal memory structure the runtime uses to track active functions. It exists So that when a function finishes, the CPU knows exactly which line of code in the calling function to resume execution from.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'A stack enforces exactly one invariant: the last item pushed is the first item popped. We saw this implemented mechanically using a `head` pointer in a linked list, conceptually by the operating system pausing and resuming `functionA` and `functionB`, and practically using `std::stack` for browser history. Because the access pattern is strictly limited, stacks guarantee predictable unwinding.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you try to iterate over a `std::stack` like a vector, the compiler will fail. Modify the `std_stack.cpp` code to include a for-loop: \n\n```cpp\nfor (const auto& page : browserHistory) {\n    std::cout << page << "\\n";\n}\n```\n\n**The compiler error:** `error: invalid range expression of type \'std::stack<std::string>\'; no viable \'begin\' function available` A true stack does not have iterators. You are not allowed to scan through its elements, search for an item in the middle, or view the bottom item. If you need to do those things, a stack is the wrong data structure. The compiler enforces the LIFO contract by refusing to compile attempts to bypass the top.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Balanced Parentheses:** Write a script using `std::stack<char>`. Loop through the string `"( ( a + b ) * c )"`. Push every `(` onto the stack, and pop one off for every `)`. If the stack is empty at the end, the parentheses are balanced.\n- **Reverse a String:** Read a word from `std::cin`. Push every character of the string onto a `std::stack<char>`. Then, `pop` and print them one by one until the stack is empty. Verify the string prints backwards.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have implemented LIFO semantics over a linked list using `push`, `pop`, and `peek`.\n- [ ] You can trace the Call Stack\'s execution order through nested function calls.\n- [ ] You have compiled and run a script using `std::stack` and successfully retrieved items using `top()` before `pop()`.\n- [ ] You can explain out loud why `std::stack::pop()` returns `void` instead of the value.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 6: Stack',
        caption: 'Stack',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Implementing LIFO over a Linked List',
              prose: [
                'If you have a collection of actions (like a user\'s text edits) and they click "Undo", you must reverse the very last edit they made, not the first one. A raw array or linked list allows inserting and deleting anywhere, which is too permissive. You need a data structure that explicitly forbids accessing anything except the most recently added item.',
                '## How the Code Works',
                '- `#include <stdexcept>`: Brings in standard exception types like `std::runtime_error`.\n- `struct Node`: The familiar linked list node containing an integer and a pointer to the next node.\n- `Node* head = nullptr;`: A private pointer to the first node in the linked list. In stack terminology, the head of the list represents the "top" of the stack.\n- `void push(int value)`: The method signature for adding an item to the top.\n- `Node* newNode = new Node{value, head};`: Allocates a new node on the heap. Its `data` becomes the passed value, and its `next` pointer is set to the current `head`.\n- `head = newNode;`: Updates the `head` pointer to point to this brand-new node. The new node is now at the absolute front of the list, hiding the older nodes behind its `next` pointer.\n- `void pop()`: The method signature for removing the top item.\n- `if (head == nullptr) return;`: Guards against popping an empty stack, preventing a crash from trying to read a null pointer.\n- `Node* oldHead = head;`: Temporarily saves the address of the current top node.\n- `head = head->next;`: Moves the `head` pointer down one position, effectively forgetting the top node and making the second node the new top.\n- `delete oldHead;`: Frees the memory of the node we just removed. Because we saved its address in `oldHead`, we can safely delete it after moving `head`.\n- `int peek() const`: The method signature for reading the top item without removing it.\n- `if (head == nullptr) throw std::runtime_error("Stack is empty");`: Throws an exception if the caller tries to peek at an empty stack, as there is no valid integer to return.\n- `return head->data;`: Returns the integer stored in the top node without altering the `head` pointer, leaving the stack\'s state unchanged.\n- `bool isEmpty() const`: Returns `true` if the stack has no items.\n- `return head == nullptr;`: Checks if the head pointer is null.\n- `~LinkedStack()`: The destructor automatically loops while the stack is not empty, calling `pop()` repeatedly to free all allocated nodes when the stack goes out of scope.\n- `stack.push(10);`: Pushes `10` onto the stack.\n- `stack.pop();`: Removes the top element.',
                '**CS lens.** This structure strictly forces O(1) constant time for both insertion and removal. Because every operation only ever touches the `head` pointer, the stack never has to traverse the rest of the list. It takes the exact same amount of time to push or pop whether the stack has zero items or a million.',
                '**SE lens.** The design principle here is encapsulation. A linked list can theoretically insert or delete at any position. By making `head` private and only writing `push` and `pop` methods, `LinkedStack` guarantees to the rest of the program that its LIFO semantics cannot be violated. You cannot accidentally delete the middle item because there is no method exposed that allows it.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <stdexcept>\n\nstruct Node {\n    int data;\n    Node* next;\n};\n\nclass LinkedStack {\nprivate:\n    Node* head = nullptr;\n\npublic:\n    void push(int value) {\n        Node* newNode = new Node{value, head};\n        head = newNode;\n    }\n\n    void pop() {\n        if (head == nullptr) return;\n        Node* oldHead = head;\n        head = head->next;\n        delete oldHead;\n    }\n\n    int peek() const {\n        if (head == nullptr) throw std::runtime_error("Stack is empty");\n        return head->data;\n    }\n\n    bool isEmpty() const {\n        return head == nullptr;\n    }\n\n    ~LinkedStack() {\n        while (!isEmpty()) {\n            pop();\n        }\n    }\n};\n\nint main() {\n    LinkedStack stack;\n    stack.push(10);\n    stack.push(20);\n    stack.push(30);\n\n    std::cout << "Top is: " << stack.peek() << "\\n";\n    stack.pop();\n    std::cout << "Top after pop is: " << stack.peek() << "\\n";\n\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The Call Stack',
              prose: [
                'When `main()` calls `functionA()`, and `functionA()` calls `functionB()`, the computer must pause `main()`, execute `functionA()`, pause `A`, execute `B`, and then un-pause `A` exactly where it left off. You need to understand how the operating system uses LIFO semantics to track this execution order.',
                '## How the Code Works',
                '- `main()` starts — The OS pushes the `main` function onto the internal Call Stack.\n- `std::cout << "Starting main\\n";` — Executes normally.\n- `functionA();` — `main()` pauses. The OS pushes the memory address of the next line inside `main` onto the Call Stack, and control jumps to `functionA`. The top of the stack is now `functionA`.\n- `std::cout << "Entering A\\n";` — Executes inside `A`.\n- `functionB();` — `functionA` pauses. The OS pushes `functionA`\'s return address onto the stack. Control jumps to `functionB`. The top of the stack is now `functionB`.\n- `std::cout << "Inside B\\n";` — Executes inside `B`.\n- `functionB()` finishes — The OS pops the top frame off the Call Stack. It sees the return address for `functionA` and jumps back there.\n- `std::cout << "Exiting A\\n";` — `A` resumes and finishes.\n- `functionA()` finishes — The OS pops the top frame again, revealing `main`\'s return address, and jumps back to `main`.\n- `std::cout << "Ending main\\n";` — `main` resumes and finishes.',
                '**CS lens.** The Call Stack proves that LIFO isn\'t just an abstract data structure; it is the fundamental mechanism that makes modern procedural programming possible. Without a stack, a language could not support functions calling other functions, because it would have no way to remember the sequence of return addresses. If a stack frame grows too large or too many nested calls occur (like infinite recursion), the stack runs out of memory, causing a "Stack Overflow."',
                '**SE lens.** The alternative not chosen in early computing history was statically allocating all function variables globally. The tradeoff there meant functions could not be re-entrant (a function could not safely call itself) because the global variables would be overwritten. A stack allocates fresh memory (a "stack frame") for local variables every time a function is pushed, explicitly enabling recursion.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nvoid functionB() {\n    std::cout << "Inside B\\n";\n}\n\nvoid functionA() {\n    std::cout << "Entering A\\n";\n    functionB();\n    std::cout << "Exiting A\\n";\n}\n\nint main() {\n    std::cout << "Starting main\\n";\n    functionA();\n    std::cout << "Ending main\\n";\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'std::stack',
              prose: [
                'Writing a custom `LinkedStack` class requires manual memory management and is prone to bugs. When you need a stack in a real project, you should use a battle-tested, production-ready container from the C++ Standard Library instead of writing your own.',
                '## How the Code Works',
                '- `#include <stack>`: Instructs the compiler to include the standard library file containing the `std::stack` adapter.\n- `std::stack<std::string> browserHistory;`: Declares a standard stack that holds strings. Under the hood, this doesn\'t implement its own data structure; it uses another container (by default, `std::deque`) and restricts its interface to only allow stack operations.\n- `browserHistory.push("Home Page");`: Adds the string to the top of the stack.\n- `browserHistory.push("Search Results");`: Adds the next string to the top.\n- `browserHistory.push("Article Page");`: Adds the final string to the top.\n- `browserHistory.top()`: Returns a reference to the element at the absolute top of the stack. Unlike our custom `peek()`, the standard library names this method `top()`.\n- `browserHistory.pop()`: Removes the top element. Crucially, in C++, `pop()` returns `void`. It deletes the top element but does not give it back to you. If you need the value, you must call `top()` before calling `pop()`.',
                '**CS lens.** This is known as the Command-Query Separation principle. The C++ standard library splits looking at the data (Query: `top()`) from mutating the data (Command: `pop()`). If `pop()` returned the value by value, it would require copying the object. If the copy constructor threw an exception, the item would be permanently lost from the stack but never received by the caller. Splitting them makes the structure exception-safe.',
                '**SE lens.** The standard library implemented `std::stack` as a "container adapter", not a container. By default, it wraps a `std::deque` (double-ended queue), but you can optionally tell it to wrap a `std::vector` or a `std::list`. The tradeoff here is maximum reusability. Instead of writing duplicate logic for different memory layouts, the library developers wrote the LIFO logic once and let it adapt to existing sequence containers.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <stack>\n#include <string>\n\nint main() {\n    std::stack<std::string> browserHistory;\n\n    browserHistory.push("Home Page");\n    browserHistory.push("Search Results");\n    browserHistory.push("Article Page");\n\n    std::cout << "Currently viewing: " << browserHistory.top() << "\\n";\n    \n    browserHistory.pop(); // Click the \'Back\' button\n    \n    std::cout << "Went back. Now viewing: " << browserHistory.top() << "\\n";\n\n    return 0;\n}',
              code: '',
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
      'If the simulated output doesn\'t match what you expected, re-read the reference code line by line — the walkthrough above explains exactly what each line does.',
      'Compile errors in real C++ are informative — read the first error the compiler reports, not the last; later errors are often just fallout from the first one.',
    ],
    futureLinks: [
      'Next lesson: Queue.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Stack"?',
      options: [
        'The internal memory structure the runtime uses to track active functions. It exists So that when a function finishes, the CPU knows exactly which line of code in the calling function to resume execution from.',
        'A data structure that strictly enforces Last-In, First-Out (LIFO) access. It exists To track state where the most recently added item must be processed before older items, preventing arbitrary mid-collection modifications.',
        'The semantic rule dictating that the last element added to a collection is the first one removed. It exists To guarantee that nested operations unwind in exact reverse order.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "LIFO (Last-In, First-Out)"?',
      options: [
        'The semantic rule dictating that the last element added to a collection is the first one removed. It exists To guarantee that nested operations unwind in exact reverse order.',
        'The internal memory structure the runtime uses to track active functions. It exists So that when a function finishes, the CPU knows exactly which line of code in the calling function to resume execution from.',
        'A data structure that strictly enforces Last-In, First-Out (LIFO) access. It exists To track state where the most recently added item must be processed before older items, preventing arbitrary mid-collection modifications.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Call Stack"?',
      options: [
        'The internal memory structure the runtime uses to track active functions. It exists So that when a function finishes, the CPU knows exactly which line of code in the calling function to resume execution from.',
        'A data structure that strictly enforces Last-In, First-Out (LIFO) access. It exists To track state where the most recently added item must be processed before older items, preventing arbitrary mid-collection modifications.',
        'The semantic rule dictating that the last element added to a collection is the first one removed. It exists To guarantee that nested operations unwind in exact reverse order.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Stack** — A data structure that strictly enforces Last-In, First-Out (LIFO) access. It exists To track state where the most recently added item must be processed before older items, preventing arbitrary mid-collection modifications.',
    '**LIFO (Last-In, First-Out)** — The semantic rule dictating that the last element added to a collection is the first one removed. It exists To guarantee that nested operations unwind in exact reverse order.',
    '**Call Stack** — The internal memory structure the runtime uses to track active functions. It exists So that when a function finishes, the CPU knows exactly which line of code in the calling function to resume execution from.',
  ],

  checkpoints: ['read-intuition'],
}
