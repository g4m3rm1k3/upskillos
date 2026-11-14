# Lesson Quality Standard

## Computer Science and Software Engineering Curriculum

**Status:** Proposed companion standard\
**Applies to:** Every lesson in the Computer Science and Software
Engineering for the Age of AI curriculum\
**Purpose:** Ensure that lessons produce demonstrable understanding and
usable skill—not merely readable explanations, completed code, or
exposure to terminology.

---

## 1. The governing principle

A lesson is successful only when the learner can do something they could
not reliably do before the lesson.

Reading a correct explanation is not proof of learning. Watching code
run is not proof of understanding. Copying a working implementation is
not proof of independent ability. Recognizing a term is not the same as
being able to reason with the concept.

Every lesson must therefore be designed around **observable learner
evidence**.

The author must be able to answer:

1.  What should the learner understand or be able to do by the end?
2.  What prior knowledge does that outcome genuinely require?
3.  What experience will make the idea understandable?
4.  What will the learner actively do while learning it?
5.  How will the lesson reveal misunderstandings?
6.  What evidence will demonstrate that the learner has learned it?
7.  Where will the learner use or encounter the idea again?

If those questions cannot be answered precisely, the lesson is not ready
to write.

### The difference between exposure and learning

| Exposure | Evidence of learning |
|---|---|
| The learner has read a definition. | The learner can explain the idea in their own words and distinguish it from a nearby idea. |
| The learner has seen an example. | The learner can predict what happens in a new example and explain why. |
| The learner has run code. | The learner can trace it, change it deliberately, and explain the consequences. |
| The learner has followed implementation steps. | The learner can make a similar implementation independently. |
| The learner has seen a bug explained. | The learner can detect, reproduce, diagnose, and prevent a related bug. |
| The learner has seen two designs compared. | The learner can select and defend a design under changed constraints. |

---

## 2. What a lesson is—and is not

A **module** is a body of related knowledge and skills. A **lesson** is
one coherent learning experience within that module. A lesson
contributes to a module; it does not silently claim to complete the
entire module.

A lesson must have one primary learning purpose. It may support several
secondary outcomes, but it must not become a miniature textbook that
attempts to teach every item in a module's Covers list.

### Lesson boundaries

Split a topic into separate lessons when:

- It introduces a genuinely new mental model.
- It depends on a concept the learner has not yet been taught.
- The learner needs a different kind of practice to demonstrate it.
- Combining it with another topic would overload the learner.
- It requires a different teaching mode (for example, a concept
  explanation versus a substantial project implementation).

Keep topics together when separating them would destroy the explanation
or the relationship is itself the point being taught.

Do not split a lesson merely to create more lesson entries. Do not
combine topics merely to reduce the lesson count.

### Lesson types

A lesson may use one or more of these modes, but it must identify its
primary mode:

1.  **Concept lesson** — develops a mental model, principle,
    mechanism, or theory.
2.  **Worked-example lesson** — demonstrates how to reason through a
    problem, trace, calculation, or design.
3.  **Practice lesson** — develops fluency through carefully sequenced
    learner attempts.
4.  **Project lesson** — applies already-introduced ideas to a
    meaningful project increment.
5.  **Investigation lesson** — asks the learner to explore behavior,
    compare cases, collect evidence, or discover a rule.
6.  **Deconstruction lesson** — takes an existing system or
    implementation apart to reveal its mechanisms.
7.  **Review and transfer lesson** — retrieves earlier knowledge and
    applies it in a new context.
8.  **Reference lesson** — provides a structured lookup resource. It
    must not be used as a substitute for teaching a concept.

A project lesson must not introduce a large collection of unexplained
concepts just because the project needs them. Teach the required concept
first, or create a clearly identified just-in-time lesson.

---

## 3. Required lesson specification

Every lesson must have the following metadata before prose is written.

### 3.1 Identity and placement

- **Lesson ID:** stable identifier.
- **Title:** specific and meaningful; avoid vague titles such as
  "Introduction" or "More about..."
