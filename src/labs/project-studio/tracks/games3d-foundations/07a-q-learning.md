---
title: Learn action values and evaluate a beacon bot
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

The world now has trustworthy rules. Teach a bot estimates of how useful each action is, then compare its behavior with an untrained baseline. This is tabular Q-learning: one number per state/action pair. It is not a neural network and requires no ML package.

## Work one update by hand

Start an action estimate at zero. A goal gives reward 10. Move halfway toward that observation: the estimate becomes 5. For a previous ordinary step, reward is -1 and the best estimate at its next tile is 5. Discount that future estimate by 0.9: the target is -1 + 0.9*5 = 3.5. Moving halfway from zero toward 3.5 gives 1.75. Repeated experience propagates useful estimates backward.

Now name the parts: Q(s,a) estimates the value of action a in state s. Alpha is the update fraction (0.5 above); gamma discounts later rewards (0.9 above). After observing reward r and next state s', target = r + gamma * best next estimate. At an actual ending, target = r because this episode has no future. New estimate = old + alpha * (target - old).

```predict
question: A terminal hazard gives -8 and the stored next estimate is 5. With alpha=1, what should the new estimate be?
choice: -8
choice: -3.5
answer: -8
explain: Terminal feedback has no future continuation. Adding 0.9*5 would incorrectly bootstrap across an episode ending. Terminal update and ordinary update need different targets.
```

