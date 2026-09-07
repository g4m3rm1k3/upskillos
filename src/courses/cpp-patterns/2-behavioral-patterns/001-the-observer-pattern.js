// cpp-patterns — Lesson 5: The Observer Pattern
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 05 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-05-the-observer-pattern',
  slug: 'the-observer-pattern',
  chapter: 2,
  order: 1,
  title: 'The Observer Pattern',
  subtitle: 'Behavioral and Creational Patterns',
  tags: ['observer-pattern', 'subject', 'observer', 'dangling-pointer-reference', 'undefined-behavior-ub'],

  hook: {
    question: 'What is "The Observer Pattern", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 2 core ideas: The Observer Pattern and Callback Registration, The Dangling Observer Problem and std::weak_ptr.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Observer Pattern:** a behavioral design pattern where an object (the subject) maintains a list of its dependents (observers) and notifies them automatically of any state changes, usually by calling one of their methods. It exists to break tight coupling, allowing the subject and observers to evolve independently.\n- **Subject:** the entity that holds state and broadcasts changes. It exists to be the single source of truth that others listen to, rather than having others constantly poll it.\n- **Observer:** the entity that listens for changes from a Subject. It exists to react to state changes without being permanently hardcoded into the Subject\'s internal logic.\n- **Dangling Pointer/Reference:** a pointer or reference that points to a memory location that has been deleted or deallocated. It exists as a constant hazard in systems where objects outlive the things pointing to them, leading to undefined behavior (UB).\n- **Undefined Behavior (UB):** a situation where the C++ standard provides no guarantees about what the program will do. It exists as a consequence of C++ trusting the programmer to manage memory and lifetimes correctly in exchange for performance.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::function:** a general-purpose polymorphic function wrapper.\n- **std::vector:** a sequence container that encapsulates dynamic size arrays.\n- **std::weak_ptr:** a smart pointer that holds a non-owning ("weak") reference to an object that is managed by std::shared_ptr.\n- **std::enable_shared_from_this:** a base class template that allows an object to create a std::shared_ptr to itself.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: '1. `main` calls `sensor.setTemperature(30)`. 2. `Sensor` updates its internal state to 30. 3. `Sensor` iterates over its vector of `std::function` callbacks. 4. The first callback executes its lambda. 5. The lambda attempts to upgrade its captured `std::weak_ptr<Display>`. 6. The `Display` object has been destroyed, so `lock()` returns an empty `std::shared_ptr`. 7. The `if` branch fails, and the `else` branch prints `[Dead observer skipped]`, safely returning control without dereferencing a dangling pointer.',
      },
      {
        type: 'warning',
        title: 'What Breaks Without This',
        body: 'if `sensor.subscribe` accepted a raw pointer or if the lambda captured `this` directly (`[this](int temp) { this->update(temp); }`), the second call to `setTemperature(30)` would invoke `update()` on a destroyed `Display` object, leading to Undefined Behavior and a likely segfault.',
      },
      {
        type: 'procedure',
        title: 'Exercises',
        body: '- Add a `Logger` class that also observes the `Sensor` and prints the time alongside the temperature.\n- Modify `Sensor::notify()` to remove dead callbacks from the `observers` vector instead of just skipping them.',
      },
      {
        type: 'strategy',
        title: 'Definition of Done',
        body: '- `Sensor` maintains a list of generic `std::function` callbacks.\n- `Sensor` notifies all callbacks when its state changes.\n- Listeners use `std::weak_ptr` to ensure they are not invoked after destruction.\n- Code compiles without warnings (`g++ -Wall -Wextra -std=c++17 main.cpp -o observer`).\n- `git commit -m "Implement safe Observer pattern with std::function and std::weak_ptr to decouple event listeners without risking dangling pointers"`',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 5: The Observer Pattern',
        caption: 'The Observer Pattern',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Observer Pattern and Callback Registration',
              prose: [
                'A system has a core state-holding object, like a temperature sensor. Multiple other components, like a UI display, a logger, and an alarm system, need to know when the temperature changes. Hardcoding calls to `display.update()`, `logger.log()`, and `alarm.check()` inside the sensor\'s `setTemperature` method tightly couples the sensor to those specific classes. Every new listener requires modifying the sensor\'s code, recompiling it, and making it depend on the new listener\'s header. The sensor should not know or care who is listening.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <functional>\n#include <vector>\n\nint main() {\n    std::vector<std::function<void(int)>> callbacks;\n    \n    // Registering a callback\n    callbacks.push_back([](int val) {\n        std::cout << "Callback A received: " << val << "\\n";\n    });\n    \n    // Registering another callback\n    callbacks.push_back([](int val) {\n        std::cout << "Callback B received: " << val << "\\n";\n    });\n    \n    // The subject broadcasting an event\n    int new_value = 42;\n    for (const auto& cb : callbacks) {\n        cb(new_value);\n    }\n    \n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#include <iostream>` — includes the standard I/O library.\n- `#include <vector>` — includes the standard vector container.\n- `#include <functional>` — includes the library containing `std::function`.\n- `class Sensor { ... };` — defines the Subject class that will broadcast events.\n- `public:` — access modifier exposing the interface.\n- `using Observer = std::function<void(int)>;` — creates a type alias `Observer` for any callable taking an `int` (the new temperature) and returning `void`. It exists to make the rest of the class definition more readable.\n- `void subscribe(Observer obs) { ... }` — the method listeners call to register themselves. It takes an `Observer` callback by value.\n- `observers.push_back(std::move(obs));` — adds the callback to the end of the `std::vector`. It uses `std::move` to avoid copying the `std::function` object, transferring ownership directly into the vector for efficiency.\n- `void setTemperature(int temp) { ... }` — the state-mutating method.\n- `temperature = temp;` — updates the internal state.\n- `notify();` — triggers the broadcast immediately after the state changes.\n- `private:` — access modifier protecting internal state and helpers.\n- `void notify() { ... }` — the private helper method that actually performs the broadcast.\n- `for (const auto& obs : observers) { ... }` — iterates over every registered callback in the vector. It iterates by `const auto&` to avoid copying each `std::function` object.\n- `obs(temperature);` — executes the callback, passing the current `temperature`. This is the core mechanism of the **Observer Pattern** — the subject invoking the listener\'s code.\n- `int temperature = 0;` — the state being observed, initialized to 0.\n- `std::vector<Observer> observers;` — the dynamic array holding all registered callbacks.',
                '**CS lens.** The core computational concept here is **Inversion of Control (IoC)**. Instead of the listeners actively polling the sensor for its temperature (which wastes CPU cycles and introduces latency), the sensor pushes the update to the listeners only when something changes. Also recognized in: UI event loops (button clicks), network socket readiness events (epoll/kqueue), pub/sub messaging queues (Kafka, RabbitMQ), hardware interrupts.',
                '**SE lens.** The design principle at work is **Loose Coupling**. The alternative not chosen was having `Sensor` hold specific pointers like `Display*` and `Logger*` and call `display->update(temp)`. That alternative forces the `Sensor` class to be modified every time a new type of listener is added, violating the Open/Closed Principle. By using `std::function`, the `Sensor` depends only on the *signature* of the callback (`void(int)`), not on the specific types or identities of the listeners. The maintenance cost of this approach is that the subject now holds opaque callbacks; debugging a misbehaving listener requires tracing through the generic `std::function` invocation, which can obscure the control flow.'
              ],
              typeIt: true,
              solution: '#include <iostream>\n#include <vector>\n#include <functional>\n\nclass Sensor {\npublic:\n    using Observer = std::function<void(int)>;\n\n    void subscribe(Observer obs) {\n        observers.push_back(std::move(obs));\n    }\n\n    void setTemperature(int temp) {\n        temperature = temp;\n        notify();\n    }\n\nprivate:\n    void notify() {\n        for (const auto& obs : observers) {\n            obs(temperature);\n        }\n    }\n\n    int temperature = 0;\n    std::vector<Observer> observers;\n};',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'The Dangling Observer Problem and std::weak_ptr',
              prose: [
                'When a listener registers a callback (often a lambda capturing a pointer to itself, like `[this](int t) { this->update(t); }`), the `Sensor` stores that lambda in its `std::vector`. If the listener object is destroyed, the `Sensor` still holds the lambda and will eventually call it. The lambda will execute `this->update(t)` on a destroyed object, resulting in a dangling pointer dereference and Undefined Behavior (usually a segmentation fault). The subject needs a way to know if a listener is still alive before calling it.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n#include <memory>\n\nstruct Dummy {\n    void speak() { std::cout << "Dummy alive!\\n"; }\n};\n\nint main() {\n    std::weak_ptr<Dummy> weak;\n    \n    {\n        std::shared_ptr<Dummy> shared = std::make_shared<Dummy>();\n        weak = shared; // weak observes shared\n        \n        // Attempting to use the weak_ptr while the object is alive\n        if (std::shared_ptr<Dummy> locked = weak.lock()) {\n            locked->speak();\n        } else {\n            std::cout << "Dummy is dead.\\n";\n        }\n    } // shared goes out of scope, Dummy is destroyed\n    \n    // Attempting to use the weak_ptr after the object is destroyed\n    if (std::shared_ptr<Dummy> locked = weak.lock()) {\n        locked->speak();\n    } else {\n        std::cout << "Dummy is dead.\\n";\n    }\n    \n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#include <memory>` — includes the library for smart pointers.\n- `class Display : public std::enable_shared_from_this<Display> { ... };` — defines the observer class. It inherits from `std::enable_shared_from_this` to gain the ability to safely generate a `std::weak_ptr` or `std::shared_ptr` to itself from within its own methods.\n- `public:` — access modifier exposing the interface.\n- `void update(int temp) { ... }` — the method that reacts to the state change.\n- `std::cout << "Display showing temperature: " << temp << "\\n";` — prints the new temperature to standard output.\n- `void subscribeTo(Sensor& sensor) { ... }` — the registration method taking a reference to the `Sensor`.\n- `std::weak_ptr<Display> weak_self = shared_from_this();` — creates a non-owning weak pointer to this `Display` instance. `shared_from_this()` is provided by the base class.\n- `sensor.subscribe([weak_self](int temp) { ... });` — registers a lambda with the sensor. It captures `weak_self` by value, meaning the lambda holds a weak reference, not a strong one, preventing reference cycles and not artificially keeping the `Display` alive.\n- `if (auto shared_self = weak_self.lock()) { ... }` — inside the lambda, attempts to upgrade the weak pointer to a strong pointer. `lock()` returns a valid `std::shared_ptr` if the object is alive, and an empty one if it is dead. The `if` condition evaluates to true if the pointer is valid.\n- `shared_self->update(temp);` — if the object is alive, safely calls its `update` method.\n- `else { ... }` — if the object is dead.\n- `std::cout << "[Dead observer skipped]\\n";` — logs that the dead observer was safely handled.\n- `int main() { ... }` — the entry point of the program.\n- `Sensor sensor;` — creates the subject.\n- `{ ... }` — a nested scope to explicitly control the lifetime of the `display` object.\n- `auto display = std::make_shared<Display>();` — creates the listener as a dynamically allocated object managed by a `std::shared_ptr`.\n- `display->subscribeTo(sensor);` — registers the listener with the sensor.\n- `sensor.setTemperature(25);` — triggers a broadcast while the display is alive.\n- `} // display is destroyed here` — the `display` shared pointer goes out of scope. Because the sensor\'s lambda only holds a `weak_ptr`, the `Display` object\'s reference count hits zero and it is cleanly destroyed.\n- `sensor.setTemperature(30);` — triggers a broadcast when the display is dead. The lambda still executes, but `weak.lock()` fails.\n- `return 0;` — terminates the program successfully.',
                '**CS lens.** The concept here is **Safe Lifecycle Management**. In languages with garbage collection, a registered callback will keep the listener alive indefinitely (a "memory leak" in managed languages, where the object is unneeded but reachable). In C++, manual lifecycle management forces us to explicit model the relationship: the subject does not *own* the listeners, so it should only hold weak references to them. Also recognized in: cache eviction policies (holding weak references to cached objects so they can be freed under memory pressure), DOM event listeners in modern web frameworks (auto-unsubscribing on component unmount).',
                '**SE lens.** The design principle at work is **Defensive Programming**. The alternative not chosen was having the `Display` explicitly call `sensor.unsubscribe(this)` in its destructor. That alternative requires the `Sensor` to implement an `unsubscribe` method (which means searching the vector and dealing with concurrent modification if the unsubscription happens during a notification loop) and forces every listener to remember to unsubscribe perfectly. The maintenance cost of this `weak_ptr` approach is that the `Sensor`\'s `std::vector` slowly fills up with "dead" lambdas that do nothing when called, potentially causing a performance hit over time. A production system would periodically prune dead callbacks from the list during `notify()`.'
              ],
              typeIt: true,
              solution: '#include <memory>\n\nclass Display : public std::enable_shared_from_this<Display> {\npublic:\n    void update(int temp) {\n        std::cout << "Display showing temperature: " << temp << "\\n";\n    }\n\n    void subscribeTo(Sensor& sensor) {\n        std::weak_ptr<Display> weak_self = shared_from_this();\n        sensor.subscribe([weak_self](int temp) {\n            if (auto shared_self = weak_self.lock()) {\n                shared_self->update(temp);\n            } else {\n                std::cout << "[Dead observer skipped]\\n";\n            }\n        });\n    }\n};\n\nint main() {\n    Sensor sensor;\n    \n    {\n        auto display = std::make_shared<Display>();\n        display->subscribeTo(sensor);\n        sensor.setTemperature(25);\n    } // display is destroyed here\n    \n    sensor.setTemperature(30); // notify is called again\n    \n    return 0;\n}',
              expectedOutput: 'Display showing temperature: 25\n[Dead observer skipped]',
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
      'Next lesson: The Factory Pattern.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Observer"?',
      options: [
        'the entity that listens for changes from a Subject. It exists to react to state changes without being permanently hardcoded into the Subject\'s internal logic.',
        'the entity that holds state and broadcasts changes. It exists to be the single source of truth that others listen to, rather than having others constantly poll it.',
        'a situation where the C++ standard provides no guarantees about what the program will do. It exists as a consequence of C++ trusting the programmer to manage memory and lifetimes correctly in exchange for performance.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Subject"?',
      options: [
        'the entity that holds state and broadcasts changes. It exists to be the single source of truth that others listen to, rather than having others constantly poll it.',
        'a situation where the C++ standard provides no guarantees about what the program will do. It exists as a consequence of C++ trusting the programmer to manage memory and lifetimes correctly in exchange for performance.',
        'a behavioral design pattern where an object (the subject) maintains a list of its dependents (observers) and notifies them automatically of any state changes, usually by calling one of their methods. It exists to break tight coupling, allowing the subject and observers to evolve independently.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Undefined Behavior (UB)"?',
      options: [
        'a behavioral design pattern where an object (the subject) maintains a list of its dependents (observers) and notifies them automatically of any state changes, usually by calling one of their methods. It exists to break tight coupling, allowing the subject and observers to evolve independently.',
        'a situation where the C++ standard provides no guarantees about what the program will do. It exists as a consequence of C++ trusting the programmer to manage memory and lifetimes correctly in exchange for performance.',
        'a pointer or reference that points to a memory location that has been deleted or deallocated. It exists as a constant hazard in systems where objects outlive the things pointing to them, leading to undefined behavior (UB).'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Observer Pattern"?',
      options: [
        'a pointer or reference that points to a memory location that has been deleted or deallocated. It exists as a constant hazard in systems where objects outlive the things pointing to them, leading to undefined behavior (UB).',
        'a behavioral design pattern where an object (the subject) maintains a list of its dependents (observers) and notifies them automatically of any state changes, usually by calling one of their methods. It exists to break tight coupling, allowing the subject and observers to evolve independently.',
        'the entity that holds state and broadcasts changes. It exists to be the single source of truth that others listen to, rather than having others constantly poll it.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Observer Pattern** — a behavioral design pattern where an object (the subject) maintains a list of its dependents (observers) and notifies them automatically of any state changes, usually by calling one of their methods. It exists to break tight coupling, allowing the subject and observers to evolve independently.',
    '**Subject** — the entity that holds state and broadcasts changes. It exists to be the single source of truth that others listen to, rather than having others constantly poll it.',
    '**Observer** — the entity that listens for changes from a Subject. It exists to react to state changes without being permanently hardcoded into the Subject\'s internal logic.',
    '**Dangling Pointer/Reference** — a pointer or reference that points to a memory location that has been deleted or deallocated. It exists as a constant hazard in systems where objects outlive the things pointing to them, leading to undefined behavior (UB).',
    '**Undefined Behavior (UB)** — a situation where the C++ standard provides no guarantees about what the program will do. It exists as a consequence of C++ trusting the programmer to manage memory and lifetimes correctly in exchange for performance.',
  ],

  checkpoints: ['read-intuition'],
}