- **Module:** the module it belongs to.
- **Position:** where it sits in the module's lesson sequence.
- **Lesson type:** from the types above.
- **Estimated effort:** realistic time for reading, thinking,
  activities, coding, and checks—not just reading time.
- **Project connection:** the exact project and increment, if any.
  State "none" when the lesson is conceptual only.

### 3.2 Learning outcomes

Write outcomes as observable actions, not vague intentions.

Weak:

- Understand binary.
- Learn about state.
- Know how testing works.

Strong:

- Convert a value between decimal, binary, and hexadecimal and explain the place value represented by each digit.
- Trace a sequence of assignments and identify which names refer to the same mutable object.
- Given a requirement and an implementation, identify an assertion that would detect a violation and explain what it does not prove.

Use a small number of primary outcomes. Each should be assessable in the
lesson.

For each outcome, specify:

- **Action:** what the learner will do.
- **Conditions:** what information, tools, or constraints they will be
  given.
- **Quality bar:** what makes the performance correct or sufficient.
- **Mastery tier:** U, R, A, or E, using the curriculum's definitions.

Do not label an outcome "Apply" if the learner only follows a recipe. Do
not label an outcome "Evaluate" if the learner only identifies a
memorized flaw.

### 3.3 Prior knowledge and dependencies

List only knowledge the learner is expected to have already acquired.

For each prerequisite, identify where it was taught. If the lesson uses
a term or mechanism that has not been taught, either:

- teach the minimum needed, explicitly, at the point of use;
- link to a prerequisite lesson and verify the learner has it; or
- remove the dependency.

Never hide a prerequisite inside a sentence such as "as you already
know" unless the curriculum actually taught it.

Include a short **recall bridge** to the most relevant prior idea. Do
not turn this into a long recap.

### 3.4 Misconceptions and likely failure points

Before writing, list the two to five most likely misunderstandings.

For each one, specify:

- What a learner might believe.
- Why that belief is plausible.
- What example, contrast, question, or experiment will expose it.
- What correction will help the learner rebuild the mental model.

A lesson that only explains the correct model but never anticipates the
wrong model is incomplete.

---

## 4. The teaching sequence

The exact order may vary when the subject demands it, but every lesson
must contain the relevant functions below. A lesson does not need a
heading for every function; the learning experience must nevertheless
provide them.

### 4.1 Establish a reason to care

Give the learner a concrete problem, puzzle, observation, failure, or
question that the concept helps explain.

The opening should create a reason to learn the idea. It should not rely
on hype, irrelevant anecdotes, or a contrived story that obscures the
subject.

Good openings include:

- A surprising result that needs explaining.
- A real limitation in a familiar approach.
- Two examples that look similar but behave differently.
- A small practical problem that cannot be solved cleanly with the
  learner's current model.
- A prediction question whose answer is not obvious.

Do not begin every lesson with a dictionary definition. Introduce
terminology when the learner has something meaningful to attach it to.

### 4.2 Build the mental model

Explain the idea in plain language before relying on specialist
terminology.

A good explanation:

- Starts from something the learner can already reason about.
- Introduces one new idea at a time.
- Makes the relationships between parts explicit.
- Explains why the mechanism exists, not only what it is called.
- Distinguishes the concept from similar or easily confused concepts.
- Uses a concrete example before generalizing, where appropriate.
- States the limits of the analogy. Analogies are aids, not proofs.

Do not use a simplified analogy and then quietly treat it as literally
true.

### 4.3 Make the concept observable

Give the learner a way to see, trace, manipulate, calculate, or
otherwise inspect the idea.

Choose the most appropriate representation:

- A worked trace or state table.
- A small runnable program.
- A hand-worked example.
- A diagram or visualization.
- A truth table, memory layout, timeline, graph, or data table.
- A physical or everyday example.
- A deliberately failing case.
- A comparison of two implementations.

Visuals must explain something. Decorative diagrams do not count as
teaching.

