
 # Adaptive Technical Lesson Schema

 Generate lessons that teach both:

 1. **what the concept means**, and
2. **exactly how the code implements and demonstrates it**.

 The lesson must never replace code explanation with a high-level summary.

 The agent should adapt depth and section selection to the concept, but **code comprehension is mandatory whenever code appears**.

---

 # 1\. Primary Lesson Contract

 Every lesson must answer these questions:

```
lesson_contract:
  primary_concept: ""
  learner_can_explain: []
  learner_can_read: []
  learner_can_write: []
  learner_can_debug: []
  project_artifact: ""
```

 The lesson is incomplete if the learner can describe the concept but cannot explain the important code implementing it.

---

 # 2\. Lesson Spine

 Use this basic sequence, but allow optional sections to appear only when justified:

```
problem
→ prediction
→ smallest example
→ run/observe
→ explain code mechanically
→ explain underlying mechanism
→ modify code
→ apply to project
→ expose trap if relevant
→ verify understanding
→ summarize
```

 The order may change when necessary, but **mechanical code explanation must occur before assuming the learner understands the implementation.**

---

 # 3\. Concept Classification

 For every concept extracted from the source:

```
concept:
  name: ""
  role: ""
  importance: 0-5
  difficulty: 0-5
  project_relevance: 0-5
  misconception_risk: 0-5
  code_explanation_required: true
  recommended_depth: ""
```

 Roles:

```
core
supporting
mechanism
application
trap
optional_deep_dive
reference_only
```

 Depth:

```
micro
standard
deep
optional
```

---

 # 4\. HARD RULE: Code Must Be Explained

 Whenever the lesson contains code, identify every **meaningful construct** in that code.

 Do NOT merely describe the code as a whole.

 For example, given:

```
public record Holder
{
    public string Name { get; init; } = "";
}
```

 the explanation must separately account for:

```
public
record
Holder
{
public
string
Name
get
init
=
""
;
}
```

 Not every punctuation mark needs prose, but every semantic construct does.

 The learner should be able to answer:

 - What is this?
- Why is it written this way?
- What does the compiler do with it?
- What happens at runtime?
- What would change if it were removed or changed?
- Why does this code use this form instead of an obvious alternative?

---

 # 5\. Code Explanation Schema

 Every important code block must have a `code_explanation`.

```
code_explanation:
  purpose: ""
  execution_context: ""
  prerequisites: []

  constructs:
    - source: ""
      construct: ""
      plain_english: ""
      syntax_role: ""
      compiler_behavior: ""
      runtime_behavior: ""
      type_behavior: ""
      why_present: ""
      what_if_changed: ""
      common_mistake: ""
      related_concepts: []

  execution_flow: []

  generated_behavior: []

  important_interactions: []

  learner_checks: []
```

 The agent MUST populate `constructs` for every meaningful construct.

---

 # 6\. Construct Explanation Rules

 For each meaningful construct, explain using the following questions.

 ## A. What is it?

 Example:

```
public
```

 > `public` is an access modifier. It makes the type/member accessible from other assemblies and types that can otherwise see it.

 ## B. What does it attach to?

 Do not leave ambiguous grammar.

 Example:

```
public record Holder
```

 Explain:

 > `public` applies to `Holder`; `record` declares the kind of type; `Holder` is the type's name.

 ## C. What does the compiler do?

 Only explain compiler behavior when relevant.

 Example:

```
record
```

 > The compiler generates record-specific members including value-oriented equality and a useful `ToString()` implementation.

 ## D. What happens at runtime?

 Only explain runtime behavior when relevant.

 Example:

```
new Holder { Name = "ABC" }
```

 Explain:

 > C# constructs a `Holder`, then assigns `"ABC"` through the `init` accessor during object initialization.

 ## E. Why is this form used?

 Example:

```
get; init;
```

 > `init` is used instead of `set` because the project wants the value fixed after construction.

 ## F. What happens if it changes?

 Example:

