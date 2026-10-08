# Technical terms arrive with a concrete need

**Status: curriculum drafting index, not an assumed prerequisite list.** Return to the [path](../../cpp-games-learning-path.md). Each lesson must define its terms in context before using them in code. This index gives authors the intended first introduction and a plain-language starting definition. It is not a glossary the learner must memorize before beginning.

## Programs and C++

| Term | Starting definition | First lesson and example |
|---|---|---|
| Source / executable | The text you edit / the program the toolchain produces to run | A01: an edited greeting does not change the old executable |
| Compiler | A tool that translates source and reports language errors | A01: build the first score printer |
| Type | A category of values and permitted operations | A02: integer division versus floating-point division |
| Initialization / assignment | Giving a new object its initial value / changing an existing object's value | A02: start a score at zero, then update it |
| Stream / EOF | A sequence of input or output data / the indication that input has ended | A03: read a score and handle a closed input stream |
| Function / parameter / argument | A named operation / its local input name / the value supplied by a caller | A05: calculate missing points for two players |
| Return value | The result passed back to the caller, distinct from text printed to a terminal | A05: use missing points inside another calculation |
| Scope / lifetime | Where a name can be used / when its object exists | A06 for scope; A14 for observing destruction |
| Value semantics | Copying creates a separately modifiable value | A06–A07: changing a copied score leaves the original alone |
| Reference / alias | Another way to refer to an existing object rather than an independent copy | A06: bank into the caller's score |
| Struct / object / member | A user-defined type / one instance of a type / data or a function belonging to it | A07: independent player objects |
| Container | An object holding a collection of other values | A07: fixed player array, then a growing history vector |
| Enum | A type with named choices instead of unrelated magic numbers | A08: Roll and Bank |
| Invariant | A condition that valid observable states must satisfy | A10: accepted score operations cannot create a negative score |
| Class / method | A user-defined type with data and operations / a function called on an object | A10: one Score object's bank operation |
| Encapsulation | Controlling access to representation through an interface that can uphold its rules | A10: no direct assignment to private score storage |
| Constructor / destructor | Operations that establish an object's initial state / run when its lifetime ends | A11 / A14: valid construction and scope cleanup |
| Const query | An operation promising not to modify ordinary members through that object | A10, expanded A12: inspect a score or game |
| Composition | Building an object from other member objects | A12: a game contains its state |
| Exception | A failure signal that transfers control to a matching handler | A07 names an out-of-range failure; A11 teaches throw and handling for construction; A13 compares conventions |
| Pointer / null pointer | A value referring to an object or function / a pointer value referring to no object or function | A14c: a valid borrowed object address, then absent data |
| Ownership / borrowing | Responsibility for a resource's lifetime / temporary access without that responsibility | A14b: a stream owns its open file; A14c isolates borrowing |
| RAII | Tying resource management to object initialization and destruction | A14b: scope exit closes a stream; B applies it to SDL resources |
| Declaration / definition | A statement of what a name means / the implementation or object it denotes | A15: method signature versus method body |
| Namespace | A named scope used to organize names and avoid collisions | A15: qualify the game's types |
| Translation unit | One source file after preprocessing, compiled as a unit | A15: a source file with its included declarations |
| Linker | The tool that resolves compiled references to definitions and joins program parts | A15: omitted implementation causes an unresolved reference; A16 expands the build |
| Build target / dependency | A named thing to build / another thing it needs | A17: terminal and tests depend on the rules library |
| Template | A definition parameterized by types or values | Concrete array/vector arguments in A07, expanded in A22; a tiny authored example before B18's custom owner |
| Move / moved-from | Transferring an object's state or resources into another object / the source afterward, with validity governed by its type's contract | B18: transfer a texture owner without double release |
| Lambda | A function expression that may retain access to selected surrounding values | B18: teach a tiny example before any custom-deleter use; explain capture lifetime |
| Polymorphism / override | Calling a common interface with implementation-dependent behavior / supplying that behavior in a derived class | C22: choose between two real renderers |

## Development and game logic

| Term | Starting definition | First lesson and example |
|---|---|---|
| Specification / contract | Observable behavior required for admitted inputs, including failure behavior | A09: banking adds rather than replaces |
| Unit test / regression | A focused behavior check / a previously fixed behavior breaking again | A09: a test detects the return of the replacement bug |
| Boundary case | An input at or near where a rule changes | A04, tested A09: exactly the winning target |
| Git diff / commit | A view of changes / a recorded project snapshot with history | A16: record the working split project locally |
| State machine / transition | A model of states and permitted changes / one such change | A18: roll, bank, bust and win |
| Seed / deterministic | Initial input to a pseudo-random generator / repeatable under the stated inputs and implementation | A19: replay rolls with a documented build |
| Serialization / schema | Converting data to a stored representation / the rules describing that representation | A28: versioned model file |
| API / SDK / ABI | A programming interface / development tools and supporting files / conventions compiled binary components must agree on | B01: obtain a compatible SDL build |
| Event loop | Repeatedly processing events while updating and presenting the application | B04: close remains responsive |
| Model / view / controller | Application state and behavior / presentation / coordination between input and behavior | A12 and B08–B13: one rules model, several interfaces |
| Input adapter / command | Translation from external input / an interpreted request | A19: exact text becomes a Command; B11 adds graphical events |
| String / parsing | An owned character sequence / interpreting text according to a stated grammar | A19: whole-line commands and strict matching |
| Pseudorandom engine / seed / distribution | A stateful sequence generator / its starting configuration / mapping to a probability model | A19b: reproducible die faces and constant-die failure |
| Orchestration | Connecting components in an application while keeping their rules separate | A19c: parser, die, game and fixed policy |
| Frame / timestep | One presented/rendered image's work / a duration used to advance a simulation | B05 / B22: drawing rate need not equal movement rate |
| Replay | A recorded sequence sufficient to reconstruct selected application behavior | B19: record accepted actions and actual rolls |
| Test double / smoke test | A substitute used to isolate behavior / a short basic integration run | B20 and C22: bounded app launch versus recorded draw requests |
| Profiling / bottleneck | Measuring where time/resources go / the limiting part of the measured workload | C23: distinguish CPU submission time from GPU time |