When code is used, explain the code at the level required by the lesson.
Every new name, operation, syntax feature, library call, and dependency
must be explained or explicitly identified as previously taught. Do not
use unexplained helper functions to conceal the very mechanism being
taught.

### 4.4 Use worked examples

Show at least one complete example for a new or difficult procedure.

A worked example should make the reasoning visible, not merely show the
final answer.

For code, this may include:

- What each important line does.
- What values exist before and after an operation.
- Which function calls which other function.
- How control moves through branches and loops.
- What state changes and what stays unchanged.
- What the output means.
- Why the chosen approach is appropriate.

For mathematics or algorithms, show intermediate steps and explain why
each step is valid.

Do not jump from a problem statement to a finished implementation.

### 4.5 Make the learner think before revealing the answer

Include prediction and decision points.

Examples:

- Predict the output before running the program.
- Predict which state changes after an operation.
- Choose which data structure fits a stated workload.
- Decide which test should fail before seeing the result.
- Identify what information is missing from a specification.
- Predict how a design behaves when one constraint changes.

Allow the learner to commit to an answer before revealing the
explanation. A question immediately followed by its answer, with no
pause or meaningful learner action, is not an effective prediction
activity.

### 4.6 Move from supported practice to independent practice

Use a deliberate progression:

1.  **Worked example:** the lesson demonstrates the reasoning.
2.  **Guided attempt:** the learner completes a partially worked
    example.
3.  **Independent attempt:** the learner solves a new but closely
    related problem.
4.  **Transfer attempt:** the learner applies the idea in a changed
    context or with a changed constraint.

Not every lesson needs four large exercises, but new and important
concepts need more than passive reading.

Remove scaffolding gradually. Do not keep giving the learner the exact
steps after the lesson claims they can work independently.

### 4.7 Examine variation, boundaries, and failure

Teach the edges of the concept, not only its happy path.

Use purposeful contrasts:

- Typical case versus boundary case.
- Valid input versus invalid input.
- Small input versus large input.
- Mutable versus immutable.
- Sequential versus concurrent.
- Correct implementation versus plausible wrong implementation.
- Simple design versus over-engineered design.
- Expected environment versus a changed environment.

Explain why the behavior changes. Do not merely list edge cases.

### 4.8 Connect and generalize

Make the connection to earlier learning explicit:

- What familiar concept does this extend?
- What is the same?
- What is different?
- What new capability does it provide?
- Where else will this pattern appear?
- What would break if the learner applied the old model here?

Use connections to deepen understanding, not to introduce several new
topics prematurely.

### 4.9 Close with retrieval and a useful summary

End with:

- A concise statement of the mental model.
- The important distinctions or rules.
- A small retrieval check that does not simply repeat the wording of
  the explanation.
- A pointer to where the concept will be used again.

The summary must reinforce the reasoning, not become a second glossary.

---

## 5. Code and project teaching requirements

These rules apply whenever a lesson teaches programming, code reading,
debugging, testing, or project work.

### 5.1 Code must be taught, not merely supplied

- Explain every new language feature before or at the point of use.
- Expand dense expressions when they hide the logic.
- Use meaningful names.
- Explain unfamiliar syntax separately from the underlying
  computer-science concept.
- Identify which parts are standard-library features, third-party
  dependencies, project code, or language syntax.
- State relevant versions and setup assumptions.
- Avoid unexplained magic values and unexplained abstractions.
- Show the smallest useful implementation before adding layers.
- Explain what the runtime does when that matters to the concept.

A lesson must never depend on the learner guessing what a line of code
means.

### 5.2 The learner must actively work with the code

Do not make the learner a passive spectator or a transcription machine.

Use a suitable combination of:

- Predicting output or state.
- Tracing code by hand.
- Completing a partially written implementation.
- Writing a function or meaningful section themselves.
- Modifying an example to meet a new condition.
- Running a test and interpreting the result.
- Debugging a deliberately broken version.
- Comparing their implementation with a reference solution.

