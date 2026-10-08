---
title: Functions and tests that can really fail
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

We will specify a boundary rule, observe an assertion fail, implement it, then change its shape without changing behavior. A compiler error is not the meaningful red test we are looking for.

## Write an executable expectation first

A method groups a calculation with explicit inputs and a result. In this top-level experiment, `Wrap` is a local function. Its return type `int` promises one integer; its parameter receives a copy of the argument. Declaring it does not run its body. `return` supplies a result and ends that invocation.

We want a circular track with indices 0 through 359. Moving one step before 0 must yield 359. The temporary implementation always returns 0 so the project compiles, but its behavior is wrong. `!=` compares for inequality. `throw new Exception(...)` constructs an error and stops normal execution with its message. An unhandled exception gives the process a nonzero exit status.

Run this before fixing it. Expect `negative index should wrap` and a failed process. If it passes, check that you saved and ran Scratch, and that the assertion is actually executed. A test that never runs is no evidence.

Type this fragment in `Scratch/Program.cs`. Start or replace this file.

```csharp edit=Scratch/Program.cs mode=replace
int Wrap(int index)
{
    return 0;
}
if (Wrap(-1) != 359) throw new Exception("negative index should wrap");
Console.WriteLine("wrap checks passed");
```

## Implement the smallest general rule

`%` is remainder in C#. Negative inputs can give negative remainders: -1 % 360 is -1. Adding 360 makes it 359; taking remainder again keeps positive inputs in range as well. For 360: the intermediate values are 0, 360, 0. For -361: they are -1, 359, 359.

The second assertion rejects an implementation that merely returns 359 for everything. The third checks that already-valid input stays unchanged. Tests are chosen from the requirement's boundaries and ordinary cases, not copied from the implementation's operators. A suite with only `Wrap(0) == 0` would accept the original broken stub.

Type this replacement, run, and expect `wrap checks passed`. This is green: the same negative-boundary expectation that failed now passes. Temporarily remove the `+ 360` adjustment and verify that the assertion fails again; restore it. That mutation demonstrates sensitivity to a real bug.

Type this fragment in `Scratch/Program.cs`. Start or replace this file.

```csharp edit=Scratch/Program.cs mode=replace
int Wrap(int index)
{
    return (index % 360 + 360) % 360;
}
if (Wrap(-1) != 359) throw new Exception("negative index should wrap");
if (Wrap(360) != 0) throw new Exception("end should wrap to start");
if (Wrap(42) != 42) throw new Exception("valid index should stay unchanged");
Console.WriteLine("wrap checks passed");
```

## Refactor without changing the contract

An expression-bodied function uses `=> expression;` instead of braces containing one return. Replace the function declaration/body with `int Wrap(int index) => (index % 360 + 360) % 360;`. Run the existing assertions unchanged. This is refactoring: the structure changes, but the public behavior stays the same. Shorter is not automatically clearer; we use this form for small expressions and braced bodies for sequences.

The function's input is an index and its output is a valid track index. It has no printing or file effects. Such a pure calculation is easy to test without starting a graphics window. Keep calculations pure where practical and move device effects to boundaries.

Before the next lesson, restore the braced version above. Later we will move this rule into Core and apply the same failure-first discipline to the Q update. TDD helps expose mistakes in implementation; it cannot prove the requirement itself is correct. Someone must still ask whether wrapping is appropriate for a track, a menu, or a bank balance.

```check
run "dotnet run --project Scratch" exit=0 stdout="wrap checks passed" timeout=120
```

## Challenge — return to this later

This is optional. You can continue without completing it; no later guided step depends on your solution. Keep your attempt and revisit it.

Specify a ClampEnergy function with a permitted range from 0 to 100. Write cases for -1, 0, 50, 100, and 101 before implementation. Then deliberately write a wrong function that passes only the middle case and explain why the boundary cases matter.

