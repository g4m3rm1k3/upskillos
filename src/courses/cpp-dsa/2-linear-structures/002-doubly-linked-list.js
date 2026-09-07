// cpp-dsa — Lesson 5: Doubly Linked List
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 05 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-05-doubly-linked-list',
  slug: 'doubly-linked-list',
  chapter: 2,
  order: 2,
  title: 'Doubly Linked List',
  subtitle: 'Linear Data Structures',
  tags: ['doubly-linked-list', 'predecessor', 'bidirectional-traversal'],

  hook: {
    question: 'What is "Doubly Linked List", and why does it matter?',
    realWorldContext: 'You will write isolated console programs that construct, traverse, and modify a doubly linked list from scratch, and then use the Standard Library\'s equivalent container. These programs demonstrate how adding a backward-pointing memory address solves the strict forward-only limitation of singly linked lists, enabling reverse traversal and instant node deletion.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: The prev Pointer, Bidirectional Traversal, Insertion Without a Predecessor Search, Deletion Without a Predecessor Search, Standard Library std::list.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Doubly Linked List:** A sequence of dynamically allocated nodes where each node contains two pointers: one to the next node and one to the previous node. It exists To allow moving backward through the sequence and to allow operations at a specific node without having to search the entire list from the beginning to find its predecessor.\n- **Predecessor:** The node that sits immediately before another node in a linked list. It exists In linked list operations like insertion or deletion, you must update the predecessor\'s forward pointer to bridge the gap; a doubly linked list gives you immediate access to it.\n- **Bidirectional Traversal:** The ability to step through a data structure from start to finish or from finish to start. It exists Because many real-world systems (a browser\'s back/forward history, a music player\'s timeline) naturally require moving in both directions at will.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Imagine a web browser\'s history system. The browser maintains a doubly linked list of visited URLs. Every time you click a link, it allocates a new `Node`, wires its `prev` pointer to the current page, and advances the `tail`. When you click the "Back" button, the software executes `curr = curr->prev`, instantly loading the previous page. If you then visit a brand new site, the browser calls `std::list::erase` to delete all the "forward" nodes in constant time before appending the new page. The forward and backward pointers form the literal backbone of navigation.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you try to move an iterator backward on a container that doesn\'t support bidirectional traversal, the compiler enforces the boundary. Modify the code to use `std::forward_list` (a singly linked list): \n\n```cpp\n#include <forward_list>\n\nstd::forward_list<int> numbers = {10, 20, 30};\nauto it = numbers.end();\n--it;\n```\n\n**The compiler error:** `error: no match for \'operator--\' (operand type is \'std::_Fwd_list_iterator<int>\')` Because `std::forward_list` nodes do not have `prev` pointers, its iterators literally do not have the capability to move backward. The compiler refuses to compile the program because the mathematical operation is impossible.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Insert After:** Recreate the manual insertion code, but this time write the pointer logic to insert node X *after* a target node C instead of before it.\n- **Double Deletion:** Create a manual doubly linked list with 5 nodes. Hold pointers to nodes B and D. Delete both of them simultaneously and rewire the remaining nodes A, C, and E into a valid chain.\n- **List Splice:** Create two separate `std::list<int>` objects. Use the `std::list::splice` method (read its documentation) to transfer elements from the second list directly into the middle of the first list without allocating new nodes.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have manually wired a doubly linked list structure and proved it allows both `next` and `prev` traversal.\n- [ ] You understand the order of operations required to insert a node without losing the predecessor reference.\n- [ ] You can execute a constant-time node deletion by cleanly bypassing it.\n- [ ] You have used `std::list` to perform these operations safely without raw `new` or `delete`.\n- [ ] You can explain why `std::list` is advantageous over `std::vector` for middle-insertions, and why it is disadvantageous for general iteration.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 5: Doubly Linked List',
        caption: 'Doubly Linked List',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The prev Pointer',
              prose: [
                'In a singly linked list, a node only knows what comes after it. If you hold a pointer to a specific node and need to know which node points to it, you are entirely out of luck. The only way to find out is to start back at the `head` of the list and traverse forward until you hit a node whose `next` pointer matches the one you hold. You need a data structure that remembers the past, not just the future.',
                '## How the Code Works',
                '- `struct Node`: Defines the blueprint for our memory blocks.\n- `Node* next;`: The familiar pointer holding the memory address of the succeeding node.\n- `Node* prev;`: The new pointer holding the memory address of the predecessor node.\n- `new Node{10, nullptr, nullptr};`: Allocates a node on the heap. We initialize both pointer fields to `nullptr` to be safe.\n- `a->next = b;`: Wires the forward connection. Node A now knows B is next.\n- `b->prev = a;`: Wires the backward connection. Node B now knows A is behind it.\n- `b->prev->data`: Dereferences `b`, follows its `prev` pointer backward to `a`, and then reads the `data` field of `a`.',
                '**CS lens.** This extra pointer fundamentally changes the time complexity of predecessor lookups from linear O(N) to constant O(1). However, it introduces a strict memory cost. On a 64-bit architecture, every memory address takes 8 bytes. A singly linked list node carrying a 4-byte `int` requires 12 bytes (often padded to 16). A doubly linked list node requires two 8-byte pointers plus the 4-byte integer, totaling 20 bytes (padded to 24). You are trading memory capacity for algorithmic speed.',
                '**SE lens.** The tradeoff is manual management complexity. Every time a node joins or leaves the list, you must successfully update four pointers instead of two. Failing to update a `prev` pointer results in a corrupted data structure where walking forward gives a different sequence than walking backward.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct Node {\n    int data;\n    Node* next;\n    Node* prev;\n};\n\nint main() {\n    Node* a = new Node{10, nullptr, nullptr};\n    Node* b = new Node{20, nullptr, nullptr};\n    Node* c = new Node{30, nullptr, nullptr};\n\n    // Forward links\n    a->next = b;\n    b->next = c;\n\n    // Backward links\n    c->prev = b;\n    b->prev = a;\n\n    std::cout << "Node B holds: " << b->data << "\\n";\n    std::cout << "Node B\'s predecessor holds: " << b->prev->data << "\\n";\n    std::cout << "Node B\'s successor holds: " << b->next->data << "\\n";\n\n    delete a; delete b; delete c;\n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Bidirectional Traversal',
              prose: [
                'Sometimes you need to process a sequence in reverse. If a user hits "undo" fifty times, your program must walk backward through fifty history states. A singly linked list requires you to write the entire list into an array first, or use deep recursion to print backwards. You need to iterate from the tail to the head efficiently.',
                '## How the Code Works',
                '- `Node* head = a;`: A tracking pointer keeping hold of the front of the list, just like in a singly linked list.\n- `Node* tail = c;`: A tracking pointer keeping hold of the absolute end of the list. Without this, you would have to traverse forward just to find where to start traversing backwards.\n- `curr = tail;`: We begin our reverse iteration by pointing our cursor at the last node.\n- `while (curr != nullptr)`: The loop condition remains the same as forward traversal. We continue until our pointer falls off the edge of the list into nowhere.\n- `curr = curr->prev;`: The engine of the reverse loop. We replace our current address with the address stored in the `prev` pointer, effectively walking backward one step.\n**Backward Execution Trace:**\n- `curr = tail` — Iteration begins pointing at node C (data `3`). The condition `curr != nullptr` passes.\n- `std::cout << curr->data` — Prints `3`.\n- `curr = curr->prev` — Reassigns the cursor backward, resolving C\'s `prev` pointer so `curr` now holds the address of node B.\n- Loop repeats — `curr` points to B (data `2`), prints `2`, and steps backward to node A.\n- Loop repeats — `curr` points to A (data `1`), prints `1`, and steps backward to `nullptr`.\n- Termination — `curr != nullptr` evaluates to false because `curr` is null, and the loop naturally halts.',
                '**CS lens.** Bidirectional traversal in a doubly linked list is symmetrical. Iterating backward takes the exact same O(N) time as iterating forward. There is no performance penalty for traversing in reverse, unlike array-backed structures that might suffer minor cache-miss penalties when reading backwards depending on the CPU architecture.',
                '**SE lens.** Maintaining a `tail` pointer is a classic engineering tradeoff. It requires another 8 bytes of storage for the list\'s control block, and it forces you to update `tail` every time an element is added to the absolute end. The benefit is completely avoiding an O(N) penalty whenever you need to jump to the back of the list.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct Node {\n    int data;\n    Node* next;\n    Node* prev;\n};\n\nint main() {\n    Node* a = new Node{1, nullptr, nullptr};\n    Node* b = new Node{2, nullptr, nullptr};\n    Node* c = new Node{3, nullptr, nullptr};\n\n    a->next = b; b->prev = a;\n    b->next = c; c->prev = b;\n\n    Node* head = a;\n    Node* tail = c;\n\n    std::cout << "Forward traversal:\\n";\n    Node* curr = head;\n    while (curr != nullptr) {\n        std::cout << curr->data << " ";\n        curr = curr->next;\n    }\n\n    std::cout << "\\nBackward traversal:\\n";\n    curr = tail;\n    while (curr != nullptr) {\n        std::cout << curr->data << " ";\n        curr = curr->prev;\n    }\n    std::cout << "\\n";\n\n    delete a; delete b; delete c;\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Insertion Without a Predecessor Search',
              prose: [
                'Imagine you hold a pointer directly to node C, and you want to insert a new node X directly *before* it. In a singly linked list, you cannot do this. You have to start at `head`, loop until you find the node whose `next` points to C (which is B), and then insert X between B and C. If the list is a million items long, finding B takes linear time. You need to insert immediately.',
                '## How the Code Works',
                '- `Node* target = c;`: We have a pointer directly to the insertion site. We do not have a pointer to `b`.\n- `x->prev = target->prev;`: Node X\'s backward pointer grabs onto whatever is currently behind C (which is B).\n- `x->next = target;`: Node X\'s forward pointer grabs onto C. X is now fully wired, but the surrounding nodes still point past it.\n- `target->prev->next = x;`: This is the crucial step. `target->prev` resolves to B. We then access B\'s `next` pointer, and point it at X. We updated B without ever explicitly searching for B.\n- `target->prev = x;`: Finally, we update C\'s backward pointer to recognize X.',
                '**CS lens.** This demonstrates an O(1) constant-time insertion operation. Because every node holds the exact memory address of its neighbors, you bypass the search algorithm entirely. No loop means the operation takes the exact same number of CPU cycles whether the list has ten items or ten million.',
                '**SE lens.** The exact ordering of these four pointer reassignments is famously fragile. If you had executed `target->prev = x;` first, you would have permanently lost the backward pointer to B, making `target->prev->next = x;` crash the program. You must always wire the new node\'s pointers first, update the predecessor next, and update the target node last.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct Node {\n    int data;\n    Node* next;\n    Node* prev;\n};\n\nint main() {\n    Node* b = new Node{20, nullptr, nullptr};\n    Node* c = new Node{30, nullptr, nullptr};\n    b->next = c; c->prev = b;\n\n    // We only hold a pointer to c, but want to insert x before it.\n    Node* target = c;\n    Node* x = new Node{25, nullptr, nullptr};\n\n    // The rewiring dance\n    x->prev = target->prev;\n    x->next = target;\n    target->prev->next = x;\n    target->prev = x;\n\n    std::cout << "Sequence: " << b->data << " -> " \n              << b->next->data << " -> " \n              << b->next->next->data << "\\n";\n\n    delete b; delete x; delete c;\n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Deletion Without a Predecessor Search',
              prose: [
                'You need to delete node C from the list. To do so, you must bridge the gap by connecting node B directly to node D. In a singly linked list, you cannot do this without starting from the head to find B. In a doubly linked list, node C holds all the necessary addresses to remove itself from the chain.',
                '## How the Code Works',
                '- `Node* target = c;`: We select the middle node for deletion.\n- `target->prev->next = target->next;`: `target->prev` resolves to B. We assign B\'s `next` pointer to become D (`target->next`). B now points directly to D, bypassing C entirely.\n- `target->next->prev = target->prev;`: `target->next` resolves to D. We assign D\'s `prev` pointer to become B (`target->prev`). D now points backward to B.\n- `delete target;`: The node is unlinked, but it still consumes memory on the heap. We instruct the OS to reclaim it.',
                '**CS lens.** This is an O(1) removal. It requires exactly two pointer reassignments and one memory deallocation. This is the primary reason operating systems use doubly linked lists internally to manage threads or timers: when a process exits unexpectedly, the OS can instantly pluck its node out of the middle of the active process queue.',
                '**SE lens.** This implementation is minimal and unsafe. In a production system, you must check if `target->prev` is `nullptr` (meaning you are deleting the head) and if `target->next` is `nullptr` (meaning you are deleting the tail). If you blindly attempt `target->prev->next` when `prev` is null, your program will trigger a segmentation fault and crash.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct Node {\n    int data;\n    Node* next;\n    Node* prev;\n};\n\nint main() {\n    Node* b = new Node{20, nullptr, nullptr};\n    Node* c = new Node{30, nullptr, nullptr};\n    Node* d = new Node{40, nullptr, nullptr};\n\n    b->next = c; c->prev = b;\n    c->next = d; d->prev = c;\n\n    Node* target = c;\n\n    // Unlink target from the chain\n    target->prev->next = target->next;\n    target->next->prev = target->prev;\n\n    // Destroy target\n    delete target;\n\n    std::cout << "Sequence: " << b->data << " -> " \n              << b->next->data << "\\n";\n\n    delete b; delete d;\n    return 0;\n}',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'Standard Library std::list',
              prose: [
                'Manually writing defensive pointer logic to handle every edge case (inserting at the head, deleting the tail, inserting into an empty list) requires hundreds of lines of code and is highly error-prone. The C++ Standard Library provides a pre-built, fully tested doubly linked list container that handles all of the raw pointer memory management safely.',
                '## How the Code Works',
                '- `#include <list>`: Instructs the compiler to include the definition for the `std::list` template.\n- `std::list<int> numbers;`: Instantiates a doubly linked list holding integers. It internally manages its own `head`, `tail`, and `size`.\n- `numbers.push_back(20);`: Allocates a new node, populates it with `20`, and securely wires it to the tail of the list.\n- `std::list<int>::iterator it = numbers.end();`: Fetches an iterator representing the conceptual position *after* the last element.\n- `--it;`: The pre-decrement operator. Because `std::list` iterators are bidirectional, applying `--` internally follows the `prev` pointer of the current node, safely moving the iterator backward one step.\n- `numbers.erase(it);`: Calls the `erase` method, passing the exact position. The list executes the exact `prev` and `next` rewiring dance we did earlier, updates its internal size counter, and calls `delete` to prevent memory leaks.\n- `for (int num : numbers)`: Range-based for loop. It automatically pulls `begin()` and `end()` iterators and walks forward using the hidden `next` pointers.',
                '**CS lens.** The `std::list` container encapsulates the complexity of pointers behind a clean interface. However, because it relies on dynamically allocated nodes scattered across the heap, its cache locality is poor. This makes iterating through a `std::list` significantly slower in real-time execution than iterating through contiguous memory like a `std::vector`, despite both being O(N) algorithms.',
                '**SE lens.** The alternative not chosen is using `std::vector` for everything. You only choose `std::list` if your program\'s dominant bottleneck is inserting or erasing items deeply embedded in the middle of a massive sequence, *and* you already possess iterators pointing directly to those locations. If you don\'t already have an iterator pointing there, you have to spend O(N) time finding the spot anyway, defeating the list\'s main advantage.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <list>\n\nint main() {\n    std::list<int> numbers;\n\n    numbers.push_back(10);\n    numbers.push_back(20);\n    numbers.push_back(30);\n\n    // Get an iterator to the end, then walk backwards to the 20\n    std::list<int>::iterator it = numbers.end();\n    --it; // now pointing at 30\n    --it; // now pointing at 20\n\n    // Erase the 20 instantly\n    numbers.erase(it);\n\n    for (int num : numbers) {\n        std::cout << num << " ";\n    }\n    std::cout << "\\n";\n\n    return 0;\n}',
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
      'Next lesson: Stack.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Bidirectional Traversal"?',
      options: [
        'The node that sits immediately before another node in a linked list. It exists In linked list operations like insertion or deletion, you must update the predecessor\'s forward pointer to bridge the gap; a doubly linked list gives you immediate access to it.',
        'A sequence of dynamically allocated nodes where each node contains two pointers: one to the next node and one to the previous node. It exists To allow moving backward through the sequence and to allow operations at a specific node without having to search the entire list from the beginning to find its predecessor.',
        'The ability to step through a data structure from start to finish or from finish to start. It exists Because many real-world systems (a browser\'s back/forward history, a music player\'s timeline) naturally require moving in both directions at will.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Doubly Linked List"?',
      options: [
        'The node that sits immediately before another node in a linked list. It exists In linked list operations like insertion or deletion, you must update the predecessor\'s forward pointer to bridge the gap; a doubly linked list gives you immediate access to it.',
        'The ability to step through a data structure from start to finish or from finish to start. It exists Because many real-world systems (a browser\'s back/forward history, a music player\'s timeline) naturally require moving in both directions at will.',
        'A sequence of dynamically allocated nodes where each node contains two pointers: one to the next node and one to the previous node. It exists To allow moving backward through the sequence and to allow operations at a specific node without having to search the entire list from the beginning to find its predecessor.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Predecessor"?',
      options: [
        'A sequence of dynamically allocated nodes where each node contains two pointers: one to the next node and one to the previous node. It exists To allow moving backward through the sequence and to allow operations at a specific node without having to search the entire list from the beginning to find its predecessor.',
        'The ability to step through a data structure from start to finish or from finish to start. It exists Because many real-world systems (a browser\'s back/forward history, a music player\'s timeline) naturally require moving in both directions at will.',
        'The node that sits immediately before another node in a linked list. It exists In linked list operations like insertion or deletion, you must update the predecessor\'s forward pointer to bridge the gap; a doubly linked list gives you immediate access to it.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Doubly Linked List** — A sequence of dynamically allocated nodes where each node contains two pointers: one to the next node and one to the previous node. It exists To allow moving backward through the sequence and to allow operations at a specific node without having to search the entire list from the beginning to find its predecessor.',
    '**Predecessor** — The node that sits immediately before another node in a linked list. It exists In linked list operations like insertion or deletion, you must update the predecessor\'s forward pointer to bridge the gap; a doubly linked list gives you immediate access to it.',
    '**Bidirectional Traversal** — The ability to step through a data structure from start to finish or from finish to start. It exists Because many real-world systems (a browser\'s back/forward history, a music player\'s timeline) naturally require moving in both directions at will.',
  ],

  checkpoints: ['read-intuition'],
}