If the learner is asked to type code, explain what they are about to
type and why. Typing is useful when it reinforces construction and
attention; it is not itself evidence of understanding.

### 5.3 Runnable increments

For project lessons:

- Each increment must have a clear purpose.
- The project must remain in a runnable or verifiable state at the end
  of each meaningful step.
- State what should happen before asking the learner to run it.
- Give expected observations and explain what they mean.
- If a step intentionally leaves the project broken, label that state
  and explain how it will be resolved.
- Avoid introducing infrastructure that the current concept does not
  justify.
- Keep project changes aligned with the curriculum's **Builds** line.

Do not give the learner a large block of code and call it a lesson
because it runs.

### 5.4 Explain tests as teaching material

When tests are supplied:

- Explain what the test is checking.
- Explain the relevant inputs, setup, and expected result.
- Show how to run it.
- Explain what a pass establishes and what it does not establish.
- Include at least one example of a defect the test should catch.
- Avoid tests that merely repeat the implementation's own assumptions.

When the curriculum reaches test-writing, progressively transfer
responsibility to the learner.

### 5.5 Show the mechanism beneath abstractions

When relevant to the lesson, explain:

- What the abstraction represents.
- What it hides.
- What the runtime or machine actually does.
- What resources it consumes.
- What guarantees it provides.
- What it does not guarantee.
- What alternatives exist and why they may or may not be suitable.

Do not force low-level detail into every lesson. Teach the layer
underneath at the point where it explains behavior, cost, or a design
decision.

---

## 6. Practice, challenges, and assessment

Every lesson must include an assessment plan that matches its outcomes
and mastery tier.

### 6.1 Practice should be purposeful

Exercises should not be filler or repetitive variations with no learning
purpose.

Use a progression such as:

- **Recall:** retrieve a fact, term, or distinction.
- **Explain:** explain a mechanism or why a result occurs.
- **Predict:** reason about an unseen input or change.
- **Trace:** follow execution, data, state, or a calculation.
- **Construct:** create a solution.
- **Debug:** reproduce and diagnose a failure.
- **Deconstruct:** explain an unfamiliar implementation.
- **Evaluate:** compare alternatives and defend a choice.
- **Transfer:** apply the concept in a new context.

Choose only the exercise types that serve the lesson's outcomes.

### 6.2 Challenges must not block learning progress

A challenge should extend learning, not hold the core lesson hostage.

- Clearly distinguish required practice from optional extension.
- Provide a hint ladder rather than immediately revealing the
  solution.
- Let learners continue after a reasonable attempt or use of help.
- Explain the solution after the learner has had a genuine
  opportunity.
- Do not make an unusually difficult puzzle the only evidence that a
  learner understood the core concept.

### 6.3 Feedback must teach

Feedback must do more than say "correct" or "incorrect."

For an incorrect response, where possible:

1.  Identify the specific issue.
2.  Explain why the answer or approach fails.
3.  Point to the relevant part of the mental model.
4.  Offer a useful next hint or smaller step.
5.  Allow another attempt.

For a correct response, explain why it is correct when that reasoning
matters. Accept equivalent valid reasoning; do not require identical
wording unless terminology itself is being assessed.

### 6.4 Assess the stated mastery tier

Use the curriculum's tiers consistently:

| Tier | Evidence required |
|---|---|
| **U, Understand** | Explain the concept accurately, identify its important parts, and distinguish it from nearby concepts. |
| **R, Reason** | Predict behavior, trace examples, explain causes, and reason about changed conditions. |
| **A, Apply** | Use the concept independently in a new but appropriate situation. |
| **E, Evaluate** | Compare alternatives, identify limitations and failure modes, reason about trade-offs, and defend a decision against constraints. |

A lesson may prepare the learner for a module's target without
independently certifying the whole module. Module mastery requires
evidence across the relevant lessons and outcomes.

### 6.5 Use more than one kind of evidence

For important outcomes, use at least two complementary forms of evidence
where practical. For example:

- Explain a concept, then predict an unseen case.
- Trace an implementation, then modify it.
- Write a test, then identify a case the test misses.
- Compare two designs, then defend one under a changed requirement.

Do not use multiple-choice recognition as the only assessment of a skill
that requires construction, reasoning, or judgment.

### 6.6 Solutions and answer keys

Provide explanations, not just answer strings.

Where useful, include:

- A correct solution.
- One plausible incorrect approach.
- Why the incorrect approach is tempting.
- Why it fails.
- Another valid solution, if meaningful.
- What makes one solution preferable under the stated constraints.

Do not imply that one implementation is the only correct answer when
several are valid.

---

## 7. Retention and transfer across the curriculum

Learning must persist beyond the page on which it was introduced.

### 7.1 Planned retrieval

Important ideas should return after a delay, not only in the next
paragraph.

Use a light retrieval schedule appropriate to the course structure:

- Revisit a concept later in the same module.
- Retrieve it in a later module after intervening material.
- Use it in a project increment.
- Revisit it in a different language or representation when that
  clarifies the underlying idea.
- Revisit it during review or a cumulative challenge.

The exact schedule can be managed by the course platform. Lesson authors
must identify worthwhile future retrieval opportunities.

### 7.2 Reuse without needless repetition

When a concept returns:

- Briefly prompt the learner to retrieve it before explaining again.
- Add a new layer, context, constraint, or level of independence.
- Make the connection explicit.
- Do not repeat the entire original lesson.
- Do not assume that a previous exposure means mastery.

### 7.3 Transfer is a design requirement

At least one important outcome in a module should eventually be
demonstrated outside the exact example used to teach it.

A learner who can only solve the tutorial's example has learned the
example, not necessarily the concept.

---

## 8. Explanations, language, mathematics, and terminology

### 8.1 Plain language and precision

- Start with ordinary language.
- Introduce the precise term when it becomes useful.
- Define it accurately.
- Use it consistently thereafter.
- Explain distinctions that matter.
- Avoid jargon chains in which one unexplained term is defined using
  three others.

Plain language must not become inaccurate language. Precision and
accessibility are compatible.

### 8.2 Mathematics

When mathematics is required:

- Explain what the quantities represent.
- Explain why the operation or formula is appropriate.
- Show intermediate steps.
- State assumptions and units.
- Interpret the result in the original problem.
- Explain relevant limitations or numerical issues.

Do not introduce a formula as something to memorize without explaining
what it says and why it works at the required level.

### 8.3 Vocabulary

The curriculum requires 10–20 precise terms per module. These terms
should be distributed across lessons where they are actually taught.

For each important term:

- Give a concise definition.
- Use it in context.
- Distinguish it from commonly confused terms.
- Include it in retrieval practice when appropriate.

Do not append 20 unfamiliar terms to a single lesson merely to satisfy a
module-level count. Do not count a term as taught because it appeared in
a sentence.

---

## 9. Visuals, interaction, and accessibility

Use a visual, interactive, or textual representation according to what
best explains the concept.

### Visual quality

Every visual must have a teaching purpose:

- Show relationships that are difficult to hold in working memory.
- Reveal change over time.
- Compare cases.
- Expose structure or scale.
- Let the learner manipulate a meaningful variable.
- Make an invisible mechanism observable.

For interactive demonstrations:

- State what the learner should investigate.
- Make controls and variables understandable.
- Keep cause and effect visible.
- Avoid controls that change several things at once unless that
  interaction is the point.
- Include a useful static explanation when interaction is unavailable.
- Never make an animation a substitute for explaining the mechanism.

### Accessibility and cognitive load

- Use clear headings and short, purposeful sections.
- Explain abbreviations and technical terms.
- Do not rely on color alone to convey meaning.
- Provide text equivalents for important diagrams and visual results.
- Ensure keyboard access for interactive activities.
- Avoid unnecessary motion and distracting decoration.
- Keep instructions close to the action they describe.
- Separate essential content from optional deep dives.
- Do not overload a lesson with too many new terms, representations,
  or simultaneous tasks.

---