```
get; set;
```

 > The property could now be assigned after construction, so callers could mutate an existing `Holder`.

 This is mandatory for constructs where the alternative materially changes behavior.

---

 # 7\. Do Not Explain Code Token-by-Token When That Would Be Meaningless

 The goal is **semantic granularity**, not obsessive narration.

 For:

```
Console.WriteLine("record, equal: " + (dataA == dataB));
```

 Explain:

 1. `Console.WriteLine`
2. string literal
3. `+`
4. `(dataA == dataB)`
5. `==`
6. why the parentheses are present

 Do NOT produce:

 > `(` opens a parenthesis.\
>  `)` closes a parenthesis.

 Unless punctuation itself is the concept being taught.

---

 # 8\. Code Explanation Depth

 Choose depth based on the construct.

 ## Micro

 For familiar syntax:

```
var x = 5;
```

 > `var` lets the compiler infer the variable's static type from the initializer; here `x` is an `int`.

 One or two sentences.

 ## Standard

 For important syntax:

```
public string Name { get; init; } = "";
```

 Explain:

 - access
- type
- property
- getter
- init-only setter
- default value
- why this project uses it

 ## Deep

 For the primary mechanism:

```
public record Holder
```

 Explain:

 - what `record` declares
- how it differs from `class`
- generated equality
- generated `ToString`
- generated copying support
- implications for `==`
- what is actually happening conceptually
- relevant compiler/runtime distinction

---

 # 9\. Mandatory Before/After Analysis

 When the lesson teaches a language feature by changing code, explicitly show the smallest change.

 Example:

```
-public class Holder
+public record Holder
```

 Then explain:

```
change_analysis:
  changed: "class → record"
  unchanged: []
  behavioral_difference:
    - ""
  compiler_difference:
    - ""
  runtime_difference:
    - ""
```

 The agent must identify **what changed and what did not**.

 This is especially important for language lessons.

---

 # 10\. Generated Code Explanation

 If the language/compiler generates behavior, separate three levels:

```
source code
↓
language semantics
↓
generated/compiled representation
↓
runtime behavior
```

 Example:

```
public record DataHolder(string Name, string Catalog);
```

 Explain:

 ### Source

 The programmer writes one declaration.

 ### Language semantics

 A positional record declares a record with two positional parameters/properties.

 ### Generated members

 The compiler supplies members such as:

 - constructor
- properties
- equality members
- `ToString`
- deconstruction
- copying support used by `with`

 ### Runtime consequence

 Two separately constructed records with equal member values can compare equal.

 Do not collapse these levels into:

 > “The compiler makes a bunch of stuff.”

---

 # 11\. APIs Must Also Be Explained When They Matter

 If code contains an API that is important to the lesson, explain it at the point of use.

 Example:

```
type.GetMethods(
    BindingFlags.Public |
    BindingFlags.Instance |
    BindingFlags.DeclaredOnly)
```

 Explain:

 ### `type`

 A `System.Type` describing `DataHolder`.

 ### `GetMethods(...)`

 Asks reflection for methods matching the supplied flags.

 ### `BindingFlags.Public`

 Include public methods.

 ### `BindingFlags.Instance`

 Include instance methods rather than static methods.

 ### `BindingFlags.DeclaredOnly`

 Exclude inherited methods.

 ### `|`

 Combines the flag values into one bitmask.

 ### Why this combination?

 Because the experiment is trying to answer:

 > “Which public instance methods does `DataHolder` itself declare?”

 This is the level of explanation expected for important API calls.

---

 # 12\. Execution Trace

 For non-trivial examples, show what happens in order.

 Example:

```
var one = new Holder { Name = "ABC" };
var two = one with { Manufacturer = "Haimer" };
```

 Explain:

```
1. Allocate/create Holder.
2. Apply object initializer.
3. Set Name during initialization.
4. `one` now refers to the constructed record.
5. `with` creates a copy of the record.
6. Copy starts with the values from `one`.
7. Manufacturer is replaced with "Haimer".
8. `two` refers to the new record.
9. `one` still refers to the original.
```

 Use execution traces whenever syntax hides multiple operations.

