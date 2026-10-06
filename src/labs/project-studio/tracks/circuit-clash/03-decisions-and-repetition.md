---
title: Decisions, loops, and legal actions
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: csharp
pedagogy: typed
console: true
---

You will control when a state change is allowed and reason about repeated work. These are the foundations of equipment rules, simulation ticks, and searches.

## Guard a purchase before changing state

`>=` compares two numbers and produces a bool. `if` evaluates its parenthesized condition and executes its braced body only when true. `else` chooses the other body. Only one runs. Indentation is for readers; braces establish the actual blocks.

Here a purchase at exactly 150 credits must succeed. Predict balances for 149, 150, and 151 before trying each. Using `>` instead of `>=` creates a boundary error at 150. Check ownership as well as the printed message: an attractive success message cannot prove the state changed correctly.

`!owned` means “owned is false.” `&&` requires both conditions and short-circuits: it skips the right side if the left is false. Later this prevents dereferencing a missing object. `||` means either condition may be true. These operators operate on booleans, not vague truthiness.

Type this fragment in `Scratch/Program.cs`. Start or replace this file.

```csharp edit=Scratch/Program.cs mode=replace
int credits = 150;
bool owned = false;
if (!owned && credits >= 150)
{
    credits -= 150;
    owned = true;
}
else
{
    Console.WriteLine("No purchase");
}
Console.WriteLine($"credits={credits}, owned={owned}");
```

## Follow a loop through its boundary

A `for` loop has initialization, continuation condition, and update separated by semicolons. Initialization runs once. Before each iteration, the condition is tested. After the body, `tick++` increments tick by one, then the condition is tested again.

With `tick < 3`, the body sees 0, 1, and 2. The value 3 is tested but not processed. `<= 3` would execute four times. Zero-based indices make an array of length three use those same indices 0 through 2. Accessing index 3 would exceed its bounds.

The loop variable exists only in its scope. Speed was declared outside and survives each iteration. It increases by 2 each time, yielding 2, 4, 6. Trace condition, body, and update separately. A loop is not an instruction to execute all iterations simultaneously.

Type this fragment in `Scratch/Program.cs`. Start or replace this file.

```csharp edit=Scratch/Program.cs mode=replace
float speed = 0;
for (int tick = 0; tick < 3; tick++)
{
    speed += 2;
    Console.WriteLine($"tick={tick}, speed={speed}");
}
```

## Choose repetition by the stopping rule

`while (condition)` checks a condition before each execution, without providing an initialization or increment slot. It fits “while enough accumulated time remains.” A loop must eventually change something that makes its condition false, or have an intentional exit. `break` exits the nearest loop; `continue` skips the rest of one iteration and proceeds to the next condition/update.

Later a collision search uses `continue` for an ineligible kart, while collecting one pickup uses `break` because it can have only one winner. Those statements encode different requirements. Substituting one for the other silently changes behavior.

For a safe experiment, replace the `for` loop with `int tick = 0; while (tick < 3) { speed += 2; Console.WriteLine(speed); tick++; }`. Reset speed to zero first. Run it and compare values with the original. Restore the original afterward. If you accidentally omit the increment, stop the running process with Ctrl+C rather than waiting for it to repair itself.

## Challenge — return to this later

This is optional. You can continue without completing it; no later guided step depends on your solution. Keep your attempt and revisit it.

Write a loop that examines six pickup positions and stops at the first available one. Explain what happens when none is available, when the first is available, and when the last is available. Do not use an infinite loop to represent failure.