## 10. Accuracy, sourcing, and technical integrity

A lesson must be technically trustworthy.

Authors must:

- Verify claims against authoritative sources when appropriate.
- Use documentation that matches the stated language, library, and
  tool versions.
- Distinguish established facts from simplifications, assumptions, and
  opinions.
- Cite external material and respect licensing.
- Run code and tests when the lesson claims they were run.
- Measure timings, sizes, outputs, and performance claims rather than
  inventing them.
- Check all code examples for consistency with the lesson's stated
  environment.
- Check that examples do not rely on undeclared files, packages,
  services, or configuration.
- Explain when behavior is implementation-specific or
  version-dependent.

Never fabricate test results, benchmark numbers, API behavior,
citations, or screenshots.

If a lesson cannot be executed in the target environment, state that
limitation and provide an appropriate alternative form of verification.

---

## 11. Lesson completion criteria

A lesson is not complete merely because its prose is finished.

### Required authoring checklist

- [ ] The lesson has one clear primary purpose.
- [ ] It belongs to a specific module and contributes to that module's
      Covers scope.
- [ ] Its learning outcomes are observable and assessable.
- [ ] Its mastery tier is accurate.
- [ ] Prerequisites are real, taught, and identified.
- [ ] Likely misconceptions have been anticipated.
- [ ] The opening gives a meaningful reason to learn the concept.
- [ ] The explanation builds a mental model, not just a definition.
- [ ] The learner can observe or investigate the concept.
- [ ] A worked example makes the reasoning visible where needed.
- [ ] The learner has to think, predict, explain, or decide.
- [ ] Practice progresses from support toward independence.
- [ ] Important boundaries, failure modes, and alternatives are
      addressed.
- [ ] The lesson connects to prior or future learning where useful.
- [ ] Assessment actually tests the stated outcomes.
- [ ] Feedback explains errors and supports another attempt.
- [ ] Code, math, diagrams, and claims are accurate.
- [ ] Project work is a justified, runnable/verifiable increment.
- [ ] The learner is not asked to use unexplained syntax, tools, or
      dependencies.
- [ ] Accessibility and cognitive load have been considered.
- [ ] Future retrieval or transfer opportunities are identified.

### Release gate

A lesson must not be published if any of these critical failures remain:

1.  The learner outcomes are vague or cannot be assessed.
2.  A required prerequisite is missing or silently assumed.
3.  A central explanation is inaccurate or materially misleading.
4.  Code or instructions do not work in the stated environment.
5.  The lesson's assessment does not test what the lesson claims to
    teach.
6.  The learner can complete the lesson by copying or guessing without
    engaging with the target concept.
7.  A project step leaves the learner with an unexplained or
    unverifiable result.
8.  A key misconception is likely to cause systematic misunderstanding
    and is not addressed.

A lesson can be concise and still be excellent. It cannot be shallow and
still pass this standard.

---

## 12. Review rubric

Reviewers score each dimension from 0 to 3.

| Score | Meaning |
|---|---|
| **0, Missing** | The requirement is absent or fundamentally broken. |
| **1, Weak** | Present in name, but unlikely to support learning reliably. |
| **2, Good** | Clear, accurate, and useful; minor improvements remain. |
| **3, Excellent** | Deliberate, effective, and supported by strong learner evidence. |

| Dimension | Review question |
|---|---|
| Purpose and focus | Is there one coherent learning purpose? |
| Outcomes | Can the outcomes be demonstrated and assessed? |
| Prerequisites | Does the lesson teach rather than assume what it needs? |
| Mental model | Will the learner understand why the concept works? |
| Explanation | Is the reasoning clear, accurate, and well sequenced? |
| Examples | Do examples expose the mechanism rather than hide it? |
| Learner activity | Does the learner actively think and do meaningful work? |
| Practice progression | Does support fade toward independent performance? |
| Misconceptions | Does the lesson expose and correct likely wrong models? |
| Failure and boundaries | Does the learner see where and why the idea fails? |
| Assessment | Does the evidence match the outcomes and mastery tier? |
| Feedback | Does feedback help the learner understand and improve? |
| Transfer and retention | Does the lesson prepare the learner to reuse the idea? |
| Technical accuracy | Are code, math, sources, and claims verified? |
| Presentation and accessibility | Is the lesson usable without avoidable cognitive or access barriers? |

