# Project Studio lesson standard

## Learning outcome and audience

A self-taught scripter should learn to explain, test, debug, change and maintain a program. Typing a diff and getting green checks is only one part of that process. State one observable outcome per lesson: given a specific input or failure, what can the learner do without a supplied implementation?

Assume Python files, variables, functions, lists, dictionaries, loops and decisions for the scripter entry path. An advanced chapter must name the earlier lessons or skills it relies on. Define new terms and syntax at their first use, and introduce a concrete problem before its professional name. Give a small running example before broad architecture or several toolchain installations where the runtime permits it.

## Evidence within each lesson

- Teach one small idea with a worked example and explain why each change is necessary.
- Ask for a prediction before revealing the result; after execution ask the learner to explain the difference. Use a parsed predict fence when its hidden explanation helps.
- Include a diagnostic experiment: a small deliberate failure, the expected observation, how to locate its cause, and how to restore the working project.
- Include a transfer task with observable requirements and cases. The learner must make at least one decision without another complete implementation. A tiny new input rule or test can be enough; a second substantial project is unnecessary.
- Attach progressive hints to each independent task: a nudge, the relevant concept, then the shape of a solution. Keep answers optional. Do not make hints merely restate the requirements.
- State what the named checks establish and what they omit. Add a manual observation or learner-designed test for an omitted behavior. A file-existence check verifies a path, not a correct design.
- Identify optional extensions explicitly. Keep their files or branches separate when a broken attempt could affect the guided project. Navigation remains available; deferral does not supply evidence of independent mastery.

## Authored exercises and reference files

Project Studio Markdown is parsed by src/labs/project-studio/parseTrack.js. A step changes one target file. A full file target is visible unless frontmatter has reference: optional; that policy collapses the reference in the UI. Small teaching fragments may remain visible, but the full solution to an independent exercise must require an intentional reveal. Edit fragments in typed lessons remain visible and are for guided instruction.

Use the existing hints fence with nudge:, concept: and shape: in that order. A predict fence needs question: and explain:, plus choices and an answer when appropriate. Do not nest backtick fences inside these fences; use tilde fences for example code. See src/labs/project-studio/hints.js and predictions.js for the exact grammar.

Lesson and step ids store learner progress. Preserve published file paths and the number/order of level-two headings during repairs; adding a level-two heading shifts later step ids. Use smaller headings for additions within an existing step unless a tested progress migration is part of the change.

## Review and release

Run node scripts/audit-project-studio-lessons.mjs --write to regenerate the full review inventory. Run it with --check to detect stale reports. Structural errors fail the command; textual signals are a review queue, never a score or certification. The audit does not execute learner commands, judge vocabulary sequencing, or establish correctness of sample programs.

For a track, review its first lesson before its later lessons. Record actual prerequisites, first runnable win, first abstraction jump, and first independent design task. Follow the track in order to verify prerequisite recovery. Inspect the rendered lesson, including hidden references and progressive hints. Run its relevant runtime walkthrough and wrong-answer checks when available. A correct reference passing tests does not prove the starter, hints or explanation teach the intended idea.

For each transfer task retain three kinds of learner evidence: observed result, explanation of the cause, and independently designed change with a new test. A learner can read ahead while any of these remain deferred. Do not label a track ready until an editor has reviewed the lessons and their dependencies; the current catalog profiles deliberately retain review-required or in-development maturity.

## Recommended path

Recommend Forge for self-taught Python scripters: tools, the one-file game, testable functions, objects, packaging, then data and persistence. Its later engine chapters remain in development. Applied ML offers a Python-first alternative focused on data tools. Use the Dice entry chapter before accelerated C++ work. Java starts with a JDK-only experiment before the application toolchain.

Keep older and advanced tracks discoverable with prerequisite and maturity notes so existing links and learner projects survive. Availability does not imply beginner suitability. Later production ML, C++ memory/systems/graphics and the PySide engine require their foundations. Circuit Clash includes draft implementation lessons; its full learning and platform review is incomplete.
