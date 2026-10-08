---
title: Debug from evidence — scope, calls, and exceptions
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

Writing scripts often means changing lines until the program runs. Here you will locate the failing operation, trace what entered it, and test a hypothesis before changing the code. These investigations remain useful even when you cannot use an interactive debugger.

## Trace argument values through a call

A parameter is a local variable initialized for one invocation. The caller evaluates arguments before entering the method. Float is a value type, so the called method receives a copy of speed, not a new name for the caller's variable.

In Accelerate, the local copy becomes twelve and is returned. The caller's speed remains ten until it explicitly assigns the returned result. `updated` holds that result separately. `speed = Accelerate(speed,2)` would instead overwrite the caller's value after the function returned.

Trace the call stack: the top-level entry waits while Accelerate runs; Accelerate computes and returns; the entry resumes at the assignment. Its parameter named speed is in a different scope from the caller's speed. Identical spelling does not share storage. Changing a field through an object reference later has different behavior because the copied reference still selects one shared object.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
float Accelerate(float speed, float change)
{
    speed += change;
    return speed;
}
float speed = 10;
float updated = Accelerate(speed, 2);
if (speed != 10 || updated != 12) throw new Exception("Value arguments are copied");
Console.WriteLine("CALL TRACE PASSED");
```

## Use the stack trace to find the failing operation

This program deliberately calls two nested functions before dividing by zero. Integer division by zero throws DivideByZeroException at runtime. It compiles: the divisor is a parameter whose runtime value is not guaranteed to be nonzero.

Read the exception name and message, then the stack frames from the throwing operation outward. StartRace called SecondsPerLap, which attempted the division. A frame reports where an active call came from; the last printed line is not necessarily the original cause. Source line numbers depend on debug information, but the method sequence still explains propagation.

Do not catch Exception and print “all good.” Decide the requirement for zero laps. Here zero completed laps means there is no meaningful per-lap average yet. The next step represents absence explicitly instead of inventing a zero-second average. Run now and expect an unhandled divide-by-zero exception, not a compiler error.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
int SecondsPerLap(int seconds, int laps)
{
    return seconds / laps;
}
int StartRace()
{
    return SecondsPerLap(90, 0);
}
Console.WriteLine(StartRace());
```

## Repair the contract with an explicit missing result

`float?` means either a float value or no value. It is not a string containing a question mark. For laps <= 0, return null before division. The caller must consider that case rather than treating zero as both a legitimate measurement and a missing value.

The cast before division is essential: `(float)seconds / laps` requests fractional arithmetic. Casting the integer quotient afterward would preserve any prior truncation. Null-coalescing display uses `average?.ToString("F1") ?? "No laps yet"`: format only an existing value, otherwise choose explanatory text.

Assertions cover both the missing boundary and a fractional ordinary case. Temporarily remove the guard and verify the boundary assertion or runtime failure detects the regression; restore it. This is a contract repair with evidence, not an arbitrary try/catch around the symptom.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
float? SecondsPerLap(int seconds, int laps)
{
    if (laps <= 0) return null;
    return (float)seconds / laps;
}
if (SecondsPerLap(90, 0) != null) throw new Exception("No average before a lap");
if (SecondsPerLap(91, 2) != 45.5f) throw new Exception("Average must retain fractions");
float? average = SecondsPerLap(90, 0);
Console.WriteLine(average?.ToString("F1") ?? "No laps yet");
Console.WriteLine("AVERAGE CONTRACT PASSED");
```

## Use a repeatable debugging procedure

First reproduce with the smallest known input. Write expected behavior separately from what happened. Classify the failure: compiler diagnostic, runtime exception, wrong result, or performance/visual defect. Then form one hypothesis about the earliest incorrect state.

In an editor with a C# debugger, set a breakpoint before the suspect calculation. Inspect parameter values and types, then use Step Into to enter a call, Step Over to execute it without entering, and Step Out to finish the current call. Inspect the call stack to distinguish caller locals from callee locals. If no debugger is available, temporarily log the same inputs and output at that boundary; do not scatter prints across unrelated code.

Change one cause, rerun the smallest reproduction, then run the affected regression checks. Remove temporary noise after the investigation. If the failure disappears when logging, investigate timing or shared state rather than assuming the log fixed it. An explanation should connect input, execution, wrong state, and repair.

Keep a short mistake log: symptom; mistaken assumption; evidence; general rule; new regression. The goal is learning from documented failures without requiring you to repeat every expensive production mistake yourself.

## Challenge — revisit without blocking the course

This challenge is optional and can be deferred. All implementation needed later is in the guided path.

A function returns an updated speed, but its caller ignores the return value. Write a passing function test and a failing caller-level test to show why both boundaries matter.

