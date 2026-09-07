// cpp-dsa — Lesson 4: Singly Linked List
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 04 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-04-singly-linked-list',
  slug: 'singly-linked-list',
  chapter: 2,
  order: 1,
  title: 'Singly Linked List',
  subtitle: 'Linear Data Structures',
  tags: ['singly-linked-list', 'node', 'head-pointer', 'traversal'],

  hook: {
    question: 'What is "Singly Linked List", and why does it matter?',
    realWorldContext: 'You will write isolated console programs to implement a singly linked list from scratch using raw pointers. These programs demonstrate how to allocate independent nodes scattered in memory and link them together. The transferable problem this solves is avoiding the O(n) cost of resizing or shifting elements in a contiguous array—trading O(n) access time to gain O(1) insertions at the head.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Node Structure and Manual Links, Traversal, Insertion at Head and Tail, Deletion, std::forward_list.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Singly Linked List:** A data structure consisting of independent nodes where each node holds a value and a pointer to the next node in the sequence. It exists To allow O(1) insertions or deletions at specific points without shifting elements in memory.\n- **Node:** A discrete block of memory storing a single element\'s data and the structural pointer(s). It exists To decouple the data\'s logical order from its physical layout in RAM.\n- **Head Pointer:** A raw pointer that stores the memory address of the very first node in the list. It exists It serves as the sole entry point to the entire data structure; without it, the entire list is lost and becomes a memory leak.\n- **Traversal:** The act of sequentially following the next pointers from the head to the end of the list. It exists Because nodes are scattered randomly in memory, direct index math (like array[5]) is impossible, forcing you to walk the chain one link at a time.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Observe the lifecycle of memory. When you build the structure raw, you act as the memory manager—every `new Node` necessitates a `delete`, and skipping one creates a silent memory leak that grows over time. When you use `std::forward_list`, the moment it falls out of scope at the end of `main`, its destructor silently executes the exact `while (current != nullptr)` cleanup loop we wrote in Unit 2, safely destroying every node for you.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you fail to properly stash the `next` pointer before deleting a node during a traversal cleanup, your program will crash entirely. Modify the cleanup loop in Unit 2 to be structurally naive: \n\n```cpp\nNode* current = head;\nwhile (current != nullptr) {\n    delete current;\n    current = current->next; // CRASH\n}\n```\n\n**The compiler error/runtime failure:** This compiles successfully, but triggers undefined behavior at runtime (often a segfault). Because `current` was just handed back to the OS via `delete`, accessing `current->next` on the immediate next line attempts to read memory that you no longer own. The required pointer surgery is unforgiving.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Sum the List:** In the manual traversal code, declare an `int sum = 0;` before the loop. Inside the loop, add `current->data` to the sum instead of printing it. Print the final sum at the end.\n- **Search the Chain:** Write a function `bool contains(Node* head, int target)` that traverses the list and returns `true` the moment it finds a node where `data == target`.\n- **Insert After:** Read about `std::forward_list::insert_after`. Use it to insert the number `25` immediately after the first element in a `std::forward_list`.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have manually built a linked list using `new Node{}` and wired the pointers together by hand.\n- [ ] You have traversed a chain using a `while(current != nullptr)` loop.\n- [ ] You can explain out loud why `insertAtHead` is an O(1) constant-time operation.\n- [ ] You understand why safely deleting a node requires temporary pointer variables.\n- [ ] You have successfully compiled and run an equivalent `std::forward_list` operation.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 4: Singly Linked List',
        caption: 'Singly Linked List',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Node Structure and Manual Links',
              prose: [
                'Dynamic arrays like `std::vector` require contiguous memory. If you insert an element at the very front of a one-million-element vector, the computer must shift all one million existing elements down by one slot in RAM—an O(n) operation. You need a way to store sequential data where inserting a new item requires only shuffling a couple of pointers, without moving any existing data.',
                '## How the Code Works',
                '- `struct Node {`: Defines a custom data type. Unlike a class, a struct\'s members are public by default, which is conventional for raw data nodes.\n- `int data;`: The actual payload this node holds.\n- `Node* next;`: A pointer holding the memory address of another `Node`. This is a self-referential structure.\n- `Node* head = new Node{10, nullptr};`: Dynamically allocates a new `Node` on the heap. Its `data` is `10`, and its `next` pointer is explicitly set to `nullptr` (pointing at nothing). Returns the address to `head`.\n- `head->next = second;`: Accesses the `next` pointer inside the first node and overwrites its `nullptr` with the memory address of `second`. The two nodes are now logically connected.\n- `head->next->data`: Resolves the `head` pointer to find the first node, accesses its `next` pointer to find the second node, and finally reads the `data` payload of the second node.\n- `delete head;`: Manually returns the heap-allocated memory to the operating system. Each node must be deleted individually because they are separate allocations.',
                '**CS lens.** This is the foundational definition of a linked list. By embedding the "next" location directly alongside the data, the structure sacrifices physical contiguity. The computer cannot predict where `second` is based on where `head` is located in RAM.',
                '**SE lens.** The alternative not chosen is a contiguous array block (`new int[3]`). The tradeoff is overhead: an array of three integers takes exactly 12 bytes. This linked list takes 48 bytes on a 64-bit system (4 bytes for the int + 4 bytes padding + 8 bytes for the pointer, per node), massively increasing memory footprint and destroying CPU cache locality, all to buy structural flexibility.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct Node {\n    int data;\n    Node* next;\n};\n\nint main() {\n    Node* head = new Node{10, nullptr};\n    Node* second = new Node{20, nullptr};\n    Node* third = new Node{30, nullptr};\n\n    head->next = second;\n    second->next = third;\n\n    std::cout << "Head data: " << head->data << "\\n";\n    std::cout << "Second data: " << head->next->data << "\\n";\n    \n    delete head;\n    delete second;\n    delete third;\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Traversal',
              prose: [
                'In the manual example above, printing the third node would require `head->next->next->data`. If a list has a million nodes, you cannot hardcode a million arrow operators. Because the nodes are not stored sequentially in memory, you cannot use pointer arithmetic (`head + 5`). You need an algorithmic way to visit every node dynamically.',
                '## How the Code Works',
                '- `new Node{10, new Node{...}}`: Inline allocations that immediately use the newly returned pointer as the `next` value for the previous node. This compactly builds the list.\n- `Node* current = head;`: Creates a temporary local pointer. This is the "cursor" that will walk the list. We never modify `head` directly; doing so would cause us to permanently lose the start of the list.\n- `while (current != nullptr)`: The loop condition. A valid linked list must always be terminated by a node whose `next` is `nullptr`. When `current` becomes `nullptr`, we have walked off the end of the chain.\n- `current = current->next;`: The core traversal mechanic. It reads the address stored inside the current node\'s `next` field and overwrites the `current` variable with it, advancing the cursor down the chain.\n- `Node* nextNode = current->next;` (in cleanup): Before deleting the current node, we must aggressively rescue its `next` pointer into a temporary variable. If we ran `delete current;` first, accessing `current->next` on the next line would read freed memory (a use-after-free bug).',
                '**CS lens.** This loop demonstrates why access in a linked list is always O(n). To read the 500th element, you have absolutely no choice but to visit elements 1 through 499 first to discover the address of the 500th. This sequential bottleneck is the structural penalty paid for scattered allocations.',
                '**SE lens.** The alternative not chosen is storing a dedicated `size` integer variable and using a `for` loop from `0` to `size`. While many real-world list classes do track size, a `while(current != nullptr)` loop is the only way to traverse a raw chain directly based on its inherent physical layout, remaining completely safe even if a separate `size` variable were to fall out of sync.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct Node {\n    int data;\n    Node* next;\n};\n\nint main() {\n    Node* head = new Node{10, new Node{20, new Node{30, nullptr}}};\n\n    Node* current = head;\n    while (current != nullptr) {\n        std::cout << current->data << "\\n";\n        current = current->next;\n    }\n\n    // Cleanup\n    current = head;\n    while (current != nullptr) {\n        Node* nextNode = current->next;\n        delete current;\n        current = nextNode;\n    }\n\n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'Insertion at Head and Tail',
              prose: [
                'The primary advantage of a linked list is its ability to grow dynamically. We need to add a new node to the front of the list (an operation that takes O(n) in a vector) and add a node to the very end of the list.',
                '## How the Code Works',
                '- `void insertAtHead(Node*& head, int value)`: Takes `head` as a pointer passed by reference. This is critical. Because we are changing what the `head` pointer itself points to (re-aiming it at the new node), the caller\'s variable must be modified. If passed by value, we would only modify a local copy of the pointer.\n- `Node* newNode = new Node{value, head};`: Allocates the new node. Crucially, its `next` pointer is initialized to the *current* `head`. The new node now reaches out and grabs the existing list.\n- `head = newNode;`: Updates the main tracking pointer to point at the new first element. This entire operation is O(1) constant time, requiring exactly one allocation and one pointer assignment, regardless of whether the list has one node or one billion nodes.\n- `while (current->next != nullptr)`: In `insertAtTail`, the loop checks `current->next`, not `current`. We must stop *on* the last actual node, so we can modify its `next` field. If we looped until `current != nullptr`, we would fall completely off the chain and have no node left to attach the new allocation to.\n- `current->next = new Node{...}`: Having reached the last node (whose `next` is currently `nullptr`), we allocate a new node and assign its address here.',
                '**CS lens.** Notice the stark asymmetry. `insertAtHead` is an O(1) operation because we hold a direct pointer to the front. `insertAtTail` is an O(n) operation here because we are forced to traverse the entire list just to find the end. Many real-world implementations solve this by maintaining a secondary `tail` pointer alongside `head`.',
                '**SE lens.** The alternative not chosen is copying the entire list into a new, larger structure, which is how contiguous arrays resize. The tradeoff is that linked list nodes must be dynamically allocated one by one via `new`, hitting the heap allocator repeatedly. In performance-critical C++, hitting the heap allocator for every single integer is drastically slower than bulk-allocating a vector once, making linked lists rarely the right choice for small, primitive data types.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct Node {\n    int data;\n    Node* next;\n};\n\nvoid insertAtHead(Node*& head, int value) {\n    Node* newNode = new Node{value, head};\n    head = newNode;\n}\n\nvoid insertAtTail(Node* head, int value) {\n    if (head == nullptr) return; // Normally you\'d handle this, skipped for brevity\n    \n    Node* current = head;\n    while (current->next != nullptr) {\n        current = current->next;\n    }\n    current->next = new Node{value, nullptr};\n}\n\nint main() {\n    Node* head = new Node{20, nullptr};\n    \n    insertAtHead(head, 10);\n    insertAtTail(head, 30);\n    \n    for (Node* curr = head; curr != nullptr; curr = curr->next) {\n        std::cout << curr->data << "\\n";\n    }\n    \n    // Cleanup skipped in this example for brevity\n    return 0;\n}',
              code: '',
            },
            {
              id: 4,
              cellTitle: 'Deletion',
              prose: [
                'When you want to remove an element, you cannot simply `delete` it. If you delete a node in the middle of a list, the node before it still holds the dead memory address, and the node after it is completely detached and leaked. You must patch the chain together before destroying the target node.',
                '## How the Code Works',
                '- `Node* oldHead = head;`: Before changing the `head` pointer, we securely stash its current address. If we re-aimed `head` first without doing this, we would lose the only reference to the allocation we need to destroy.\n- `head = head->next;`: Re-aims the main list pointer to point at the second node, completely abandoning the first node from the list logic.\n- `delete oldHead;`: Now that the chain logic is safe, we physically destroy the heap allocation.\n- `Node* nodeToDelete = prevNode->next;`: In `deleteAfter`, we identify the exact memory we plan to destroy.\n- `prevNode->next = nodeToDelete->next;`: The core surgical patch. It bypasses `nodeToDelete` entirely, wiring the previous node directly to the node that comes *after* the one being deleted. The target node is now isolated from the chain.\n- `delete nodeToDelete;`: Frees the isolated memory.',
                '**CS lens.** Deleting a known node in a linked list is O(1) pointer surgery. However, discovering *which* node to delete (e.g., "delete the node with value 20") requires an O(n) traversal first.',
                '**SE lens.** The alternative not chosen is shifting elements down to fill the gap (as in an array deletion). The linked list bypasses the node instantly, trading memory locality for zero-copy removal logic.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct Node {\n    int data;\n    Node* next;\n};\n\nvoid deleteHead(Node*& head) {\n    if (head == nullptr) return;\n    Node* oldHead = head;\n    head = head->next;\n    delete oldHead;\n}\n\nvoid deleteAfter(Node* prevNode) {\n    if (prevNode == nullptr || prevNode->next == nullptr) return;\n    Node* nodeToDelete = prevNode->next;\n    prevNode->next = nodeToDelete->next;\n    delete nodeToDelete;\n}\n\nint main() {\n    Node* head = new Node{10, new Node{20, new Node{30, nullptr}}};\n    \n    deleteAfter(head); // Deletes the 20\n    deleteHead(head);  // Deletes the 10\n    \n    std::cout << "Remaining: " << head->data << "\\n";\n    \n    delete head;\n    return 0;\n}',
              code: '',
            },
            {
              id: 5,
              cellTitle: 'std::forward_list',
              prose: [
                'Writing raw manual pointer logic (`next`, `new`, `delete`) in every project is extremely dangerous. One missing temporary variable results in a use-after-free, a memory leak, or a broken chain. The C++ Standard Library provides a rigorously tested template class that wraps all of this raw pointer surgery behind a safe, standard interface.',
                '## How the Code Works',
                '- `#include <forward_list>`: Instructs the compiler to include the definition for the singly linked list template.\n- `std::forward_list<int> list;`: Instantiates an empty singly linked list. Behind the scenes, its internal head pointer is initialized to `nullptr`.\n- `list.push_front(30);`: Automatically allocates a new internal node struct on the heap, places `30` in it, wires its next pointer to the current head, and updates the head. Exactly the same logic as our manual `insertAtHead`, but completely encapsulated.\n- `list.pop_front();`: Automatically handles the `oldHead` rescue, head advance, and safe `delete` operation we built in `deleteHead`.\n- `for (int value : list)`: A range-based for loop. It asks the `forward_list` for an iterator (which internally wraps a `Node*`), dereferences it to get the integer payload, and advances it by calling `current = current->next` inside the iterator\'s `operator++`.',
                '**CS lens.** `std::forward_list` is unique in the Standard Library because it intentionally omits a `size()` method. To compute its size would require an O(n) traversal. The C++ committee chose not to maintain a hidden `size` variable inside the object to ensure `std::forward_list` has exactly the same minimal memory overhead (one raw pointer for the head) as a hand-rolled C-style linked list.',
                '**SE lens.** The alternative not chosen is `std::list`, which is a doubly linked list (each node has a `prev` and `next` pointer). You choose `std::forward_list` when memory footprint is absolutely critical and you exclusively need to iterate purely forward from start to finish.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <forward_list>\n\nint main() {\n    std::forward_list<int> list;\n    \n    list.push_front(30);\n    list.push_front(20);\n    list.push_front(10);\n    \n    list.pop_front();\n    \n    for (int value : list) {\n        std::cout << value << "\\n";\n    }\n    \n    return 0;\n}',
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
      'Next lesson: Doubly Linked List.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Node"?',
      options: [
        'A raw pointer that stores the memory address of the very first node in the list. It exists It serves as the sole entry point to the entire data structure; without it, the entire list is lost and becomes a memory leak.',
        'A discrete block of memory storing a single element\'s data and the structural pointer(s). It exists To decouple the data\'s logical order from its physical layout in RAM.',
        'A data structure consisting of independent nodes where each node holds a value and a pointer to the next node in the sequence. It exists To allow O(1) insertions or deletions at specific points without shifting elements in memory.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Traversal"?',
      options: [
        'A discrete block of memory storing a single element\'s data and the structural pointer(s). It exists To decouple the data\'s logical order from its physical layout in RAM.',
        'A data structure consisting of independent nodes where each node holds a value and a pointer to the next node in the sequence. It exists To allow O(1) insertions or deletions at specific points without shifting elements in memory.',
        'The act of sequentially following the next pointers from the head to the end of the list. It exists Because nodes are scattered randomly in memory, direct index math (like array[5]) is impossible, forcing you to walk the chain one link at a time.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Head Pointer"?',
      options: [
        'The act of sequentially following the next pointers from the head to the end of the list. It exists Because nodes are scattered randomly in memory, direct index math (like array[5]) is impossible, forcing you to walk the chain one link at a time.',
        'A raw pointer that stores the memory address of the very first node in the list. It exists It serves as the sole entry point to the entire data structure; without it, the entire list is lost and becomes a memory leak.',
        'A discrete block of memory storing a single element\'s data and the structural pointer(s). It exists To decouple the data\'s logical order from its physical layout in RAM.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Singly Linked List"?',
      options: [
        'A raw pointer that stores the memory address of the very first node in the list. It exists It serves as the sole entry point to the entire data structure; without it, the entire list is lost and becomes a memory leak.',
        'The act of sequentially following the next pointers from the head to the end of the list. It exists Because nodes are scattered randomly in memory, direct index math (like array[5]) is impossible, forcing you to walk the chain one link at a time.',
        'A data structure consisting of independent nodes where each node holds a value and a pointer to the next node in the sequence. It exists To allow O(1) insertions or deletions at specific points without shifting elements in memory.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Singly Linked List** — A data structure consisting of independent nodes where each node holds a value and a pointer to the next node in the sequence. It exists To allow O(1) insertions or deletions at specific points without shifting elements in memory.',
    '**Node** — A discrete block of memory storing a single element\'s data and the structural pointer(s). It exists To decouple the data\'s logical order from its physical layout in RAM.',
    '**Head Pointer** — A raw pointer that stores the memory address of the very first node in the list. It exists It serves as the sole entry point to the entire data structure; without it, the entire list is lost and becomes a memory leak.',
    '**Traversal** — The act of sequentially following the next pointers from the head to the end of the list. It exists Because nodes are scattered randomly in memory, direct index math (like array[5]) is impossible, forcing you to walk the chain one link at a time.',
  ],

  checkpoints: ['read-intuition'],
}
