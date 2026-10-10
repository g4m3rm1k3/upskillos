# Teaching pilot for the C# 3D studio

Status: prepared for human review, 2026-10-10. No introductory learner session has been observed yet. Author checks and native walkthroughs are recorded in [the verification record](3d-studio-opening-verification.md); they do not establish learning effectiveness.

## What we need to learn

Can an introductory programmer predict, explain, diagnose and independently change the project? Completing a guided transcription is a different result. The lessons now name an observable outcome and end each independent task with specific explain-and-transfer prompts.

Use short sessions across the prerequisite path. Do not drop a newcomer directly into Q-learning or interfaces and count unfamiliar syntax as evidence against those later lessons. The learner may read ahead; mark evidence as deferred rather than implying mastery.

## Entry and setup

Ask the learner to explain a variable, a condition, a loop and a function using a small program they understand in any language. If one is unfamiliar, help them recover it before assessing new C# ideas. Do not require Python knowledge. Record the actual OS, SDK/runtime and whether native graphics open.

Start in a disposable learner project folder. Keep practice changes separate from the guided project. Record setup failures separately from concept failures. A broken terminal is not evidence that the learner cannot understand coordinates.

## Observe, then help

1. Ask for a prediction before execution and record it verbatim.
2. Let the learner run the example and describe the actual result.
3. Ask what caused any difference. Give time to inspect the code and diagnostic rather than immediately supplying a fix.
4. Let them attempt the independent task with the reference closed initially. They may reopen it or reveal hints; record which help was used without treating help as failure.
5. Ask them to explain their changed code and test. After help, use a fresh small case to check whether the idea transferred.

Do not teach the solution while measuring an independent attempt. If they are stuck, give one hint at a time, then record the point where the explanation became necessary. Stop or split the session if fatigue is obscuring the result. No rigid time limit determines ability.

## Suggested observation points

| Point, after its prerequisites | Ask the learner to do | Evidence and likely revision signal |
| --- | --- | --- |
| First C# program | Choose new signed coordinate inputs, predict, run, then explain integer division versus a compiler error | Correct output plus causal explanation and a new case. If float assignment is blamed, revisit when expression evaluation happens. |
| Scene ownership | Predict what a read-only view sees after Add and what a stored record sees after TryMove | Draw or explain the list, wrapper and records. If readonly is treated as deep immutability, separate the three protections earlier. |
| Selection and history | Design a two-object reset case, then trace a history branch | Exact IDs/positions and stack states. If only counts are checked, add a contrasting wrong-object example. |
| Beacon world | Change the hazard in a practice copy and specify a safe route before training | Correct transitions and endings. If bot failures are attributed to learning before rule checks, strengthen the environment boundary explanation. |
| Q-learning | Calculate a new terminal and nonterminal update, then report the controlled exploration experiment | Arithmetic, every seed including failures, frozen evaluation and a limited conclusion. If training returns are called evaluation, revisit the two loops. |
| Storage interface | Substitute a throwing store and preserve selected scene/history; explain disposal | Contract and unchanged-state assertions. If ISceneStore is called a data copy, contrast a type contract with scene snapshots. |
| Save/open | Compare missing, malformed and valid empty documents | Distinguish failure from empty success and last-operation status from current saved state. |

For a later checkpoint, provide earlier prerequisites first; supplied guided code is acceptable for setup, but record it and do not count it as independently authored work.

## Keep a small evidence record

For each observed lesson record: task/input, prediction, actual result, learner's explanation, independently chosen change and its test/observation, help used, and the exact sentence or concept that caused confusion. Use an anonymous participant label; personal information is unnecessary. An optional learner notebook can be handwritten or a Markdown file in their practice folder.

Distinguish three outcomes: observed independently, observed after help with a fresh transfer case, or not yet observed. Do not invent a numerical mastery score or infer understanding from an automated pass. A correct explanation without executing the change is also incomplete evidence.

Revise the confusing explanation or task, preserve lesson/step progress keys, and repeat a fresh case. Record what changed and whether the observed confusion improved. Report the sample's limits: one learner can reveal a defect but cannot certify suitability for everyone. Human input, accessibility and platform findings need their own records.

## Current author review

The pass on 2026-10-10 adds observable outcomes and task-specific evidence prompts across Foundations without changing required code or existing step IDs. The exploration task now documents a fair comparison, distinguishes unavailable training statistics from evaluation outputs, includes losses, and avoids assuming exploration must always improve results. Native implementations are unchanged. Human pilot evidence remains pending.