**Suggested quality thresholds:**

- Any score of 0 in a critical dimension is a rejection.
- A score of 1 in outcomes, mental model, explanation, learner
  activity, assessment, or technical accuracy requires revision.
- A lesson should average at least 2 across dimensions before release.
- A high average does not override a critical failure.
- Reviewers should provide evidence from the lesson, not just scores.

---

## 13. Review process

Use three distinct reviews. One person may perform more than one, but
the questions must remain distinct.

### A. Subject-matter review

Checks:

- Is the concept correct?
- Are the examples valid?
- Are the prerequisites and dependencies accurate?
- Are simplifications clearly bounded?
- Are the code, mathematics, and technical claims correct?

### B. Teaching review

Checks:

- Can a learner build the intended mental model?
- Is the explanation sequenced well?
- Are misconceptions addressed?
- Does the learner actively reason and practice?
- Does the assessment demonstrate learning?
- Is the cognitive load appropriate?

### C. Learner walkthrough

A reviewer who has not authored the lesson attempts it as a learner.

They record:

- Where they became confused.
- Which instructions were ambiguous.
- What they could answer without understanding.
- What they could not do despite understanding the explanation.
- Whether the expected code or result appeared.
- Whether feedback helped them recover from a mistake.
- Whether they could complete the final independent task.

The learner walkthrough is not optional for the first lesson of a new
lesson pattern, and should be repeated when the format or teaching
method changes substantially.

---

## 14. Required lesson document template

Use this as the authoring skeleton. Remove headings that genuinely do
not apply, but do not omit an essential learning function.

```markdown
# [Lesson ID] — [Lesson title]

**Module:** [ID and title]
**Lesson type:** [Concept / Worked example / Practice / Project / Investigation / Deconstruction / Review]
**Mastery tier:** [U / R / A / E]
**Estimated effort:** [Realistic time]
**Project increment:** [Project and exact change, or None]

## Purpose

[What this lesson teaches and why it matters.]

## Learning outcomes

By the end, the learner can:

- [Observable outcome]
- [Observable outcome]

## Prerequisites

- [Previously taught concept and lesson ID]

## Likely misconceptions

| Misconception | Why it is plausible | How this lesson exposes and corrects it |
| ------------- | ------------------- | --------------------------------------- |

## 1. The problem or question

[Concrete motivation, puzzle, failure, or observation.]

## 2. Build the mental model

[Plain-language explanation, carefully sequenced.]

## 3. Observe the concept

[Trace, experiment, visualization, calculation, or runnable example.]

## 4. Work through an example

[Complete reasoning, not just the answer.]

## 5. Your turn

[Prediction or decision before revealing the result.]

## 6. Guided practice

[Partially supported learner attempt.]

## 7. Independent practice

[New example with less scaffolding.]

## 8. Boundaries and failure

[Edge cases, limitations, alternatives, and failure modes.]

## 9. Connection

[What earlier idea this extends and where it appears again.]

## 10. Check your understanding

[Assessment tied directly to the outcomes and mastery tier.]

## Summary

[Concise mental model and important distinctions.]

## Vocabulary

[Terms taught in this lesson, not merely mentioned.]

## Further practice

[Optional challenge, hint ladder, and explained solution.]

## Sources and technical verification

[Sources, versions, execution environment, and verification evidence.]
```

---

## 15. How this standard governs the curriculum

This standard complements the curriculum; it does not replace the module
map, project specifications, language idioms list, or existing app-level
lesson standards.

Apply it in this order:

1.  **Map modules to lessons.** Every item in each module's Covers line
    must be assigned to one or more lessons. Do not add topics or
    silently omit topics.