[Watkins and Dayan's original paper](https://www.gatsby.ucl.ac.uk/~dayan/papers/wd92.html) gives the algorithm and convergence conditions. Our finite run with fixed learning rate is an experiment; passing a few seeds is not proof of convergence.

## Own the table and distinguish exploration from exploitation

Create Core/QAgent.cs. double[,] is a rectangular two-dimensional array: its indices are state and action. private keeps callers from rewriting estimates arbitrarily; readonly keeps the table reference fixed, not its cells. Value exposes one number for inspection. Greedy chooses the greatest estimate; strict > gives deterministic first-action ties, useful for reproducing the untrained baseline.

```csharp edit=Core/QAgent.cs mode=replace
namespace Studio3D;

public sealed class QAgent
{
    private readonly double[,] values = new double[BeaconWorld.StateCount, BeaconWorld.ActionCount];
    public double Value(int state, BotAction action) => values[state, (int)action];

    public BotAction Greedy(int state)
    {
        int best = 0;
        for (int action = 1; action < BeaconWorld.ActionCount; action++)
            if (values[state, action] > values[state, best]) best = action;
        return (BotAction)best;
    }

    public BotAction Choose(int state, double epsilon, Random random)
    {
        if (!double.IsFinite(epsilon) || epsilon < 0 || epsilon > 1) throw new ArgumentOutOfRangeException(nameof(epsilon));
        return random.NextDouble() < epsilon ? (BotAction)random.Next(BeaconWorld.ActionCount) : Greedy(state);
    }

    public void Learn(int state, BotAction action, Transition result, double alpha, double gamma)
    {
        if (!double.IsFinite(alpha) || alpha <= 0 || alpha > 1 || !double.IsFinite(gamma) || gamma < 0 || gamma > 1)
            throw new ArgumentOutOfRangeException();
        double next = result.Terminal ? 0 : Value(result.State, Greedy(result.State));
        double target = result.Reward + gamma * next;
        double old = Value(state, action);
        values[state, (int)action] = old + alpha * (target - old);
    }
}
```

Choose explores a random action with probability epsilon; otherwise it exploits current estimates. Random is supplied as an ordinary argument, rather than constructed on every call. One seed makes a run reproducible for this toolchain, not guaranteed identical across runtime versions. Learn accepts trusted transitions produced by our environment; this is not an API for arbitrary external reward data. Alpha and gamma use finite range validation. nameof(epsilon) produces the parameter name for a diagnostic without repeating its spelling as a string.

A reward is one observation; a Q-value estimates discounted future reward. A negative ordinary step can eventually have positive value when it leads to the goal. Greater training reward alone does not prove a better greedy policy.

## Bound training attempts and freeze evaluation

Create Core/BotTraining.cs. A nested loop runs episodes and steps. The optional episodes parameter defaults to 600 when a caller omits it. Reset state for every attempt but retain the same agent table. The 20-step cap bounds work; reaching it truncates our observation of a continuing task. It is not an environment terminal event, so do not turn the final transition into Terminal. We discard an unfinished attempt and start another.

```csharp edit=Core/BotTraining.cs mode=replace
namespace Studio3D;

public readonly record struct Evaluation(bool Won, int Steps, double Reward);

public static class BotTraining
{
    public static void Train(QAgent agent, int seed, int episodes = 600)
    {
        Random random = new(seed);
        for (int episode = 0; episode < episodes; episode++)
        {
            int state = BeaconWorld.Start;
            for (int step = 0; step < 20; step++)
            {
                BotAction action = agent.Choose(state, 0.2, random);
                Transition result = BeaconWorld.Step(state, action);
                agent.Learn(state, action, result, 0.4, 0.9);
                state = result.State;
                if (result.Terminal) break;
            }
        }
    }

    public static Evaluation Evaluate(QAgent agent)
    {
        int state = BeaconWorld.Start;
        double reward = 0;
        for (int step = 1; step <= 20; step++)
        {
            Transition result = BeaconWorld.Step(state, agent.Greedy(state));
            reward += result.Reward;
            state = result.State;
            if (result.Terminal) return new Evaluation(state == BeaconWorld.Goal, step, reward);
        }
        return new Evaluation(false, 20, reward);
    }
}
```

Evaluation uses only Greedy and Step: no exploration, no Learn, no changing table. It reports win, steps and total reward. All table entries share the same state encoding and action order. This tiny problem has nine states and four actions, hence a bounded table; continuous racing positions need a representation decision before this method can transfer.

## Check arithmetic and behavior independently

Create Checks/LearningChecks.cs. The hand calculations catch algorithm bugs; five trained seeds exercise behavior on this one deterministic map. The unusual terminal result pointing at a nonzero row is a deliberate arithmetic fixture to expose accidental bootstrapping, not a normal world transition. Exact integer episode rewards are safe to compare; learned floating estimates use tolerance. Math.Abs measures the magnitude of a difference; 1e-9 is scientific notation for 0.000000001.

```csharp edit=Checks/LearningChecks.cs mode=replace
using Studio3D;

public static class LearningChecks
{
    public static void Run(Action<bool, string> check)
    {
        QAgent arithmetic = new();
        arithmetic.Learn(7, BotAction.Right, new Transition(8, 10, true), 0.5, 0.9);
        check(Math.Abs(arithmetic.Value(7, BotAction.Right) - 5) < 1e-9, "Terminal update arithmetic changed");
        arithmetic.Learn(6, BotAction.Right, new Transition(7, -1, false), 0.5, 0.9);
        check(Math.Abs(arithmetic.Value(6, BotAction.Right) - 1.75) < 1e-9, "Bootstrap update arithmetic changed");
        arithmetic.Learn(0, BotAction.Right, new Transition(7, -8, true), 1, 0.9);
        check(arithmetic.Value(0, BotAction.Right) == -8, "Terminal update bootstrapped");
        check(arithmetic.Value(0, BotAction.Forward) == 0, "Learning changed unrelated action");
        QAgent fresh = new();
        check(!BotTraining.Evaluate(fresh).Won, "Untrained baseline unexpectedly wins");
        foreach (int seed in new[] { 7, 19, 43, 101, 211 })
        {
            QAgent agent = new();
            BotTraining.Train(agent, seed);
            double before = agent.Value(0, agent.Greedy(0));
            Evaluation result = BotTraining.Evaluate(agent);
            check(result.Won && result.Steps == 4 && result.Reward == 7, "Trained greedy policy failed");
            check(agent.Value(0, agent.Greedy(0)) == before, "Evaluation modified learning");
        }
        Console.WriteLine("LEARNING CHECKS PASSED");
    }
}
```

## Run the learning checks and make an incorrect learner

Append the invocation. Require the success message. Temporarily replace the terminal conditional in Learn with an unconditional next-state estimate; require Terminal update bootstrapped. Restore it. Then set the training episode count to zero in a practice call and require Trained greedy policy failed. Explain which failure concerns the update and which concerns enough experience.

```csharp edit=Checks/Program.cs mode=append
LearningChecks.Run(Check);
```

```check
run "dotnet run --project Checks" exit=0 stdout="LEARNING CHECKS PASSED" timeout=120
```

Checks establish arithmetic and these tested policies, not statistical reliability on unseen maps. Rendering and human controls arrive next. Do not claim improved general intelligence from a solved tiny environment.

## Independent task: measure exploration instead of guessing

In a separate practice copy compare epsilon=0 and epsilon=0.2 over ten seeds. Keep map, episode budget and evaluation fixed. Report greedy wins and steps separately from training returns. Explain the tie-breaking effect and add a test proving evaluation leaves a table entry unchanged. Do not use the evaluation result to keep training that same run.

```hints
nudge: Make fresh agents for each configuration and seed. Reusing a trained table contaminates the comparison.
concept: Exploration produces experience; evaluation measures the fixed policy. A controlled comparison changes one factor and includes failures, not only the best run.
shape: Parameterize epsilon in a practice version of Train, record an Evaluation per seed/configuration, then count wins and report steps only with their win status. Save a Value before evaluation and compare it afterward.
```
