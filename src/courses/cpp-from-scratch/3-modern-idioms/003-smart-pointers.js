// cpp-from-scratch — Lesson 17: Smart Pointers
// Auto-converted from src/docs/projects/cpp-from-scratch/Lesson 17 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-from-scratch-17-smart-pointers',
  slug: 'smart-pointers',
  chapter: 3,
  order: 3,
  title: 'Smart Pointers',
  subtitle: 'Modern C++ Idioms',
  tags: ['smart-pointer', 'ownership', 'reference-count', 'cyclic-reference'],

  hook: {
    question: 'What is "Smart Pointers", and why does it matter?',
    realWorldContext: 'A console application that automatically cleans up its own memory when objects go out of scope or are explicitly transferred. You will establish strict ownership rules that prevent memory leaks and dangling pointers, forming the foundation of safe modern C++.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 4 core ideas: std::unique_ptr and std::make_unique, Transferring Ownership with std::move, std::shared_ptr, std::weak_ptr.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Smart Pointer:** a class that wraps a raw pointer and manages the allocation and deletion of the memory it points to. It exists It uses RAII to guarantee that dynamically allocated memory is freed exactly when it should be, without requiring manual delete calls.\n- **Ownership:** the responsibility of a specific pointer to destroy the resource it points to. It exists It clarifies who is responsible for memory cleanup, preventing double-deletes and memory leaks by design.\n- **Reference Count:** a hidden integer tracking how many smart pointers are currently pointing to the same block of memory. It exists It allows shared ownership where the last pointer to leave scope is the one that cleans up the memory.\n- **Cyclic Reference:** a scenario where two objects hold shared pointers to each other, keeping their reference counts above zero permanently. It exists It is a structural memory leak in reference-counted systems, requiring a non-owning pointer type to break the loop.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::unique_ptr&lt;T&gt;:** A smart pointer that strictly enforces exclusive ownership of a dynamically allocated object.\n- **std::make_unique&lt;T&gt;():** A helper function that safely allocates memory and immediately wraps it in a std::unique_ptr.\n- **std::shared_ptr&lt;T&gt;:** A smart pointer that shares ownership of an object through reference counting.\n- **std::make_shared&lt;T&gt;():** A helper function that allocates both the object and its reference counting control block in a single memory chunk.\n- **std::weak_ptr&lt;T&gt;:** A smart pointer that observes an object managed by shared_ptr without increasing its reference count or claiming ownership.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: '**Connect the pieces** A resource is created with `make_shared`, generating a control block with a reference count of 1. It is passed into an observer class which stores it as a `weak_ptr`, leaving the count at 1. When the original scope ends, the `shared_ptr` is destroyed, dropping the count to 0 and freeing the memory. Later, the observer calls `lock()` on its `weak_ptr`, receives an empty pointer, and safely handles the fact that the resource is gone, avoiding a catastrophic segmentation fault. **What breaks without this** Remove the `#include <memory>` directive at the top of the file. **The Failure:** ``` error: \'unique_ptr\' is not a member of \'std\' ``` Smart pointers are not built directly into the core language grammar like raw pointers are; they are standard library templates that must be explicitly included. **Exercises** 1. **The Factory:** Write a function `CreateResource()` that creates a resource using `make_unique` and returns it by value. Call the function from `main` and catch the returned pointer in a local `unique_ptr` variable. 2. **The Cache:** Create an array of 3 `weak_ptr<Resource>` objects. Write a loop that populates them with temporary `shared_ptr` objects inside a block, then loops again outside the block and uses `lock()` to prove they have all expired. **Definition of done** - [ ] You can explain why raw `new` and `delete` are dangerous and cause memory leaks. - [ ] You can use `std::make_unique` to allocate memory and automatically free it. - [ ] You can use `std::move` to transfer ownership of a `unique_ptr`. - [ ] You can explain when `shared_ptr` is necessary and how the reference count works. - [ ] You can explain what a cyclic reference is and how `weak_ptr` prevents it.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 17: Smart Pointers',
        caption: 'Smart Pointers',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'std::unique_ptr and std::make_unique',
              prose: [
                'If you allocate memory dynamically with `new`, you must manually free it with `delete`. If a function returns early or throws an exception before `delete` is reached, the memory is lost permanently (a memory leak). You need a way to tie the lifecycle of dynamic memory to the predictable scoping rules of normal variables.',
                '## How the Code Works',
                '- `#include <memory>`: Includes the standard library header that provides all smart pointer types and their helper functions.\n- `class Resource`: A standard class that prints messages in its constructor and destructor, allowing us to see exactly when memory is allocated and freed.\n- `std::unique_ptr<Resource>`: Declares a smart pointer variable that exclusively owns a `Resource` object.\n- `ptr`: The name of the local variable holding the smart pointer.\n- `=`: The assignment operator binding the created pointer to the variable.\n- `std::make_unique<Resource>()`: Safely allocates a `Resource` on the heap and immediately wraps it in a `unique_ptr`. This completely replaces the raw `new` keyword.\n- `ptr->DoWork()`: Accesses the object just like a raw pointer using the arrow operator `->`. The smart pointer overloads this operator to pass the call through to the underlying raw pointer.\n- `}`: The end of the inner block scope. Because `ptr` is a local variable, it is destroyed here. Its destructor automatically calls `delete` on the underlying raw pointer, freeing the memory.',
                '**CS lens.** This perfectly embodies the RAII (Resource Acquisition Is Initialization) pattern from Lesson 08. The resource (heap memory) is tied directly to the lifespan of a local object (`unique_ptr`).',
                '**SE lens.** Exclusive ownership guarantees no double-deletes and no memory leaks. The compiler ensures that exactly one entity is responsible for the cleanup. The tradeoff is that you cannot copy a `unique_ptr`, which forces you to explicitly think about how ownership moves through your system.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <memory>\n\nclass Resource {\npublic:\n    Resource() { std::cout << "Resource Acquired\\n"; }\n    ~Resource() { std::cout << "Resource Destroyed\\n"; }\n    void DoWork() { std::cout << "Doing work...\\n"; }\n};\n\nint main() {\n    std::cout << "Start block\\n";\n    {\n        std::unique_ptr<Resource> ptr = std::make_unique<Resource>();\n        ptr->DoWork();\n    }\n    std::cout << "End block\\n";\n    return 0;\n}',
              expectedOutput: '> ./main\nStart block\nResource Acquired\nDoing work...\nResource Destroyed\nEnd block',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Transferring Ownership with std::move',
              prose: [
                'Because `unique_ptr` strictly enforces exclusive ownership, you cannot copy it. If you try to pass it to a function by value, or assign it to another variable, the compiler throws an error. You need a way to hand over the responsibility of the memory to another part of your program.',
                '## How the Code Works',
                '- `void TakeOwnership(std::unique_ptr<Resource> paramPtr)`: A function that takes a `unique_ptr` by value. By doing this, it demands absolute ownership of the resource. When the function finishes, `paramPtr` will be destroyed and the resource will be freed.\n- `std::move(myPtr)`: Reappearing from Lesson 16. It casts the pointer to an rvalue reference, telling the compiler it is safe to transfer its internal raw pointer out of `myPtr` and into `paramPtr`.\n- `if (myPtr == nullptr)`: After the move, the original `unique_ptr` (`myPtr`) is hollowed out. It safely sets its internal raw pointer to `nullptr`.\n- `}`: When `TakeOwnership` ends, its local `paramPtr` is destroyed, freeing the resource. Notice this happens *before* "myPtr is empty" is printed.\n- `main` creates `myPtr`, allocating the resource.\n- `TakeOwnership` is called. Ownership is transferred via `std::move`.\n- Inside `TakeOwnership`, "Function owns it now" is printed.\n- `TakeOwnership` finishes. `paramPtr` goes out of scope and is destroyed. "Resource Destroyed" is printed.\n- Control returns to `main`. `myPtr` is checked against `nullptr`, and "myPtr is empty" is printed.',
                '**CS lens.** This is Linear Types in action. A linear type enforces that a value is used exactly once. While C++ doesn\'t have strict linear types, `unique_ptr` combined with move semantics simulates it by ensuring only one valid handle to the memory exists at any time.',
                '**SE lens.** Passing a `unique_ptr` by value into a function makes ownership transfer visibly obvious in the method signature. Anyone calling `TakeOwnership` knows they are giving up the object permanently.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <memory>\n\nclass Resource {\npublic:\n    ~Resource() { std::cout << "Resource Destroyed\\n"; }\n};\n\nvoid TakeOwnership(std::unique_ptr<Resource> paramPtr) {\n    std::cout << "Function owns it now\\n";\n}\n\nint main() {\n    std::unique_ptr<Resource> myPtr = std::make_unique<Resource>();\n    \n    // std::unique_ptr<Resource> copy = myPtr; // This would cause a compile error\n    \n    TakeOwnership(std::move(myPtr));\n    \n    if (myPtr == nullptr) {\n        std::cout << "myPtr is empty\\n";\n    }\n    \n    return 0;\n}',
              expectedOutput: '> ./main\nFunction owns it now\nResource Destroyed\nmyPtr is empty',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'std::shared_ptr',
              prose: [
                'Sometimes exclusive ownership is impossible. For example, a graphical window and an audio engine might both need a reference to the same configuration object. The object should only be destroyed when *both* systems are done with it. You need a way to share ownership safely.',
                '## How the Code Works',
                '- `std::shared_ptr<Resource>`: Declares a smart pointer that shares ownership via reference counting.\n- `ptr1`: The initial smart pointer variable.\n- `std::make_shared<Resource>()`: Allocates both the `Resource` and a hidden control block (which holds the reference count) in one contiguous chunk of memory.\n- `ptr1.use_count()`: A method that returns the current number of `shared_ptr` instances pointing to this resource. First appearance — returns `1` here.\n- `std::shared_ptr<Resource> ptr2`: Declares a second shared pointer inside a nested block.\n- `= ptr1`: Unlike `unique_ptr`, `shared_ptr` can be safely copied. The assignment operator reaches into the shared control block and increments the reference count.\n- `}`: When the inner block ends, `ptr2` is destroyed. Its destructor decrements the reference count. Because the count drops from 2 to 1 (not 0), the `Resource` is *not* deleted.\n- `}`: End of `main`. `ptr1` is destroyed, the count drops to 0, and the `Resource` is finally deleted.',
                '**CS lens.** This is Reference Counting, a primitive form of Garbage Collection. The system tracks how many references exist and reclaims the memory exactly when the counter reaches zero. Also recognized in: COM objects in Windows, Python\'s memory management, Swift\'s Automatic Reference Counting (ARC).',
                '**SE lens.** `shared_ptr` provides tremendous safety and convenience, but at a cost. The control block requires extra memory, and modifying the reference count must be thread-safe, which introduces performance overhead. You should always default to `unique_ptr` unless shared ownership is explicitly required by the design.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <memory>\n\nclass Resource {\npublic:\n    ~Resource() { std::cout << "Resource Destroyed\\n"; }\n};\n\nint main() {\n    std::shared_ptr<Resource> ptr1 = std::make_shared<Resource>();\n    std::cout << "Count initially: " << ptr1.use_count() << "\\n";\n    \n    {\n        std::shared_ptr<Resource> ptr2 = ptr1;\n        std::cout << "Count inside block: " << ptr1.use_count() << "\\n";\n    }\n    \n    std::cout << "Count outside block: " << ptr1.use_count() << "\\n";\n    return 0;\n}',
              expectedOutput: '> ./main\nCount initially: 1\nCount inside block: 2\nCount outside block: 1\nResource Destroyed',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'std::weak_ptr',
              prose: [
                'If two objects hold `shared_ptr`s to each other, their reference counts will never drop to zero, even if all outside pointers are destroyed. This is a cyclic reference, and it causes a permanent memory leak. You need a way to look at a shared resource without actively keeping it alive.',
                '## How the Code Works',
                '- `std::shared_ptr<Node> neighbor`: Creates a strong, owning reference to another node.\n- `n1->neighbor = n2`: `n1` stores a strong pointer to `n2`.\n- `n2->neighbor = n1`: `n2` stores a strong pointer to `n1`. Each node now owns the other.\n- `std::weak_ptr<SafeNode> neighbor`: Declares a non-owning smart pointer. It observes the object but does not increment its reference count.\n- `s1->neighbor = s2`: Assigning a `shared_ptr` to a `weak_ptr` succeeds but leaves the object\'s reference count completely unchanged.\n- `s1->neighbor.lock()`: A `weak_ptr` cannot be accessed directly because the memory might have been deleted on another thread. The `lock()` method creates a temporary `shared_ptr` if the object still exists. First appearance — returns a valid `shared_ptr` if the memory is alive, or an empty one if it was destroyed.\n- `std::shared_ptr<SafeNode> temp`: The temporary variable that holds the result of the lock.\n- `if (...)`: Checks if the temporarily created `shared_ptr` is valid (not empty) before entering the block.\n- `n1` and `n2` are created. Their reference counts are 1.\n- They point to each other. Their reference counts become 2.\n- `s1` and `s2` are created. Their reference counts are 1.\n- They point to each other using `weak_ptr`. Their reference counts remain 1.\n- End of `main` is reached.\n- The local variables `s1` and `s2` are destroyed. Their reference counts drop from 1 to 0. `SafeNode Destroyed` is printed for both.\n- The local variables `n1` and `n2` are destroyed. Their reference counts drop from 2 to 1. Neither reaches 0, so they are never destroyed and the memory leaks permanently.',
                '**CS lens.** This breaks reference cycles, transforming a cyclic graph into a Directed Acyclic Graph (DAG) from the perspective of ownership.',
                '**SE lens.** `weak_ptr` is essential for caching, observer patterns, and parent-child tree structures (where the parent owns the child with a `shared_ptr`, and the child points back with a `weak_ptr`). The tradeoff is the mandatory `lock()` check, which forces the programmer to handle the case where the resource no longer exists.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <memory>\n\nclass Node {\npublic:\n    std::shared_ptr<Node> neighbor;\n    ~Node() { std::cout << "Node Destroyed\\n"; }\n};\n\nclass SafeNode {\npublic:\n    std::weak_ptr<SafeNode> neighbor;\n    ~SafeNode() { std::cout << "SafeNode Destroyed\\n"; }\n};\n\nint main() {\n    // Cyclic reference leak\n    auto n1 = std::make_shared<Node>();\n    auto n2 = std::make_shared<Node>();\n    n1->neighbor = n2;\n    n2->neighbor = n1;\n    \n    // Safe reference\n    auto s1 = std::make_shared<SafeNode>();\n    auto s2 = std::make_shared<SafeNode>();\n    s1->neighbor = s2;\n    s2->neighbor = s1;\n    \n    // Check weak_ptr\n    if (std::shared_ptr<SafeNode> temp = s1->neighbor.lock()) {\n        std::cout << "SafeNode neighbor is alive\\n";\n    }\n    \n    return 0;\n}',
              expectedOutput: '> ./main\nSafeNode neighbor is alive\nSafeNode Destroyed\nSafeNode Destroyed',
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
      'Next lesson: Lambda Expressions.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Smart Pointer"?',
      options: [
        'a hidden integer tracking how many smart pointers are currently pointing to the same block of memory. It exists It allows shared ownership where the last pointer to leave scope is the one that cleans up the memory.',
        'a class that wraps a raw pointer and manages the allocation and deletion of the memory it points to. It exists It uses RAII to guarantee that dynamically allocated memory is freed exactly when it should be, without requiring manual delete calls.',
        'the responsibility of a specific pointer to destroy the resource it points to. It exists It clarifies who is responsible for memory cleanup, preventing double-deletes and memory leaks by design.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Reference Count"?',
      options: [
        'a scenario where two objects hold shared pointers to each other, keeping their reference counts above zero permanently. It exists It is a structural memory leak in reference-counted systems, requiring a non-owning pointer type to break the loop.',
        'a hidden integer tracking how many smart pointers are currently pointing to the same block of memory. It exists It allows shared ownership where the last pointer to leave scope is the one that cleans up the memory.',
        'the responsibility of a specific pointer to destroy the resource it points to. It exists It clarifies who is responsible for memory cleanup, preventing double-deletes and memory leaks by design.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Cyclic Reference"?',
      options: [
        'a class that wraps a raw pointer and manages the allocation and deletion of the memory it points to. It exists It uses RAII to guarantee that dynamically allocated memory is freed exactly when it should be, without requiring manual delete calls.',
        'a scenario where two objects hold shared pointers to each other, keeping their reference counts above zero permanently. It exists It is a structural memory leak in reference-counted systems, requiring a non-owning pointer type to break the loop.',
        'the responsibility of a specific pointer to destroy the resource it points to. It exists It clarifies who is responsible for memory cleanup, preventing double-deletes and memory leaks by design.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Ownership"?',
      options: [
        'a scenario where two objects hold shared pointers to each other, keeping their reference counts above zero permanently. It exists It is a structural memory leak in reference-counted systems, requiring a non-owning pointer type to break the loop.',
        'the responsibility of a specific pointer to destroy the resource it points to. It exists It clarifies who is responsible for memory cleanup, preventing double-deletes and memory leaks by design.',
        'a class that wraps a raw pointer and manages the allocation and deletion of the memory it points to. It exists It uses RAII to guarantee that dynamically allocated memory is freed exactly when it should be, without requiring manual delete calls.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Smart Pointer** — a class that wraps a raw pointer and manages the allocation and deletion of the memory it points to. It exists It uses RAII to guarantee that dynamically allocated memory is freed exactly when it should be, without requiring manual delete calls.',
    '**Ownership** — the responsibility of a specific pointer to destroy the resource it points to. It exists It clarifies who is responsible for memory cleanup, preventing double-deletes and memory leaks by design.',
    '**Reference Count** — a hidden integer tracking how many smart pointers are currently pointing to the same block of memory. It exists It allows shared ownership where the last pointer to leave scope is the one that cleans up the memory.',
    '**Cyclic Reference** — a scenario where two objects hold shared pointers to each other, keeping their reference counts above zero permanently. It exists It is a structural memory leak in reference-counted systems, requiring a non-owning pointer type to break the loop.',
  ],

  checkpoints: ['read-intuition'],
}
