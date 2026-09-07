// cpp-dsa — Lesson 7: Queue
// Auto-converted from src/docs/projects/cpp-dsa/Lesson 07 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-dsa-07-queue',
  slug: 'queue',
  chapter: 2,
  order: 4,
  title: 'Queue',
  subtitle: 'Linear Data Structures',
  tags: ['queue', 'enqueue', 'dequeue', 'circular-buffer', 'two-pointer-linked-list'],

  hook: {
    question: 'What is "Queue", and why does it matter?',
    realWorldContext: 'You will write isolated console programs that store and retrieve data in a strict First-In-First-Out (FIFO) sequence. You will implement this behavior from scratch using both a circular array and a two-pointer linked structure, before relying on the C++ Standard Library. The transferable problem this solves is scheduling and ordering—ensuring tasks or data are processed exactly in the order they arrived, without skipping or reordering.',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 3 core ideas: Queue via Circular Buffer, Queue via Two Pointers (Linked List), std::queue.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Queue:** A data structure that enforces First-In-First-Out (FIFO) access. It exists To guarantee fairness and correct sequencing when processing streams of data or tasks, ensuring the oldest item is handled before any newer ones.\n- **Enqueue:** The operation of adding an item to the back of a queue. It exists To record a new arrival without disturbing the items already waiting in line.\n- **Dequeue:** The operation of removing an item from the front of a queue. It exists To consume the oldest item so the system can move on to the next one in line.\n- **Circular buffer:** An array where the end wraps around to the beginning. It exists To allow a queue to reuse array space continuously as items are enqueued and dequeued, preventing the items from walking off the end of fixed-size memory.\n- **Two-pointer linked list:** A linked list that maintains explicit pointers to both the head and the tail nodes. It exists To allow O(1) instantaneous insertion at the back (tail) and removal at the front (head), without traversing the list.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Whether backed by a circular array, a linked list with two pointers, or a standard library container adapter, the strict contract of a Queue never changes: FIFO. Data enters at the back (`enqueue` / `push`) and leaves from the front (`dequeue` / `pop` and `front`). The underlying memory layout is completely hidden from the code consuming the queue.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'If you try to cheat the queue order, the compiler or runtime stops you. Modify the `std::queue` code to attempt to read the second element directly: \n\n```cpp\nstd::cout << tasks[1];\n```\n\n**The compiler error:** `error: no match for \'operator[]\' in \'tasks[1]\'` Because `std::queue` enforces strict FIFO constraints, it deliberately deletes the `[]` operator. You cannot skip the line. If you want the second item, you must `pop()` the first item.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- **Circular Check:** Modify the `CircularQueue` to hold strings instead of integers. Enqueue three strings, dequeue two, and enqueue two more to prove it wraps around correctly.\n- **Linked Peek:** Add a `front_value()` method to the `LinkedQueue` that returns the value of the head node without deleting it, mirroring `std::queue::front()`.\n- **Task Scheduler:** Use `std::queue` to simulate a printer queue. Push five document names into the queue, then write a loop that pops and prints each one, stating it is "printing".',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- [ ] You have compiled and run a Circular Array queue and observed index wrapping.\n- [ ] You have compiled and run a Two-Pointer Linked list queue and observed O(1) removal.\n- [ ] You have compiled and run `std::queue` and understand why reading and removing are split into two methods.\n- [ ] You can explain out loud why a `tail` pointer is necessary for a linked list queue.\n- [ ] You have committed your code with a message explaining why FIFO is required for task scheduling.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 7: Queue',
        caption: 'Queue',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Queue via Circular Buffer',
              prose: [
                'You need to enforce a strict order of operations: first to arrive, first to be processed. If you use a standard array and shift every element left when you remove the front item, you waste massive amounts of CPU time just moving data. If you don\'t shift them, your items gradually march toward the end of the array until you run out of space. You need a way to reuse the empty space at the front of the array continuously.',
                '## How the Code Works',
                '- `int front;`: Tracks the index of the oldest item, which will be the next one removed.\n- `int rear;`: Tracks the index where the newest item will be inserted.\n- `int count;`: Tracks the current number of items to easily differentiate between a completely full and a completely empty queue.\n- `data[rear] = val;`: Writes the new value into the array at the current `rear` index.\n- `rear = (rear + 1) % capacity;`: Moves the `rear` index forward by one. The modulo operator `%` is the circular trick: if `capacity` is 3, and `rear` reaches 3, `3 % 3` evaluates to `0`. The index wraps around to the beginning.\n- `int val = data[front];`: Reads the oldest value before moving the `front` pointer away from it.\n- `front = (front + 1) % capacity;`: Moves the `front` index forward by one, wrapping around to the beginning exactly like `rear` does.\n- `std::cout << "Dequeued: " << q.dequeue() << "\\n";`: Calls `dequeue()`, executing the removal, and prints the returned value.',
                '**CS lens.** This is a Circular Buffer implementation of a Queue. It achieves O(1) enqueue and dequeue operations without any memory reallocation or data shifting. Also recognized in: operating system keyboard buffers, audio playback streams, network packet buffers.',
                '**SE lens.** The alternative not chosen is a dynamically resizing array (like `std::vector`) that deletes from the front. The tradeoff there is that erasing from the front of a contiguous block of memory requires shifting every remaining element one position to the left, turning an O(1) operation into an O(N) operation. The circular buffer trades away automatic growth (it is fixed-size) to gain instantaneous performance.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nclass CircularQueue {\nprivate:\n    int* data;\n    int capacity;\n    int front;\n    int rear;\n    int count;\n\npublic:\n    CircularQueue(int size) {\n        capacity = size;\n        data = new int[capacity];\n        front = 0;\n        rear = 0;\n        count = 0;\n    }\n\n    ~CircularQueue() {\n        delete[] data;\n    }\n\n    void enqueue(int val) {\n        if (count == capacity) {\n            std::cout << "Queue is full!\\n";\n            return;\n        }\n        data[rear] = val;\n        rear = (rear + 1) % capacity;\n        count++;\n    }\n\n    int dequeue() {\n        if (count == 0) {\n            std::cout << "Queue is empty!\\n";\n            return -1;\n        }\n        int val = data[front];\n        front = (front + 1) % capacity;\n        count--;\n        return val;\n    }\n};\n\nint main() {\n    CircularQueue q(3);\n    q.enqueue(10);\n    q.enqueue(20);\n    q.enqueue(30);\n    \n    std::cout << "Dequeued: " << q.dequeue() << "\\n";\n    q.enqueue(40);\n    std::cout << "Dequeued: " << q.dequeue() << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Queue via Two Pointers (Linked List)',
              prose: [
                'A circular array queue is incredibly fast but has a strict memory limit; if you guess the capacity wrong, you must reject incoming items or write complex resizing logic. You need a queue that can grow infinitely without shifting data, adding and removing items on demand.',
                '## How the Code Works',
                '- `Node* head;`: Points to the front of the queue, representing the oldest item to be dequeued next.\n- `Node* tail;`: Points to the very end of the queue, representing the newest item.\n- `Node* newNode = new Node{val, nullptr};`: Allocates a fresh node on the heap for the incoming value.\n- `if (tail == nullptr)`: Checks if the queue is totally empty. If it is, both `head` and `tail` must point to this very first node.\n- `tail->next = newNode;`: The crucial O(1) linkage. Instead of traversing the entire list from `head` to find the end, we use the `tail` pointer to instantly link the new node onto the back.\n- `tail = newNode;`: Updates the `tail` pointer itself so it points to the new end of the line.\n- `head = head->next;`: Disconnects the oldest node by moving the `head` pointer to the second node in line.\n- `if (head == nullptr)`: Checks if we just dequeued the very last item. If we did, `tail` must also be reset to `nullptr` so it doesn\'t point to deleted memory.\n- `delete temp;`: Frees the heap memory of the node we just removed.',
                '**CS lens.** This is a singly linked list optimized for queue operations. By maintaining a `tail` pointer, enqueue operations bypass the O(N) traversal normally required to append to a list, guaranteeing O(1) performance for both insertions and removals.',
                '**SE lens.** The alternative not chosen is using a single `head` pointer and walking to the end of the list on every insertion. The tradeoff here is one extra pointer (`tail`) of memory per queue in exchange for turning a slow O(N) append into a blindingly fast O(1) append. In systems processing millions of events, that traversal cost is unacceptable, making the `tail` pointer mandatory.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n\nstruct Node {\n    int value;\n    Node* next;\n};\n\nclass LinkedQueue {\nprivate:\n    Node* head;\n    Node* tail;\n\npublic:\n    LinkedQueue() {\n        head = nullptr;\n        tail = nullptr;\n    }\n\n    ~LinkedQueue() {\n        while (head != nullptr) {\n            dequeue();\n        }\n    }\n\n    void enqueue(int val) {\n        Node* newNode = new Node{val, nullptr};\n        if (tail == nullptr) {\n            head = newNode;\n            tail = newNode;\n        } else {\n            tail->next = newNode;\n            tail = newNode;\n        }\n    }\n\n    int dequeue() {\n        if (head == nullptr) {\n            std::cout << "Queue is empty!\\n";\n            return -1;\n        }\n        Node* temp = head;\n        int val = temp->value;\n        head = head->next;\n        \n        if (head == nullptr) {\n            tail = nullptr;\n        }\n        \n        delete temp;\n        return val;\n    }\n};\n\nint main() {\n    LinkedQueue q;\n    q.enqueue(100);\n    q.enqueue(200);\n    \n    std::cout << "Dequeued: " << q.dequeue() << "\\n";\n    std::cout << "Dequeued: " << q.dequeue() << "\\n";\n    \n    return 0;\n}',
              code: '',
            },
            {
              id: 3,
              cellTitle: 'std::queue',
              prose: [
                'You understand how a queue operates mechanically, but writing manual circular modulo math or raw pointer logic in every project is prone to off-by-one errors and memory leaks. You need a reliable, pre-built, heavily tested queue from the C++ standard library that manages memory safely.',
                '## How the Code Works',
                '- `#include <queue>`: Instructs the compiler to include the standard library file defining `std::queue`.\n- `std::queue<std::string> tasks;`: Declares a queue that will hold strings.\n- `tasks.push("Parse Config");`: Enqueues the string at the back. It automatically allocates the necessary memory.\n- `tasks.empty()`: A boolean method that returns `true` if the queue has zero elements. The `!` operator negates it, so the loop runs as long as there is work to do.\n- `tasks.front()`: Reads the value at the very front of the queue. Unlike our custom `dequeue()`, this *does not* remove the item. It only provides read access to the oldest element.\n- `tasks.pop()`: Removes the item at the front of the queue, destructing the string and freeing its memory. It deliberately returns `void`.',
                '**CS lens.** `std::queue` is a container adapter. It is not a data structure itself; instead, it wraps an existing sequence container (by default, `std::deque`) and completely hides methods like `push_front` or `[]` operator access. It strictly enforces FIFO rules by only exposing `push`, `pop`, and `front`.',
                '**SE lens.** The alternative not chosen is returning the value directly from `pop()`, which is how our custom implementations worked. The standard library separates `front()` (read) and `pop()` (remove) into two distinct methods for exception safety. If `pop()` returned a value, and the copy constructor of that value threw an exception while being returned, the item would be deleted from the queue but never successfully received by the caller—resulting in permanent data loss. By separating the read and the removal, the C++ standard library eliminates this risk.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <queue>\n#include <string>\n\nint main() {\n    std::queue<std::string> tasks;\n    \n    tasks.push("Parse Config");\n    tasks.push("Connect Database");\n    tasks.push("Start Server");\n    \n    while (!tasks.empty()) {\n        std::cout << "Executing: " << tasks.front() << "\\n";\n        tasks.pop();\n    }\n    \n    return 0;\n}',
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
      'Next lesson: Deque.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Circular buffer"?',
      options: [
        'The operation of adding an item to the back of a queue. It exists To record a new arrival without disturbing the items already waiting in line.',
        'An array where the end wraps around to the beginning. It exists To allow a queue to reuse array space continuously as items are enqueued and dequeued, preventing the items from walking off the end of fixed-size memory.',
        'The operation of removing an item from the front of a queue. It exists To consume the oldest item so the system can move on to the next one in line.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Dequeue"?',
      options: [
        'The operation of removing an item from the front of a queue. It exists To consume the oldest item so the system can move on to the next one in line.',
        'A linked list that maintains explicit pointers to both the head and the tail nodes. It exists To allow O(1) instantaneous insertion at the back (tail) and removal at the front (head), without traversing the list.',
        'A data structure that enforces First-In-First-Out (FIFO) access. It exists To guarantee fairness and correct sequencing when processing streams of data or tasks, ensuring the oldest item is handled before any newer ones.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Two-pointer linked list"?',
      options: [
        'An array where the end wraps around to the beginning. It exists To allow a queue to reuse array space continuously as items are enqueued and dequeued, preventing the items from walking off the end of fixed-size memory.',
        'A linked list that maintains explicit pointers to both the head and the tail nodes. It exists To allow O(1) instantaneous insertion at the back (tail) and removal at the front (head), without traversing the list.',
        'The operation of removing an item from the front of a queue. It exists To consume the oldest item so the system can move on to the next one in line.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Queue"?',
      options: [
        'A data structure that enforces First-In-First-Out (FIFO) access. It exists To guarantee fairness and correct sequencing when processing streams of data or tasks, ensuring the oldest item is handled before any newer ones.',
        'An array where the end wraps around to the beginning. It exists To allow a queue to reuse array space continuously as items are enqueued and dequeued, preventing the items from walking off the end of fixed-size memory.',
        'The operation of adding an item to the back of a queue. It exists To record a new arrival without disturbing the items already waiting in line.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Queue** — A data structure that enforces First-In-First-Out (FIFO) access. It exists To guarantee fairness and correct sequencing when processing streams of data or tasks, ensuring the oldest item is handled before any newer ones.',
    '**Enqueue** — The operation of adding an item to the back of a queue. It exists To record a new arrival without disturbing the items already waiting in line.',
    '**Dequeue** — The operation of removing an item from the front of a queue. It exists To consume the oldest item so the system can move on to the next one in line.',
    '**Circular buffer** — An array where the end wraps around to the beginning. It exists To allow a queue to reuse array space continuously as items are enqueued and dequeued, preventing the items from walking off the end of fixed-size memory.',
    '**Two-pointer linked list** — A linked list that maintains explicit pointers to both the head and the tail nodes. It exists To allow O(1) instantaneous insertion at the back (tail) and removal at the front (head), without traversing the list.',
  ],

  checkpoints: ['read-intuition'],
}
