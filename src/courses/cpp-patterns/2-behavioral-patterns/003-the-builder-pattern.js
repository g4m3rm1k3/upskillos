// cpp-patterns — Lesson 7: The Builder Pattern
// Auto-converted from src/docs/projects/cpp-patterns/Lesson 07 *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {
  id: 'cpp-patterns-07-the-builder-pattern',
  slug: 'the-builder-pattern',
  chapter: 2,
  order: 3,
  title: 'The Builder Pattern',
  subtitle: 'Behavioral and Creational Patterns',
  tags: ['invariant', 'half-constructed-object', 'fluent-interface', 'method-chaining', 'move-semantics'],

  hook: {
    question: 'What is "The Builder Pattern", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'CppNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 2 core ideas: Method Chaining and the Builder, Finalization and the Invariant.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Invariant:** A rule or condition about an object\'s internal state that must always be true for the object to be valid. Invariants exist so that other code interacting with the object can trust it will not crash or behave unpredictably.\n- **Half-Constructed Object:** An object that has been instantiated but hasn\'t yet had all its necessary fields populated to satisfy its invariants. This is dangerous because exposing it allows other parts of the system to observe or use the object in an invalid state.\n- **Fluent Interface:** An API design that relies on method chaining to make the code read like a sentence. It exists to reduce the boilerplate of repeating the object name for every configuration step.\n- **Method Chaining:** The practice of calling multiple methods sequentially on the same object in a single statement. It solves the problem of visual clutter when configuring many properties of an object.\n- **Move Semantics:** A C++ feature that transfers ownership of resources from one object to another without copying them. It exists to avoid expensive memory allocations when data is being handed off permanently.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **HttpRequestBuilder:** The builder object responsible for collecting the configuration.\n- **HttpRequest:** The target domain object representing an outgoing network request.\n- **std::move:** A standard library function that casts an object to an rvalue reference.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: '1. `HttpRequestBuilder()` creates an empty, valid builder object. 2. `.method("POST")` modifies the builder\'s internal state to "POST" and returns a reference to itself. 3. `.url(...)` modifies the builder\'s internal state to the URL and returns a reference to itself. 4. `.build()` verifies that the accumulated state meets all invariants (URL is not empty). 5. The verified state is moved out of the builder and into the final `HttpRequest` object. The rest of the program now has an object it can trust.',
      },
    ],
    visualizations: [
      {
        id: 'CppNotebook',
        title: 'Lesson 7: The Builder Pattern',
        caption: 'The Builder Pattern',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Method Chaining and the Builder',
              prose: [
                'When building a complex object, we often need to set many optional fields. If we pass them all in the constructor, we end up with a massive parameter list where it is easy to confuse the order of arguments. If we use a default constructor and setter methods, we expose a half-constructed object to the system—one that might be missing required fields. We need a way to build the object step-by-step without exposing it while it is incomplete.',
                '## How the Code Works',
                '- `class`: The keyword that begins defining a blueprint for an object.\n- `HttpRequestBuilder`: The name of our custom builder class.\n- `{`: Opens the class definition body.\n- `std::string`: The standard library type for a text string.\n- `method_`: A private member variable holding the HTTP method.\n- `=`: The assignment operator initializing the field.\n- `"GET"`: A string literal acting as the default value.\n- `;`: Ends the statement.\n- `std::string url_;`: A private member variable for the URL. Initially an empty string.\n- `public:`: The access modifier exposing the configuration methods to external callers.\n- `HttpRequestBuilder&`: The return type of our configuration methods. Returning a reference (`&`) means we don\'t copy the builder; we return the exact instance being operated on.\n- `method`: The name of the configuration function.\n- `(std::string m)`: The parameter list, accepting the HTTP method text by value.\n- `{`: Opens the method body.\n- `method_ =`: Prepares to assign a new value to our member variable.\n- `std::move`: Casts the parameter `m` to an rvalue reference. **Move Semantics** exist here to transfer ownership of the string\'s heap allocation directly from `m` to `method_` without making an expensive copy.\n- `(m)`: The variable being moved.\n- `;`: Ends the assignment statement.\n- `return`: The keyword exiting the method and sending a value back to the caller.\n- `*`: The dereference operator.\n- `this`: A hidden pointer to the current object instance executing the method. `*this` yields the object itself, satisfying the `HttpRequestBuilder&` return type.\n- `;`: Ends the return statement.\n- `}`: Closes the method.\n- `HttpRequestBuilder& url(std::string u) { url_ = std::move(u); return *this; }`: The exact same pattern applied to the URL property.\n- `}`: Closes the class definition.\n- `;`: Ends the class declaration.',
                '**CS lens.** This embodies the concept of an accumulator. A mutable structure slowly gathers state over time until a final operation freezes or evaluates it. Also recognized in: string builders (`StringBuilder` in Java/C#), accumulation passes in compiler AST construction, hash digest algorithms (updating the state repeatedly before a final `digest()` call).',
                '**SE lens.** The design principle here is separating construction from representation. The alternative not chosen is a massive constructor (`HttpRequest("GET", "http://example.com", "", "", 30, 3)`), which forces callers to pass many arguments at once. The tradeoff is that we must maintain two classes—the builder and the target object—which increases the amount of boilerplate code we write.'
              ],
              typeIt: true,
              solution: 'class HttpRequestBuilder {\n    std::string method_ = "GET";\n    std::string url_;\npublic:\n    HttpRequestBuilder& method(std::string m) {\n        method_ = std::move(m);\n        return *this;\n    }\n    HttpRequestBuilder& url(std::string u) {\n        url_ = std::move(u);\n        return *this;\n    }\n};',
              code: '',
            },
            {
              id: 2,
              cellTitle: 'Finalization and the Invariant',
              prose: [
                'The builder holds the state, but we need an actual `HttpRequest` object to use in our system. Furthermore, an `HttpRequest` must never exist without a URL. If we allow someone to create a blank `HttpRequest` and set the URL later, they might pass that blank request to a networking function before the URL is set, causing a crash. We need to validate the invariant and produce the target object only when it is safe to do so.',
                '## How the Code Works',
                '- `class HttpRequest {`: Declares our target domain class.\n- `std::string method_; std::string url_;`: Private fields representing the finalized object state.\n- `public:`: The access modifier exposing the constructor and methods.\n- `HttpRequest`: The constructor function name.\n- `(std::string m, std::string u)`: The constructor parameters.\n- `:`: Begins the member initializer list, allowing us to initialize fields before the constructor body runs.\n- `method_`: The member variable being initialized.\n- `(`: Opens initialization arguments.\n- `std::move(m)`: Transfers ownership of `m` directly into the member.\n- `)`: Closes initialization arguments.\n- `,`: Separates initialization items.\n- `url_(std::move(u))`: Initializes the URL field by moving `u` into it.\n- `{}`: The empty body of the constructor. No further initialization is needed.\n- `void print() const { ... }`: A helper method. `const` guarantees it won\'t modify the object\'s internal state.\n- `HttpRequest build() {`: The method on `HttpRequestBuilder` that finalizes the construction, returning a fully formed `HttpRequest` by value.\n- `if`: The conditional keyword.\n- `(`: Opens the condition.\n- `url_.empty()`: Calls a standard string method that returns `true` if the string has length zero.\n- `)`: Closes the condition.\n- `{`: Opens the conditional block.\n- `throw`: The keyword used to raise an exception.\n- `std::runtime_error`: A standard exception type for runtime failures.\n- `("URL is required")`: The error message.\n- `;`: Ends the throw statement. This entirely halts execution and prevents a **half-constructed object** from being created.\n- `}`: Closes the conditional block.\n- `return`: Sends the final object back to the caller.\n- `HttpRequest`: Invokes the target object\'s constructor.\n- `(std::move(method_), std::move(url_))`: Transfers the builder\'s string buffers directly into the new object. The builder becomes empty, but its job is done.\n- `;`: Ends the return statement.\n- `int main() {`: The program entry point.\n- `HttpRequest req`: Declares our target variable.\n- `=`: Assignment operator.\n- `HttpRequestBuilder()`: Instantiates a temporary, anonymous builder.\n- `.method`: Calls the method function on the builder.\n- `("POST")`: Passes the new method type.\n- `.url`: Chained directly onto the `HttpRequestBuilder&` reference returned by `.method()`.\n- `("https://api.example.com/data")`: Passes the URL.\n- `.build()`: Chained directly onto the reference returned by `.url()`. Invokes the final validation and construction.\n- `;`: Ends the chained statement.\n- `req.print();`: Proves the object is populated by outputting its state.\n- `return 0;`: Exits the program successfully.',
                '**CS lens.** This embodies a state machine transition from a mutable, unverified "Draft" state to an immutable, verified "Final" state. Also recognized in: uncommitted database transactions becoming permanent via `COMMIT`, draft DOM elements before attachment to the document tree, unvalidated forms transforming into strict payload structures.',
                '**SE lens.** The design principle here is "make invalid states unrepresentable" (or at least, unreachable by the broader system). The alternative not chosen is allowing `HttpRequest` to have a default constructor and exposing a `setUrl()` method on it. If we did that, another thread or function could get hold of the `HttpRequest` between its instantiation and the `setUrl()` call, attempting to send a request with no destination. The cost of our builder approach is that the builder instance\'s internal strings are left empty after `build()` is called, meaning a single builder cannot safely be used twice without explicit resetting.'
              ],
              typeIt: true,
              solution: 'class HttpRequest {\n    std::string method_;\n    std::string url_;\npublic:\n    HttpRequest(std::string m, std::string u) \n        : method_(std::move(m)), url_(std::move(u)) {}\n    \n    void print() const {\n        std::cout << method_ << " " << url_ << "\\n";\n    }\n};\n\n// ... inside HttpRequestBuilder ...\n    HttpRequest build() {\n        if (url_.empty()) {\n            throw std::runtime_error("URL is required");\n        }\n        return HttpRequest(std::move(method_), std::move(url_));\n    }',
              expectedOutput: 'POST https://api.example.com/data',
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
      'Next lesson: Unit Testing with Catch2.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Method Chaining"?',
      options: [
        'An object that has been instantiated but hasn\'t yet had all its necessary fields populated to satisfy its invariants. This is dangerous because exposing it allows other parts of the system to observe or use the object in an invalid state.',
        'The practice of calling multiple methods sequentially on the same object in a single statement. It solves the problem of visual clutter when configuring many properties of an object.',
        'An API design that relies on method chaining to make the code read like a sentence. It exists to reduce the boilerplate of repeating the object name for every configuration step.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Fluent Interface"?',
      options: [
        'An API design that relies on method chaining to make the code read like a sentence. It exists to reduce the boilerplate of repeating the object name for every configuration step.',
        'A C++ feature that transfers ownership of resources from one object to another without copying them. It exists to avoid expensive memory allocations when data is being handed off permanently.',
        'A rule or condition about an object\'s internal state that must always be true for the object to be valid. Invariants exist so that other code interacting with the object can trust it will not crash or behave unpredictably.'
      ],
      correct: 0,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Move Semantics"?',
      options: [
        'The practice of calling multiple methods sequentially on the same object in a single statement. It solves the problem of visual clutter when configuring many properties of an object.',
        'A C++ feature that transfers ownership of resources from one object to another without copying them. It exists to avoid expensive memory allocations when data is being handed off permanently.',
        'An API design that relies on method chaining to make the code read like a sentence. It exists to reduce the boilerplate of repeating the object name for every configuration step.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Invariant"?',
      options: [
        'A rule or condition about an object\'s internal state that must always be true for the object to be valid. Invariants exist so that other code interacting with the object can trust it will not crash or behave unpredictably.',
        'The practice of calling multiple methods sequentially on the same object in a single statement. It solves the problem of visual clutter when configuring many properties of an object.',
        'An object that has been instantiated but hasn\'t yet had all its necessary fields populated to satisfy its invariants. This is dangerous because exposing it allows other parts of the system to observe or use the object in an invalid state.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**Invariant** — A rule or condition about an object\'s internal state that must always be true for the object to be valid. Invariants exist so that other code interacting with the object can trust it will not crash or behave unpredictably.',
    '**Half-Constructed Object** — An object that has been instantiated but hasn\'t yet had all its necessary fields populated to satisfy its invariants. This is dangerous because exposing it allows other parts of the system to observe or use the object in an invalid state.',
    '**Fluent Interface** — An API design that relies on method chaining to make the code read like a sentence. It exists to reduce the boilerplate of repeating the object name for every configuration step.',
    '**Method Chaining** — The practice of calling multiple methods sequentially on the same object in a single statement. It solves the problem of visual clutter when configuring many properties of an object.',
    '**Move Semantics** — A C++ feature that transfers ownership of resources from one object to another without copying them. It exists to avoid expensive memory allocations when data is being handed off permanently.',
  ],

  checkpoints: ['read-intuition'],
}
