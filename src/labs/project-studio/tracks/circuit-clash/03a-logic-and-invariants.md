---
title: Boolean logic, invariants, and state transitions
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

A program can be type-correct and still apply the wrong rule. We will turn sentences into truth tables, identify conditions that must remain true, and model transitions explicitly before game systems use them.

## Derive equipment permission from a truth table

Requirement: a shield may activate only when energy is sufficient **and** equipment is ready. Let enough mean energy >= 35 and ready mean cooldown <= 0. List all four pairs: false/false, false/true, true/false, true/true. Only the last permits activation. That is logical conjunction, written &&.

With ||, either fact alone would permit the shield: enough energy could bypass cooldown, or readiness could grant a free shield. With !, the truth value reverses. The expression `!(enough && ready)` is equivalent to `!enough || !ready`; check all four pairs rather than trusting the similarity of punctuation.

Nested foreach loops below visit each possible bool for enough and each for ready. The interpolation reports the inputs and computed result. `if (condition) throw new Exception(message)` is an executable assertion here: when the unwanted condition is true, it constructs an error carrying that message and stops normal execution. The later test lesson will build the failure-first workflow around it. Run it, then describe what requirement would justify || instead. Operators are chosen from the rule, not from whichever one makes a failing example pass.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
bool[] values = { false, true };
foreach (bool enough in values)
{
    foreach (bool ready in values)
    {
        bool permitted = enough && ready;
        bool rejected = !enough || !ready;
        if (permitted == rejected) throw new Exception("Permission and rejection must disagree");
        Console.WriteLine($"enough={enough}, ready={ready}, permitted={permitted}");
    }
}
Console.WriteLine("TRUTH TABLE PASSED");
```

## Maintain an invariant across a transition

An invariant is a condition intended to remain true at a defined boundary. Energy must stay between zero and 100 after every accepted action. A precondition says what must be true before an operation; a postcondition says what it establishes afterward. Sufficient energy is a precondition for spending 35; decreasing by exactly 35 is its successful postcondition.

Check permission before mutation. Subtracting first and discovering insufficient funds later would briefly violate the invariant and require rollback. In a single synchronous method that may be recoverable; with events, callbacks, or multiple resources it is easy to expose partial state.

The example tests 34, 35, and 36. `before` keeps the initial value for comparison; it is a copy of the number. The expected result is derived from the boundary requirement. These are small specification examples you can turn into a test before writing the real Race.Act method.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
int[] starts = { 34, 35, 36 };
foreach (int before in starts)
{
    int energy = before;
    bool activated = energy >= 35;
    if (activated) energy -= 35;
    int expected = before == 34 ? 34 : before - 35;
    if (energy != expected || energy < 0 || energy > 100)
        throw new Exception("Shield spending violated its contract");
}
Console.WriteLine("ENERGY CONTRACT PASSED");
```

## Make illegal transitions visible

A state machine consists of named states, events, and permitted transitions. For our eventual race: Countdown reaches Racing when its timer ends; Racing can enter Paused or Finished; Paused resumes the prior active phase; Finished does not become Racing just because another timer tick arrives.

Write a table before code: from-state, event, to-state, and side effects. For Pause during Racing, the new state is Paused and no physics time is advanced. For Resume during Finished, the state stays Finished. Reset is a distinct event that creates a new race. This avoids treating every boolean combination as meaningful.

The course will use an enum for named phases. An enum limits the vocabulary but does not enforce legal transitions by itself. The transition code and its tests still matter. Two booleans such as racing=true and finished=true could express a contradictory state; one phase value makes that combination harder to represent.

Before continuing, explain why a pause menu appearing is an observation of presentation, while a frozen hazard timer is evidence of the state-machine contract. In the later Checkpoint lesson, use the same table method for NextGate and Lap.

## Challenge — revisit without blocking the course

This challenge is optional and can be deferred. All implementation needed later is in the guided path.

Specify a garage transaction with two resources: credits and ownership. Give a postcondition for success and a postcondition for failure. Explain why checking only the selected package misses a partial or double charge.

