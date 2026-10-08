---
title: Evaluate a policy without fooling yourself
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

A learned policy is an experimental result. We will calculate paired comparisons, distinguish repeatability from generalization, and inspect objectives before deciding whether training improved the game.

## Compare paired differences rather than one favorite race

Suppose the scripted baseline takes 30, 35, and 32 seconds on three seeds, while the candidate takes 31, 34, and 36. Candidate-minus-baseline differences are +1, -1, +4 seconds. The mean difference is +4/3 seconds: on this tiny sample the candidate is slower overall, even though it won one timing comparison.

Pairing uses the same evaluation seed and starting conditions for each strategy. It reduces some irrelevant variation but does not force identical trajectories or random consumption after decisions diverge. Multiple seeds are necessary; repeating one seed many times only repeats the same controlled case.

The code computes differences first and divides by a double count. It does not truncate to an integer. The small assertion checks our statistics calculation, not whether a learned strategy must win. The real evaluation supplies measured data, which we should report even when it disappoints.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
double[] baseline = { 30, 35, 32 };
double[] candidate = { 31, 34, 36 };
double sum = 0;
for (int i = 0; i < baseline.Length; i++) sum += candidate[i] - baseline[i];
double meanDifference = sum / baseline.Length;
if (Math.Abs(meanDifference - 4d/3) > 0.000001)
    throw new Exception("Paired comparison arithmetic failed");
Console.WriteLine("PAIRED COMPARISON PASSED");
```

## Report variation, completion, and competing objectives

A mean hides the spread. Three differences of +1,+1,+1 and -10,+1,+12 have the same mean but very different reliability. Inspect per-seed rows and the range; with more independent samples, confidence intervals can quantify uncertainty. Do not claim a statistically established advantage from a small favorable sample or a range alone.

A time-limit result is not a normal finish at that time. Report completion rate separately before summarizing time, or define a penalty metric explicitly. Likewise, a better place achieved through many attacks may come with slower lap times. Time, position, hits, and suffered hits describe different product outcomes.

For fair experiments, keep the selected package and scripted rival behavior fixed, vary only the factor under study, and record the policy artifact and configuration. An ablation removes one part—such as the danger bit—to ask whether it contributes. If you change state encoding, reward weights, and steering together, a new outcome cannot isolate which change caused it.

## Separate implementation errors from a poor objective

An incorrect Bellman update is an implementation defect, caught by numerical tests. A policy exploiting reward by repeatedly seeking collisions can be a correctly implemented optimizer of a poor objective. More training may strengthen that unwanted behavior.

Watch trajectories and compare outcome metrics. Form a hypothesis such as “hit reward outweighs the time cost,” change one reward term on a branch, retrain with the same training protocol, and compare on validation seeds. After selecting a design, use a fresh final evaluation set. Keep the baseline; a learned system that adds complexity without useful behavior is not automatically an improvement.

Record what was tested and avoid saying the policy learns from the user's personal races: the deployed estimates remain frozen. The table adapts its selected action to current observations, which is different from updating those estimates during play.

## Challenge — revisit without blocking the course

This challenge is optional and can be deferred. All implementation needed later is in the guided path.

Design an experiment to test whether the danger observation improves shield use. Name the changed factor, controlled factors, training seeds, validation seeds, final evaluation seeds, and metrics before running it.