2.  **Specify each lesson.** Write outcomes, prerequisites,
    misconceptions, lesson type, and assessment before drafting the
    explanation.
3.  **Teach the concept.** Build the mental model and observable
    examples before asking the learner to apply it in a project.
4.  **Design practice.** Make the learner retrieve, predict, trace,
    construct, debug, deconstruct, or evaluate—not just read.
5.  **Connect project increments.** Add only the project change
    justified by the concepts taught and keep it runnable or verifiable.
6.  **Review for learning.** Run the subject-matter, teaching, and
    learner-walkthrough checks.
7.  **Track evidence.** Record which outcomes and mastery tiers have
    actually been demonstrated.

### Relationship to the curriculum's existing teaching method

The curriculum's concept stages remain useful, with one change from
this standard: a lesson starts from a problem, not from the idea in
isolation (section 4.1). The order is:

- Problem (the reason to care)
- Expose (isolate the mechanism)
- Make observable
- Vary
- Connect
- Deconstruct
- Recognize

This standard makes those stages operational. It adds the missing
requirements for outcomes, prerequisites, misconceptions, worked
examples, active learner practice, feedback, assessment, retention,
accessibility, and release review.

The curriculum's three assessment modes also remain:

- Construct
- Deconstruct
- Evaluate

They should be used as evidence across lessons and modules, not treated
as a checkbox that one tiny activity can satisfy.

---

## 16. Platform: Project Studio and the other app standards

This course is delivered in Project Studio. Two existing app standards
apply alongside this one.

### Relationship to the existing standards

- **`docs/project-studio-lesson-standard.md` governs the platform and
  takes precedence on mechanics.** It defines the authoring format
  (`src/labs/project-studio/parseTrack.js`), the hints fence
  (`nudge:`, `concept:`, `shape:`), the predict fence (`question:`,
  `explain:`), optional challenges (a bold **Optional** marker), and
  the rule that lesson and step ids are progress keys. This standard
  adds the teaching requirements that standard does not cover.
- **`docs/lesson-writing-standard.md` governs the mathematics courses'
  JSON lesson schema** and does not apply to this course's format. Its
  mastery scale (Compute, Explain, Detect, Transfer) is not this
  course's scale; this course uses U, R, A, E. Two of its rules are
  adopted here because they make this standard's requirements
  concrete:
  - **Concrete before abstract:** a specific example with real values
    comes before the general rule or formula.
  - **Cognitive-load limits:** at most one new concept per sentence,
    and each worked example adds at most one new layer beyond the
    previous one.

### The template meets Project Studio's headings

In Project Studio, every level-two heading is a step, numbered by
position. The section 14 template is a list of teaching functions, not
a required heading list. Map functions onto steps so that each step is
one coherent learner action. Several functions may share a step, and a
step inserted after publication needs its own key (`## Title {#key}`)
so later step ids do not shift.

### Making the release gate executable

The curriculum's own thesis is that documents are advice and checks are
enforcement. Wherever a release-gate item can be checked by a machine,
it must be:

| Release-gate item | Executable check |
|---|---|
| Code or instructions do not work (4) | A native walkthrough test drives every step of the track against a real folder (`*.desktop.test.js`) |
| The learner can pass by copying or guessing (6) | Wrong-answer checks: the starter and plausible wrong versions fail the step's checks; the reference passes them (the Dynamic Programming course's method) |
| A project step leaves an unverifiable result (7) | Every step has at least one check that actually runs (`checkEvidence.js`) |
| Structure, ids, hints and prediction formats | `node scripts/audit-project-studio-lessons.mjs --check` |

The remaining items (vague outcomes, missing prerequisites, inaccurate
explanations, unaddressed misconceptions) need the human reviews in
section 13. A walkthrough recorded by a learner who has not seen the
lesson is the strongest evidence for those.

**Final rule:** optimize every lesson for what the learner will be able
to explain, predict, do, diagnose, and judge afterward. Do not optimize
it for how much information the author managed to fit onto the page.
