---
title: Give a learning bot a tiny world with explicit rules
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

A bot is interesting before the studio has a full runtime. Build a tiny beacon playground in the same Core library, with its own runner later. This is a discrete navigation prototype, not yet Play mode or a game authored in the editor. Its tiles and bot will be rendered as real 3D geometry; movement decisions use X/Z and a fixed Y height. Follow the history lessons first.


By the end, you should be able to: Define and test a changed environment before trying to train an agent in it.

## Specify state, actions and feedback before learning

Imagine nine floor tiles in a three-by-three square. A state is the tile the bot occupies: state = z * 3 + x. State 0 is (0,0); state 8 is (2,2). An action moves one tile right, forward, left or back. A wall keeps the bot in place. The center tile, state 4, is hazardous. Reaching state 8 earns 10 and ends the episode; entering state 4 earns -8 and ends it; every other step earns -1. An episode is one attempt from start until an ending. A short safe route is better than wandering.

```predict
question: From state 1, what happens after Forward?
choice: State 4, reward -8, episode ends
choice: State 2, reward -1, episode continues
answer: State 4, reward -8, episode ends
explain: State 1 has x=1 and z=0. Forward increments z, so the next index is 1*3+1=4. State encoding and terminal rules must work before training can mean anything.
```

The full decision state is the current tile: rewards and next tiles depend only on that tile and action. If we later add doors, velocity or remaining collectibles, tile alone may stop being enough. Do not hide missing state behind more training.

## Express the rules with an enum and a value record

Create Core/BeaconWorld.cs. An enum gives names to the four integer action values, starting at zero. Cast to int when validating a value: casts from integers can still construct invalid enum values. The readonly record struct groups three values, supports value equality, and prevents property reassignment. It is small result data, with no resource ownership. A class would also work; value semantics make comparison of results convenient here. This is a choice, not a rule that every result must be a struct.

```csharp edit=Core/BeaconWorld.cs mode=replace
namespace Studio3D;

public enum BotAction { Right, Forward, Left, Back }
public readonly record struct Transition(int State, double Reward, bool Terminal);

public static class BeaconWorld
{
    public const int StateCount = 9;
    public const int ActionCount = 4;
    public const int Start = 0;
    public const int Goal = 8;
    public const int Hazard = 4;

    public static Transition Step(int state, BotAction action)
    {
        if (state < 0 || state >= StateCount || (int)action < 0 || (int)action >= ActionCount)
            throw new ArgumentOutOfRangeException();
        if (state == Goal || state == Hazard) throw new InvalidOperationException("Reset a terminal episode first.");
        int x = state % 3;
        int z = state / 3;
        switch (action)
        {
            case BotAction.Right: x++; break;
            case BotAction.Forward: z++; break;
            case BotAction.Left: x--; break;
            case BotAction.Back: z--; break;
        }
        x = Math.Clamp(x, 0, 2);
        z = Math.Clamp(z, 0, 2);
        int next = z * 3 + x;
        return new Transition(next, next == Goal ? 10 : next == Hazard ? -8 : -1,
            next == Goal || next == Hazard);
    }
}
```

Integer division extracts a row; remainder (%) extracts its column. Math.Clamp limits coordinates to the inclusive range. The switch selects exactly one direction. The conditional expression chooses a reward. Terminal is independent of reward magnitude: a timeout is not a win, and a penalty is not automatically an ending.

## Test the environment before blaming the learner

Create Checks/WorldChecks.cs. The explicit safe route is a baseline built from rules, not a learning agent. Count is too weak: require exact state, reward and ending. Reset before acting again after a terminal result.

```csharp edit=Checks/WorldChecks.cs mode=replace
using Studio3D;

public static class WorldChecks
{
    public static void Run(Action<bool, string> check)
    {
        check(BeaconWorld.Step(0, BotAction.Left) == new Transition(0, -1, false), "Wall transition changed");
        check(BeaconWorld.Step(1, BotAction.Forward) == new Transition(4, -8, true), "Hazard must end episode");
        check(BeaconWorld.Step(7, BotAction.Right) == new Transition(8, 10, true), "Goal transition changed");
        int state = 0;
        foreach (BotAction action in new[] { BotAction.Right, BotAction.Right, BotAction.Forward, BotAction.Forward })
            state = BeaconWorld.Step(state, action).State;
        check(state == BeaconWorld.Goal, "Safe reference route failed");
        bool rejected = false;
        try { BeaconWorld.Step(8, BotAction.Left); }
        catch (InvalidOperationException) { rejected = true; }
        check(rejected, "Terminal state accepted action");
        Console.WriteLine("WORLD CHECKS PASSED");
    }
}
```

## Invoke the world checks and break one rule

Append the call. Require the success label. Temporarily return false for every Terminal value in Step; require Hazard must end episode with a nonzero exit. Restore the correct rule and rerun. Explain why a bot trained against the broken environment would learn the wrong task even if its table update were correct.

```csharp edit=Checks/Program.cs mode=append
WorldChecks.Run(Check);
```

```check
run "dotnet run --project Checks" exit=0 stdout="WORLD CHECKS PASSED" timeout=120
```

## Independent task: specify a different hazard

In a practice copy move the hazard to state 3. Design a new safe reference route, a transition into the hazard and a wall test before changing the constant. Preserve the three-by-three encoding. State which tests establish rules and which still say nothing about learning or rendering.

```hints
nudge: Draw the nine indices on paper and trace each action.
concept: Training cannot repair an incorrectly specified reward or ending. Tests of environment rules and tests of learning arithmetic have different responsibilities.
shape: Start at 0, move Right twice, then Forward twice for a safe route; separately take Forward from 0 to enter state 3. Verify exact Transition values rather than only the final index.
```

### Explain and transfer

Show the new hazard rule, a safe route and an ending transition you chose. Explain why state needs enough information to determine rewards and transitions. Describe a game change that would make tile index alone insufficient, without implementing it yet.

Keep a brief record of your prediction, actual result, explanation and independently chosen change. Try the explanation with the reference closed; reopen it or use hints when needed, then retry the part you could not explain. A green guided check establishes its named behavior, not independent understanding.
