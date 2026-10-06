---
title: Understand Q-learning before implementing a table
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: csharp
pedagogy: typed
console: true
---

The policy chooses equipment tactics; it does not learn steering, interpret images, or rewrite its own code. We will work a numerical example and test a meaningful failure first.

## Turn experience into a numerical target

Suppose an action currently has value 2. Its observed reward is 3, and the best permitted next action has value 4. With discount 0.9, the target is 3 + 0.9×4 = 6.6. With learning rate 0.5, move halfway from 2 toward 6.6: the new estimate is 4.3.

The general update is `old + alpha * (reward + gamma * future - old)`. Alpha controls how strongly this experience changes the estimate; gamma discounts future reward. These values are tunable assumptions, not physical constants. At a terminal state there is no next decision, so future must be zero. A time-limit truncation is different: the underlying race could continue, so our update bootstraps from its next state.

Write a compiling but wrong Update that returns old. Run the first assertion and observe `Q should move toward its target`. This establishes red on the numerical requirement rather than on a missing method or syntax error. No graphics or stochastic race is needed to check arithmetic.

Type this fragment in `Scratch/Program.cs`. Start or replace this file.

```csharp edit=Scratch/Program.cs mode=replace
float Update(float old, float reward, float future, bool terminal)
{
    return old;
}
float learned = Update(2,3,4,false);
if (MathF.Abs(learned - 4.3f) > 0.0001f)
    throw new Exception("Q should move toward its target");
Console.WriteLine("Q arithmetic passed");
```

## Apply the equation and distinguish terminal states

The conditional expression selects zero future value for terminal experience and the supplied estimate otherwise. Only the chosen branch contributes a value. The float constants preserve the intended arithmetic type.

For the terminal example, target is 3 and moving halfway from 2 yields 2.5. It must not become 4.3 just because another row contains a high value. The two assertions distinguish terminal and continuing updates while holding all other inputs fixed. Type this replacement and run until both pass.

Now temporarily remove the terminal conditional. The first assertion still passes, but the terminal assertion fails. That is why one attractive training curve cannot establish that the update handles episode boundaries correctly. Restore the correct function before continuing.

Type this fragment in `Scratch/Program.cs`. Start or replace this file.

```csharp edit=Scratch/Program.cs mode=replace
float Update(float old, float reward, float future, bool terminal)
{
    return old + 0.5f * (reward + 0.9f * (terminal ? 0 : future) - old);
}
if (MathF.Abs(Update(2,3,4,false) - 4.3f) > 0.0001f)
    throw new Exception("Q should move toward its target");
if (MathF.Abs(Update(2,3,4,true) - 2.5f) > 0.0001f)
    throw new Exception("terminal states have no future");
Console.WriteLine("Q arithmetic passed");
```

## Separate reward, value, and evaluation

Reward measures an immediate outcome chosen by the designer. Q estimates discounted future reward for an observed state/action. Evaluation measures product outcomes such as finishing, race time, position, and hits on separate experiments. These are three different quantities.

Our observations collapse many real situations into the same key. Opponents also affect transitions. Tabular Q-learning's classic convergence assumptions do not automatically hold for this coarse multi-opponent game, finite training, and changing snapshots. Treat the resulting policy as an empirical artifact to test, not a proof of optimal play.

A reward can be wrong even when its update is implemented perfectly. Rewarding hits heavily may create a slower but more aggressive driver. Keep both elapsed time and position in evaluation, then inspect behavior. Changing the reward changes the optimization problem; it is not just making the same learner smarter.

```check
run "dotnet run --project Scratch" exit=0 stdout="Q arithmetic passed" timeout=120
```

## Challenge — return to this later

This is optional. You can continue without completing it; no later guided step depends on your solution. Keep your attempt and revisit it.

Calculate an update with old=5, reward=-2, future=3, alpha=0.2, gamma=0.9. Then calculate the terminal version. Explain why a positive old estimate can decrease even when the next state has a positive estimate.