---

 # 13\. Static vs Runtime Behavior

 For important concepts, distinguish:

```
behavior:
  compile_time:
    - ""
  runtime:
    - ""
```

 This distinction is mandatory when the lesson involves:

 - compiler-generated code
- overload resolution
- generics
- type inference
- `init`
- attributes
- reflection
- nullable analysis
- implicit conversions
- pattern matching
- source generators
- async/await
- records

 Do not call everything “the compiler” when it actually happens at runtime.

---

 # 14\. Type and Equality Analysis

 For equality lessons, explicitly trace both operands.

 Example:

```
a == b
```

 The explanation must answer:

```
What is the compile-time type of a?
What is the compile-time type of b?
What does == mean for that type?
Is == overloaded?
What equality implementation is selected?
What values are compared?
```

 For a record containing members, continue recursively:

```
record equality
↓
property equality
↓
member's Equals
↓
that member's equality semantics
```

 This prevents the lesson from saying merely:

 > “Records compare by value.”

---

 # 15\. Object Construction Analysis

 Whenever the lesson contains `new`, explain what construction form is being used.

 Distinguish:

```
new Holder()
```

 from:

```
new Holder { Name = "ABC" }
```

 from:

```
new Holder("ABC")
```

 from:

```
new()
```

 Explain which of these are:

 - constructor arguments
- object initializers
- target-typed construction
- generated constructors
- property assignment during initialization

 Do not assume these forms are interchangeable.

---

 # 16\. Property Analysis

 Whenever a property appears, determine:

```
property:
  declaration: ""
  backing_storage: ""
  getter: ""
  setter_or_init: ""
  default_value: ""
  assignment_allowed_when: ""
  assignment_forbidden_when: ""
  nullability: ""
```

 Only include fields that are relevant.

 For:

```
public string Name { get; init; } = "";
```

 the lesson should establish:

```
Name
→ string
→ property
→ readable
→ assignable during initialization
→ not assignable afterward
→ defaults to ""
```

---

 # 17\. Experiments

 When behavior is surprising, use:

```
experiment:
  question: ""
  prediction: ""
  code: ""
  expected_output: ""
  actual_behavior: ""
  explanation: ""
  modification: ""
  new_prediction: ""
  new_result: ""
```

 The experiment should change as little as possible.

 Prefer:

```
-class
+record
```

 over introducing an entirely new example.

---

 # 18\. Exercises Must Test Code Understanding

 For each major concept, include at least one exercise from the following categories:

```
predict
modify
break
repair
trace
compare
rewrite
inspect
```

 Examples:

 ### Predict

 > What does `a == b` print?

 ### Modify

 > Change the type declaration so the comparison becomes true.

 ### Break

 > Change `init` to `set`. What new operation becomes legal?

 ### Trace

 > Explain what happens during `one with { Manufacturer = "Haimer" }`.

 ### Inspect

 > Use reflection to find which methods are declared directly on the record.

 Do not rely only on “run the supplied code.”

---

 # 19\. Adaptive Optional Sections

 The agent may include these only when justified:

```
optional_sections:
  under_the_hood: false
  python_comparison: false
  reflection: false
  historical_context: false
  advanced_edge_case: false
  design_tradeoff: false
```

 But:

 > **Optional does not mean unexplained.**

 If optional code is shown, it still receives code explanation.

---

 # 20\. Python / Other-Language Comparison

 Only include when the comparison teaches a meaningful difference.

 Use:

```
C# behavior
↓
why C# does it
↓
Python behavior
↓
why the difference matters
↓
return to C#
```

 Do not let comparison interrupt the primary code explanation.

---

 # 21\. Design Decisions

 When the project makes a choice, show the code first.

 Then:

```
design_decision:
  problem: ""
  available_choices: []
  selected_choice: ""
  reason: ""
  benefit: ""
  cost: ""
  future_revisit_condition: ""
```

 Do not call a design choice “correct” merely because it is the project's current choice.

