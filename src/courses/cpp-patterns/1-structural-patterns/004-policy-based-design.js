// cpp-patterns — Lesson 4: Policy-Based Design
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 04 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-04-policy-based-design',
  slug: 'policy-based-design',
  chapter: 1,
  order: 4,
  title: 'Policy-Based Design',
  subtitle: 'Structural and Generic Patterns',
  tags: ['policy-based-design', 'host-class', 'policy-class', 'empty-base-class-optimization-ebco', 'runtime-polymorphism', 'compile-time-polymorphism'],

  hook: {
    question: 'What is "Policy-Based Design", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 2 core ideas: The Host Class and a Single Policy, State in Policies and Empty Base Class Optimization (EBCO).',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Policy-Based Design:** a design approach where a class\'s behavior is configured by inheriting from template parameters (policies), solving the problem of combinatorial explosion in class design without paying the runtime cost of virtual functions.\n- **Host Class:** the primary template class that takes policy classes as parameters and inherits from them or contains them, solving the problem of providing a unified interface while delegating specific, interchangeable behaviors to the policies.\n- **Policy Class:** a class that implements a specific interface expected by the host class, solving the problem of encapsulating a single orthogonal dimension of behavior (like thread safety or bounds checking) so it can be swapped effortlessly.\n- **Empty Base Class Optimization (EBCO):** a compiler optimization where an empty base class contributes zero bytes to the size of a derived class, solving the problem of space overhead when inheriting from stateless policy classes.\n- **Runtime Polymorphism:** resolving behavior at runtime using virtual functions and vtables, solving the problem of changing behavior dynamically, but introducing performance overhead and preventing compiler inlining.\n- **Compile-Time Polymorphism:** resolving behavior during compilation using templates, solving the problem of abstracting behavior with zero runtime cost, at the expense of needing all information at compile time.\n- **Multiple Inheritance:** a language feature where a single class inherits from more than one base class, solving the problem of combining multiple distinct interfaces or behaviors into one type.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **std::logic_error:** A standard library exception class representing errors in the program\'s internal logic that could theoretically be prevented.\n- **std::cout:** The standard character output stream object.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Let\'s trace the execution flow when instantiating and dereferencing a concrete policy-configured pointer: 1. `SmartPtr<int, EnforceNotNull, SingleThreaded> ptr(new int(5));` — The compiler stamps out a specific class that inherits from both `EnforceNotNull` and `SingleThreaded`. 2. `*ptr` — The overloaded dereference operator is invoked. 3. `ThreadingPolicy::lock()` — Statically resolves to `SingleThreaded::lock()`, an empty function that is entirely inlined away. 4. `CheckingPolicy::check(pointee)` — Statically resolves to `EnforceNotNull::check()`. The pointer is not null, so the `if` condition fails and no exception is thrown. 5. `ThreadingPolicy::unlock()` — Resolves to `SingleThreaded::unlock()`, again inlined to nothing. 6. `return ref;` — The value `5` is yielded to the caller. At runtime, this entire sequence of instructions compiles down to the exact same machine code as a bare pointer dereference, but with the safety of a null check statically guaranteed by the compiler.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 4: Policy-Based Design',
        caption: 'Policy-Based Design',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Host Class and a Single Policy',
              prose: [
                'We want to write a class whose behavior can be configured. The traditional Object-Oriented approach uses the Strategy pattern: the class holds a pointer to an interface with virtual functions, and we pass in different implementations at runtime. However, virtual functions introduce indirection, require following a vtable pointer, and almost always prevent the compiler from inlining the code. When the behavior we want is entirely known at compile time—like whether a pointer should check for null before dereferencing—paying this runtime cost on every single access is unacceptable in C++. We need a way to swap behaviors without virtual functions.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n\n// The Policy\nstruct NoCheckPolicy {\n    static void check(void* ptr) {\n        // Does nothing, completely optimized away\n    }\n};\n\nstruct StrictCheckPolicy {\n    static void check(void* ptr) {\n        if (!ptr) {\n            std::cout << "Error: Null pointer dereference!\\n";\n        }\n    }\n};\n\n// The Host Class\ntemplate <typename CheckingPolicy>\nclass Wrapper {\n    void* ptr;\npublic:\n    Wrapper(void* p) : ptr(p) {}\n    \n    void doSomething() {\n        CheckingPolicy::check(ptr);\n        std::cout << "Doing something with ptr\\n";\n    }\n};\n\nint main() {\n    Wrapper<NoCheckPolicy> fastWrapper(nullptr);\n    fastWrapper.doSomething(); \n    \n    Wrapper<StrictCheckPolicy> safeWrapper(nullptr);\n    safeWrapper.doSomething(); \n    return 0;\n}\n```',
                '## How the Code Works',
                '- `#pragma once` — A preprocessor directive that tells the compiler to include this header file exactly once per compilation unit, solving the problem of duplicate definition errors if the header is included multiple times.\n- `#include <stdexcept>` — Includes the standard library header for standard exception types like `std::logic_error`.\n- `struct NoCheck` — Defines a policy class. It is a `struct` so its members are `public` by default, creating a clean, accessible interface for the host class without needing access modifiers.\n- `{` — Opens the struct body.\n- `template <typename T>` — A template parameter for the policy method itself, allowing the check to apply to a pointer of any type without needing the policy class itself to be templated on `T`.\n- `static void check(T* ptr)` — A static method that takes the raw pointer. A static method belongs to the class itself rather than an instance, meaning it has no state and does not operate on a specific object.\n- `{}` — The empty body of the method. For `NoCheck`, we intentionally do nothing. The compiler will completely inline and eliminate calls to this empty method.\n- `};` — Closes the struct definition.\n- `struct EnforceNotNull` — Defines an alternative policy class adhering to the exact same expected interface (a static `check` method).\n- `{` — Opens the struct body.\n- `template <typename T>` — Again, templates the method for any pointer type.\n- `static void check(T* ptr)` — The matching signature required by the implicit contract.\n- `{` — Opens the method body.\n- `if (!ptr)` — The actual boolean check testing if the pointer evaluates to false (null).\n- `throw std::logic_error("Null pointer dereference");` — The concrete logic for this policy. It aborts the operation by throwing an exception if the pointer is null.\n- `}` — Closes the method block.\n- `};` — Closes the struct definition.\n- `template <typename T, typename CheckingPolicy>` — The template parameter list for our host class. `T` is the type of the value being pointed to, and `CheckingPolicy` is the policy class type that will govern validation behavior.\n- `class SmartPtr : public CheckingPolicy` — The host class definition. It inherits directly from the policy parameter. This is a hallmark of Policy-Based Design. By inheriting from the policy, the host gains access to the policy\'s protected and public members.\n- `{` — Opens the class body.\n- `T* pointee;` — The raw pointer being managed as internal state.\n- `public:` — Access modifier making the following members accessible to callers outside the class.\n- `explicit SmartPtr(T* p)` — The constructor. It is marked `explicit` to prevent the compiler from implicitly converting a raw pointer into a `SmartPtr` without the programmer deliberately asking for it.\n- `: pointee(p)` — An initializer list that directly assigns the raw pointer parameter `p` to the member field `pointee` before the constructor body runs.\n- `{}` — The empty constructor body.\n- `T& operator*()` — Overloads the dereference operator so the object acts syntactically like a standard pointer. It returns a reference to the pointed-to type.\n- `{` — Opens the operator method body.\n- `CheckingPolicy::check(pointee);` — Explicitly calls the static `check` method on the policy class, passing the raw pointer. Because `CheckingPolicy` is resolved at compile time, there is no virtual dispatch or runtime indirection.\n- `return *pointee;` — Performs the actual dereference of the raw pointer after the policy has vetted it, returning the value.\n- `}` — Closes the method.\n- `T* operator->()` — Overloads the arrow operator for member access, similarly returning the raw pointer for the caller to use.\n- `{` — Opens the operator method body.\n- `CheckingPolicy::check(pointee);` — Evaluates the policy again before yielding the pointer.\n- `return pointee;` — Returns the raw pointer.\n- `}` — Closes the method.\n- `};` — Closes the class definition.',
                '**CS lens.** This embodies the **Strategy Pattern**, but shifted from runtime to compile time. Also recognized in: C++ standard library allocators (`std::vector<T, Allocator>`), custom deleter types in `std::unique_ptr`, hashing and equality policies in `std::unordered_map`.',
                '**SE lens.** **Compile-Time Polymorphism vs Runtime Polymorphism**. The runtime alternative (holding an `ICheckingPolicy*` pointer and calling `virtual void check()`) forces the object to be larger (storing the pointer) and slower (following the vtable). By using templates, we pay zero cost in memory and zero cost in execution time for the `NoCheck` case. The trade-off is that the policy must be known at compile time, and `SmartPtr<int, NoCheck>` is an entirely distinct type from `SmartPtr<int, EnforceNotNull>`—they cannot be stored in the same array or easily swapped while the program is running.'
              ],
              typeIt: true,
              solution: '#pragma once\n#include <stdexcept>\n\nstruct NoCheck {\n    template <typename T>\n    static void check(T* ptr) {}\n};\n\nstruct EnforceNotNull {\n    template <typename T>\n    static void check(T* ptr) {\n        if (!ptr) throw std::logic_error("Null pointer dereference");\n    }\n};\n\ntemplate <typename T, typename CheckingPolicy>\nclass SmartPtr : public CheckingPolicy {\n    T* pointee;\npublic:\n    explicit SmartPtr(T* p) : pointee(p) {}\n    \n    T& operator*() {\n        CheckingPolicy::check(pointee);\n        return *pointee;\n    }\n    \n    T* operator->() {\n        CheckingPolicy::check(pointee);\n        return pointee;\n    }\n};',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'State in Policies and Empty Base Class Optimization (EBCO)',
              prose: [
                'Policies don\'t always have to be stateless static methods. Sometimes a policy needs to hold state, or we need to combine multiple policies into a single host class. If we have multiple stateless policies, do they increase the size of our `SmartPtr`? We need to ensure that adding stateless policies doesn\'t inflate the memory footprint of our host class.',
                '## First, In Isolation',
                '```cpp\n#include <iostream>\n\nstruct EmptyPolicy {};\n\nclass CompositionPtr {\n    EmptyPolicy policy; // Composition\n    int* ptr;\n};\n\nclass InheritedPtr : public EmptyPolicy { // Inheritance\n    int* ptr;\n};\n\nint main() {\n    std::cout << "Size of int*: " << sizeof(int*) << "\\n";\n    std::cout << "Size of CompositionPtr: " << sizeof(CompositionPtr) << "\\n";\n    std::cout << "Size of InheritedPtr: " << sizeof(InheritedPtr) << "\\n";\n    return 0;\n}\n```',
                '## How the Code Works',
                '- `struct SingleThreaded` — A new policy class dictating how thread safety is handled.\n- `{` — Opens the struct body.\n- `void lock() {}` — The lock method. Here it is a non-static member function with an empty body, meaning acquiring the lock does literally nothing.\n- `void unlock() {}` — The unlock method, similarly empty.\n- `};` — Closes the struct definition.\n- `struct MultiThreaded` — The alternative threading policy.\n- `{` — Opens the struct body.\n- `void lock() { /* acquire real mutex */ }` — A placeholder for real synchronization logic (like calling `lock` on an internal `std::mutex`).\n- `void unlock() { /* release real mutex */ }` — The corresponding release logic.\n- `};` — Closes the struct definition.\n- `template <typename T, typename CheckingPolicy, typename ThreadingPolicy>` — The template parameter list for the host class now demands two distinct policy types alongside the underlying type `T`.\n- `class SmartPtr : public CheckingPolicy, public ThreadingPolicy` — The host class uses **Multiple Inheritance** to derive from both policies simultaneously. Because both are inherited, Empty Base Class Optimization applies to both; if both are stateless empty structs, the host class size remains exactly the size of its one pointer field.\n- `{` — Opens the class body.\n- `T* pointee;` — The managed raw pointer.\n- `public:` — Access modifier.\n- `explicit SmartPtr(T* p) : pointee(p) {}` — The constructor initializing the pointer.\n- `T& operator*()` — The dereference operator.\n- `{` — Opens the method body.\n- `ThreadingPolicy::lock();` — Invokes the lock method from the inherited threading policy. Because we inherit from it, this translates to calling `this->ThreadingPolicy::lock()`. The `ThreadingPolicy::` prefix is an explicit scope resolution telling the compiler exactly which base class\'s `lock` method to invoke.\n- `CheckingPolicy::check(pointee);` — Invokes the inherited checking policy as before.\n- `T& ref = *pointee;` — Actually dereferences the pointer and stores the resulting reference in a local variable. This is necessary because we must release the lock before we leave the function, but we can\'t do that if we execute a `return` statement immediately.\n- `ThreadingPolicy::unlock();` — Releases the lock via the inherited policy method.\n- `return ref;` — Returns the vetted, safely-accessed reference to the caller.\n- `}` — Closes the method block.\n- `T* operator->()` — The member access operator.\n- `{` — Opens the method body.\n- `ThreadingPolicy::lock();` — Acquires the lock.\n- `CheckingPolicy::check(pointee);` — Vets the pointer.\n- `ThreadingPolicy::unlock();` — Releases the lock.\n- `return pointee;` — Returns the raw pointer.\n- `}` — Closes the method block.\n- `};` — Closes the class definition.',
                '**CS lens.** **Combinatorial Design**. We have 2 checking policies and 2 threading policies, yielding 4 possible `SmartPtr` types. If we added an ownership policy with 3 options, we\'d have 12 types. Doing this with traditional inheritance would require building 12 distinct classes manually (e.g., `SingleThreadedStrictPtr`). Policy-Based Design gives us combinatorial variety with additive code effort, rather than multiplicative code effort. Also recognized in: Mixins in languages like Ruby or Scala, Traits in Rust, though those often differ in how state is bound.',
                '**SE lens.** **Multiple Inheritance**. C++ allows a class to have more than one base class. Multiple inheritance is often maligned because of the "Diamond Problem" (two parents inheriting from a common grandparent, leading to duplicated state and ambiguous method resolution). However, in Policy-Based Design, multiple inheritance is safe and idiomatic because the base classes (the policies) are completely orthogonal and strictly independent. They do not share a common base, and they govern completely separate axes of behavior, eliminating ambiguity.'
              ],
              typeIt: true,
              solution: 'struct SingleThreaded {\n    void lock() {}\n    void unlock() {}\n};\n\nstruct MultiThreaded {\n    void lock() { /* acquire real mutex */ }\n    void unlock() { /* release real mutex */ }\n};\n\ntemplate <typename T, typename CheckingPolicy, typename ThreadingPolicy>\nclass SmartPtr : public CheckingPolicy, public ThreadingPolicy {\n    T* pointee;\npublic:\n    explicit SmartPtr(T* p) : pointee(p) {}\n    \n    T& operator*() {\n        ThreadingPolicy::lock();\n        CheckingPolicy::check(pointee);\n        T& ref = *pointee;\n        ThreadingPolicy::unlock();\n        return ref;\n    }\n    \n    T* operator->() {\n        ThreadingPolicy::lock();\n        CheckingPolicy::check(pointee);\n        ThreadingPolicy::unlock();\n        return pointee;\n    }\n};',
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
      'Next lesson: The Observer Pattern.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Policy Class"?',
      options: [
        'a language feature where a single class inherits from more than one base class, solving the problem of combining multiple distinct interfaces or behaviors into one type.',
        'a class that implements a specific interface expected by the host class, solving the problem of encapsulating a single orthogonal dimension of behavior (like thread safety or bounds checking) so it can be swapped effortlessly.',
        'resolving behavior during compilation using templates, solving the problem of abstracting behavior with zero runtime cost, at the expense of needing all information at compile time.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Compile-Time Polymorphism"?',
      options: [
        'a compiler optimization where an empty base class contributes zero bytes to the size of a derived class, solving the problem of space overhead when inheriting from stateless policy classes.',
        'the primary template class that takes policy classes as parameters and inherits from them or contains them, solving the problem of providing a unified interface while delegating specific, interchangeable behaviors to the policies.',
        'resolving behavior during compilation using templates, solving the problem of abstracting behavior with zero runtime cost, at the expense of needing all information at compile time.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Empty Base Class Optimization (EBCO)"?',
      options: [
        'a compiler optimization where an empty base class contributes zero bytes to the size of a derived class, solving the problem of space overhead when inheriting from stateless policy classes.',
        'resolving behavior at runtime using virtual functions and vtables, solving the problem of changing behavior dynamically, but introducing performance overhead and preventing compiler inlining.',
        'resolving behavior during compilation using templates, solving the problem of abstracting behavior with zero runtime cost, at the expense of needing all information at compile time.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Host Class"?',
      options: [
        'the primary template class that takes policy classes as parameters and inherits from them or contains them, solving the problem of providing a unified interface while delegating specific, interchangeable behaviors to the policies.',
        'resolving behavior at runtime using virtual functions and vtables, solving the problem of changing behavior dynamically, but introducing performance overhead and preventing compiler inlining.',
        'a class that implements a specific interface expected by the host class, solving the problem of encapsulating a single orthogonal dimension of behavior (like thread safety or bounds checking) so it can be swapped effortlessly.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Policy-Based Design** — a design approach where a class\'s behavior is configured by inheriting from template parameters (policies), solving the problem of combinatorial explosion in class design without paying the runtime cost of virtual functions.',
    '**Host Class** — the primary template class that takes policy classes as parameters and inherits from them or contains them, solving the problem of providing a unified interface while delegating specific, interchangeable behaviors to the policies.',
    '**Policy Class** — a class that implements a specific interface expected by the host class, solving the problem of encapsulating a single orthogonal dimension of behavior (like thread safety or bounds checking) so it can be swapped effortlessly.',
    '**Empty Base Class Optimization (EBCO)** — a compiler optimization where an empty base class contributes zero bytes to the size of a derived class, solving the problem of space overhead when inheriting from stateless policy classes.',
    '**Runtime Polymorphism** — resolving behavior at runtime using virtual functions and vtables, solving the problem of changing behavior dynamically, but introducing performance overhead and preventing compiler inlining.',
    '**Compile-Time Polymorphism** — resolving behavior during compilation using templates, solving the problem of abstracting behavior with zero runtime cost, at the expense of needing all information at compile time.',
    '**Multiple Inheritance** — a language feature where a single class inherits from more than one base class, solving the problem of combining multiple distinct interfaces or behaviors into one type.',
  ],

  checkpoints: ['read-intuition'],
}
