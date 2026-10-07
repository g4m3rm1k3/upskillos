# Build the learning before the lesson

This workflow applies to every new section in the [C++ games path](../../cpp-games-learning-path.md), including SDL3, SDL GPU and Vulkan. It is designed to prevent known problems before publication, not to promise that learner feedback will never reveal an improvement.

## Before writing a target file

Write the outcome and independent transfer task first. State the admitted inputs, expected behavior, rejection behavior and what must remain unchanged. Pick a plausible misconception and a case that distinguishes it from the correct behavior. Write an author-side solution and wrong-answer variants, then derive the smallest explanations needed to solve the task.

List prerequisites by stable lesson id and mark new terminology. A prerequisite must already have an explanation, runnable observation and practice opportunity. A graphics API's syntax is not exempt. If one task requires several unrelated new mechanisms, split the lesson; do not merely split a long source dump into several arbitrary fragments.

The [learning contracts](../../../scripts/dice-learning-contracts.mjs) record outcomes, prerequisite recall and transfer for published lessons. The authoring helpers reject a new lesson without a contract; tests check prerequisite order. The three-primary-goal ceiling is a review prompt, not proof of a low cognitive load. Broad labels must not hide a dozen unexplained operations.

## While writing

Start with the behavior the learner wants. Introduce one mechanism, ask for a prediction, make a small edit in a named file, run it, trace the result and change one thing. Explain each new token where it appears. Normally add three to twelve meaningful lines; eighteen is a ceiling, not an achievement.

Keep guided code in normal live comparisons. Independent practice shows requirements, examples, meaningful failure cases and a hint ladder; it does not reveal the implementation. Distinguish source-shape assistance from behavior tests and from the learner's explanation. In particular:

- A console transcript is not proof of a class interface. Require an API use or an explicit design review.
- A save test must start a separate load process; echoing the input is insufficient.
- A lifetime claim needs a changed scope or return path, not just a fixed printed string.
- A test-writing task must be tried against an intentionally broken operation.
- A graphics smoke test must record actual observed output and active validation, not merely successful startup.

Finish with a transfer task, a concrete explanation prompt and a recovery route. Ask the learner to close the example and reproduce the behavior with different data. Later sections should revisit the idea in the real game; one successful exercise is not a durable-mastery claim.

## Before calling the section complete

Run every guided command and independent reference answer in a fresh learner folder, or explicitly reconstruct previously taught prerequisites. Run the wrong answers and confirm the intended checks fail. Inspect diffs for both size and conceptual load. Open the actual lessons and inspect the comparison, independent task, hint ladder and navigation. Record skipped checks and hardware limits separately from successes.

Preserve lesson identities. When splitting an existing lesson, retain its entry id, do not reuse removed step ids for new material, and give the new focused lessons their own ids. Existing A14 remains the lifetime entry; A14b–A14d add new progress rather than silently crediting the old broad lesson as mastery of everything.

Passing automated checks is technical evidence. A learner walkthrough remains necessary to establish pacing, comprehension and whether hint levels are well calibrated.

## Vulkan: readiness before publication

Use [Khronos's development-environment guidance](https://docs.vulkan.org/tutorial/latest/02_Development_environment.html) to distinguish driver, loader, headers, shader compiler and validation layers. Run `node scripts/vulkan-course-readiness.mjs` before authoring an executable setup milestone. Its zero exit means ready to attempt setup, not a verified renderer. Exit two identifies missing preflight evidence; it installs nothing and changes no system settings.

On the current author machine, the runtime report found a Vulkan 1.4 loader and a 1.4-capable device. This alone does not establish headers, a shader compiler, validation, enabled features, a suitable surface or correct presentation retirement. Record the probe output with the section audit and resolve each missing requirement before claiming a native milestone.

For each Vulkan teaching slice, write a resource record **before code**:

| Question | Required answer |
|---|---|
| Why does the game need this? | Observable behavior or diagnostic added by the slice |
| What is newly taught? | Plain-language mechanism, required C++ syntax, and already-completed prerequisites |
| Who owns it? | Creating operation, owner, borrowers, parent dependencies and release operation |
| When is reuse safe? | Exact completion evidence; distinguish CPU scope, submitted GPU work and presentation |
| How can it fail? | Checked result, partial-construction path and unchanged state on rejection |
| What will the learner implement alone? | A different case with an observable result and a misconception test |
| What proves the slice works? | CPU checks, actual driver/validation run and visual observation, separately labelled |

In particular, do not compress the three completion domains into one new lesson. Split command-buffer state, GPU submission completion, and presentation retirement into focused traces and exercises before integrating them. [Khronos's semaphore-reuse guidance](https://docs.vulkan.org/guide/latest/swapchain_semaphore_reuse.html) explains why a submission fence does not also prove presentation has completed. Select and verify the extension/features used for presentation retirement before teaching their code.

The Vulkan opener still requires the actual verified game demonstration. A CPU simulation, tool report or conceptual timeline must be labelled as such and cannot substitute for a rendered game. The Vulkan draft remains unpublished until its prerequisites, demonstration and native verification exist.