---

 # 22\. Trap / Edge Case

 Only include a trap after teaching the normal rule.

 Structure:

```
normal rule
↓
apparently equivalent code
↓
surprising result
↓
exact reason
↓
project consequence
```

 For example:

```
record Sequence(List<string> Operations);
```

 must first establish record equality.

 Then demonstrate:

```
List #1 = ["OP1", "OP2"]
List #2 = ["OP1", "OP2"]

list contents equal
list references different
↓
List.Equals → false
↓
record equality → false
```

---

 # 23\. Source Fidelity

 When extracting from an existing codebase:

```
source_evidence:
  path: ""
  relevant_code: ""
  observed_behavior: ""
  inferred_behavior: ""
  design_interpretation: ""
```

 Distinguish:

```
OBSERVED
```

 from:

```
INFERRED
```

 from:

```
PROPOSED
```

 Never silently turn an observed implementation into a recommended design.

---

 # 24\. Removal Test

 For every paragraph ask:

```
Does this explain:
A. the primary concept?
B. code the learner must understand?
C. a required mechanism?
D. a real project decision?
E. a useful trap?
F. a necessary prerequisite?
```

 If none:

```
REMOVE IT.
```

 For every code block ask:

```
Why does the learner need to see this?
```

 If there is no good answer:

```
REMOVE IT.
```

---

 # 25\. Final Quality Gate

 Before returning the lesson, the agent must verify:

```
quality_gate:
  primary_concept_is_clear: true
  every_core_code_block_explained: true
  every_meaningful_construct_explained: true
  important_api_calls_explained: true
  compile_time_vs_runtime_distinguished: true
  generated_behavior_explained: true
  experiments_have_predictions: true
  learner_performs_modification: true
  project_connection_exists: true
  traps_are_contextual: true
  optional_material_is_separated: true
  no_redundant_sections: true
  no_high_level_summary_in_place_of_code_explanation: true
```

 If:

```
every_core_code_block_explained == false
```

 the lesson must not be considered complete.

---

 # 26\. Required Output Shape

 The generated lesson should normally look like:

```
# Lesson X — Title

## What you'll learn

[2-5 concrete outcomes]

## What you'll build

[actual project artifact]

## The question

[problem]

## 1. Predict

[question]

## 2. Try it

[small code block]

### What this code does

[mechanical explanation of meaningful constructs]

### What happens

[output]

## 3. Why?

[concept explanation]

### Code mechanics

[construct-by-construct explanation]

### Mental model

[compact diagram/rule]

## 4. Change one thing

[diff]

### What changed

[precise explanation]

### What did not change

[precise explanation]

## 5. Put it in the project

[real project code]

### Code walkthrough

[mandatory detailed explanation]

### Why this design?

[design decision if applicable]

## 6. Trap

[only if justified]

## 7. Under the hood

[only if justified]

## 8. Exercise

[learner modifies/traces/breaks/repairs code]

## What to remember

[maximum 3-5 rules]

## Next lesson

[concrete bridge]
```

---

 # 27\. Absolute Generation Rule

 Do not write:

 > “This code creates an immutable record with value-based equality.”

 and consider the code explained.

 That is a **summary**, not a code explanation.

 Instead:

```
public record Holder
{
    public string Name { get; init; } = "";
}
```

 must be unpacked sufficiently that the learner understands:

```
public
→ accessibility

record
→ record class declaration and generated semantics

Holder
→ type name

Name
→ property name

string
→ property's static type

get
→ readable property

init
→ assignable during initialization but not through ordinary
  assignment after construction

= ""
→ default value used when construction does not supply one
```

 Then connect the pieces:

```
new Holder { Name = "ABC" }
        ↓
construct Holder
        ↓
object initializer assigns Name
        ↓
initialization completes
        ↓
Name can be read
        ↓
ordinary later assignment is forbidden
```

 **The agent must teach the learner to read the code, not merely tell the learner what the code accomplishes.**