## Reinforcement learning

| Term | Starting definition | First lesson and example |
|---|---|---|
| Probability / expected value | A measure of outcome likelihood / a probability-weighted average | A20: enumerate all six die outcomes |
| Agent / environment | The decision-making component / the system it acts within | A21: learner selects, game and opponent respond |
| State / action / reward | Information describing the modeled situation / a choice / feedback defining the objective | A21: agent's decision state, Roll, terminal loss -1 |
| Episode / terminal | One run of interaction / a state ending that run | A21: one completed match |
| Decision boundary | A position where the agent can choose again, or a finished episode | A21b: include the opponent response after a bank or bust |
| Policy | A rule or procedure for selecting actions from available information | Fixed policy A19c, compared with learned choices A21–A23 |
| Q-value | An estimate of return associated with a state-action pair under the learning formulation | A22: separate estimates for Roll and Bank |
| Exploration / exploitation | Gathering experience with choices / selecting according to current estimates | A23: epsilon-greedy selection |
| Learning rate / prediction error | How much a correction is applied / target minus current estimate | A24: move halfway from 0.2 toward -1 |
| Discount / bootstrapping | Weighting future reward / using another estimate inside an update target | A25: nonterminal Q-learning target |
| Baseline / held-out evaluation | A comparison method / assessment on data or randomness not used to fit/select the evaluated model | A27: fixed strategy and new evaluation seeds |
| Uncertainty / opponent shift | Variation not captured by one reported outcome / facing a different opposing behavior | A27: repeated evaluations and bank-at-7 comparison |

## Graphics and explicit GPU work

| Term | Starting definition | First lesson and example |
|---|---|---|
| Coordinate space | A stated origin, axes and units in which coordinates have meaning | B06: window versus logical board coordinates |
| Vertex / rasterization / fragment | A geometry input point with attributes / finding covered samples / a candidate contribution to an output sample | C03 and C13: colored triangle |
| Texture / texel / UV | Image-like sampled data / one element of it / coordinates for sampling it | C05: sample a checker pattern |
| Vector / matrix | An ordered collection used for geometric quantities / a rectangular array representing a transformation here | C02 / C07: displacement, then composition |
| Projection / perspective division | Mapping a scene into viewing coordinates / dividing by homogeneous w | C09: near and far objects |
| Depth buffer | Stored depth information used to compare surface visibility | C10: nearest opaque surface survives draw-order changes |
| Shader / pipeline | A program for a GPU stage / configured stages and fixed-function state used for drawing or computation | C13 / C15: transform vertices and produce colors |
| Uniform / binding / descriptor | Shader data shared over an invocation group such as a draw / an identified resource slot / Vulkan metadata referring to a resource | C17, made explicit in D21 |
| Buffer / staging / device memory | A byte-oriented GPU resource / temporary upload data / memory bound for device use | C14, then explicit allocation in D17–D19 |
| Swapchain / image view | Presentation images managed for the window / an interpretation of an image's selected parts | C12 / D07–D08 |
| Device / queue / command buffer | The application's GPU interface / a destination for ordered submitted work / recorded commands | C11, explicit Vulkan forms in D05–D09 |
| Layout / barrier | A specified usage arrangement for an image / an explicit dependency between accesses | D10: render an acquired image, then present it |
| Semaphore / fence | Synchronization primitives for signaling and waiting under their defined contracts | D11: separate device dependencies, host submission completion and presentation completion |
| Frame in flight | Frame work submitted but not yet safe to reuse as completed | D26: frame resources differ from acquired-image resources |
| Resource retirement | Deferring release until all relevant uses are known to have completed | D27: replacing a texture while work is pending |
| Validation layer | An optional diagnostic layer that checks API usage against many rules | D03: interpret an actual rule violation; it is not a proof of all correctness |

Authors must extend this index if implementation introduces another prerequisite. Avoid unexplained convenience helpers: `std::span`, smart-pointer factories, move utilities, callbacks, reflection tools and error-handling macros all need teaching before use. Advanced terms outside the core path belong in explicitly optional extensions, not in the first window lesson.
