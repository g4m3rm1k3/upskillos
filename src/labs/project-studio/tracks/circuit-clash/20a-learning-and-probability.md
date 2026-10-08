---
title: Learning problems, probability, and delayed reward
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

The next lesson's Q equation should not arrive as a magic formula. First distinguish what the learner observes, what it chooses, what feedback means, and how uncertain outcomes are measured.

## Name the learning problem before choosing an algorithm

In supervised learning, examples pair inputs with desired outputs, such as an image with a label. In unsupervised learning, a system finds structure without those target labels. Reinforcement learning instead chooses actions, observes consequences, and receives rewards over time. These categories describe feedback, not how intelligent a result must be.

For Circuit Clash, the environment is the simulated race. The observation is a coarse description of nearby rivals, hazards, equipment, and upgrade. The action is one legal equipment tactic. Reward is the designer's numeric feedback for progress, hits, defense, time, and finishing. The policy is the rule used to select actions from observations. An episode is one simulated race until its terminal or time-limit boundary.

Steering remains a programmed controller. The Q-table is learned from experience, not hand-filled with commands for every situation. It is also not a language model, neural network, or agent that edits source code. Knowing which part learns prevents attributing improvements to the wrong mechanism.

A Markov state contains enough information that future dynamics depend on the current state and action rather than additional hidden history. Our coarse observation omits details, so different physical situations can share a key. This partial information limits what the table can distinguish. It is an approximation to evaluate, not a guarantee of optimal control.

## Measure a probability as an observed share

A probability .25 assigns one quarter of the total probability to an event. A uniform random draw in [0,1) falls below .25 with that probability. Repeating it does not guarantee exactly one success in every group of four; short sequences vary.

Random(seed) produces a reproducible pseudorandom sequence within this toolchain. NextDouble returns a value at least zero and less than one. Count successes, then divide by the number of trials as double; integer division would truncate a share below one to zero. The `d` suffix or cast selects double arithmetic.

The deterministic boundary assertions check the rule itself. The printed empirical share is an observation, not a flaky assertion that it must equal .25 exactly. The same seed controls repeatability, while testing several seeds later helps detect dependence on one favorable sequence.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
Random random = new(7);
int successes = 0;
for (int trial = 0; trial < 10000; trial++)
{
    if (random.NextDouble() < 0.25) successes++;
}
bool Chance(double draw, double probability) => draw < probability;
if (!Chance(0.249,0.25) || Chance(0.25,0.25))
    throw new Exception("Probability boundary failed");
double share = successes / 10000d;
Console.WriteLine($"observed share: {share:F3}");
Console.WriteLine("PROBABILITY BOUNDARY PASSED");
```

## Compute an expected reward without predicting every outcome

Suppose a risky action earns ten with probability .25 and loses two with probability .75. Its expected immediate reward is .25×10 + .75×(-2) = 1. A safe action always earning .8 has lower expectation but less variability. Expected value is a probability-weighted average across possible outcomes, not a promise for the next race.

A policy can prefer different tradeoffs if the objective penalizes risk, cares about worst outcomes, or values future opportunities. A weapon that is immediately useful may consume energy needed to survive later. That is why reinforcement learning estimates future return rather than merely choosing the largest immediate reward.

For rewards -1 now and 10 next, with discount .9, return is -1 + .9×10 = 8. With three steps, the third reward is multiplied by .9². Discount determines how strongly distant outcomes count. The next lesson updates an estimate toward observed reward plus discounted estimated future value, connecting this calculation to Q-learning.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
double risky = 0.25 * 10 + 0.75 * -2;
double safe = 0.8;
float discounted = -1f + 0.9f * 10f;
if (Math.Abs(risky - 1) > 0.000001 || risky <= safe)
    throw new Exception("Expected reward calculation failed");
if (MathF.Abs(discounted - 8f) > 0.0001f)
    throw new Exception("Delayed reward calculation failed");
Console.WriteLine("RETURN CALCULATIONS PASSED");
```

## Explore to collect evidence and evaluate without updating

If an untried action initially has a low estimate, always choosing the current maximum can prevent discovering that it is useful. Epsilon-greedy exploration sometimes chooses a random legal action to gather experience; otherwise it chooses a maximum estimate. The exploration probability is separate from the learning rate that controls update size.

Training changes estimates. Validation helps choose observation design, reward weights, and other settings. A final held-out evaluation measures the chosen design on cases not used for those choices. Repeatedly tuning against the reported held-out seeds turns them into validation data; reserve fresh evaluation cases afterward.

Use the same scripted baseline, upgrade, rules, and steering when comparing equipment policies. Record race time, position, completion, and attacks, not just the training reward. If reward encourages attacking at the expense of fast laps, an implementation may be correct while the product objective is wrong. The later evaluation lab makes that disagreement numerical.

## Challenge — revisit without blocking the course

This challenge is optional and can be deferred. All implementation needed later is in the guided path.

Give two physically different race situations that produce the same six observation bits. Explain why a single Q-table row must choose from the same estimates in both, and propose one additional observation with its increased table-size cost.

