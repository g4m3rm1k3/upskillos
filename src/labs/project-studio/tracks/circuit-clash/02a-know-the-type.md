---
title: Know the type before changing the value
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

If you have written Python scripts, you have used types already: `3`, `3.0`, and `"3"` are different kinds of values there too. The difference is when a mistake is discovered and what a name is allowed to refer to. This lesson makes those rules observable. You are not expected to remember a table of language trivia before beginning.

## Separate a name, its declared type, and its value

In Python, a name can refer to an integer now and a string later. That does not make the integer itself change into text. In ordinary C#, a local variable has one compile-time type; each assignment must supply a compatible value. We deliberately do not use C#'s `dynamic` escape hatch here.

`var ticks = 60` asks the compiler to infer `int` from the initializer. It does not mean “accept anything later.” The assignment of 0.5f below should fail at compile time. Predict whether any Console output can run before you execute the command.

Read the diagnostic: its file and line identify the assignment; its source and destination types explain the mismatch. Do not add a cast yet. Decide what ticks represents. If it is a count of simulation steps, fractional seconds belong in a different variable. If it represents elapsed time, the original type/name were wrong. A compiler suggestion is a mechanism, not a design decision.

Run this intentionally invalid program. Expect an error about converting float to int and no executed output. This is a **compiler investigation**, not a red behavior test: no program was built that could evaluate an assertion.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
var ticks = 60;
ticks = 0.5f;
Console.WriteLine(ticks);
```

## Repair the model instead of suppressing the diagnostic

Keep ticks as an integer count and introduce secondsPerTick as a float duration. Multiplication combines the quantities into elapsed seconds. At sixty steps of one sixtieth second, elapsed should be approximately one second. The fraction has no exact finite binary representation, so later tests will allow a small numerical error.

GetType is a runtime inspection method available on these values; Name returns its type's name. C# `int` maps to System.Int32; `float` maps to System.Single; `double` maps to System.Double. “Single” names single precision, not a one-element collection. These names help read diagnostics and debugger inspectors.

The cast is absent because no information needs to be discarded. A repair such as `ticks = (int)0.5f` would compile but truncate to zero, hiding the modeling mistake. Before each assignment, ask: what is the expression's type, what is the destination type, and what meaning or information could be lost?

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
int ticks = 60;
float secondsPerTick = 1f / 60;
float elapsedSeconds = ticks * secondsPerTick;
Console.WriteLine($"ticks: {ticks.GetType().Name}");
Console.WriteLine($"step: {secondsPerTick.GetType().Name}");
Console.WriteLine($"one-second result: {MathF.Abs(elapsedSeconds - 1f) < 0.0001f}");
```

## Find the type of an expression before its destination

For `float a = 5 / 2`, both operands are integers, so division first produces integer 2. Assignment then converts that 2 to float. The destination does not reach backward and make the division fractional. In `5 / 2f`, one operand is float, so the integer operand is converted and division produces 2.5.

An explicit cast such as `(int)2.9f` truncates toward zero; it is neither rounding to nearest nor always rounding downward. Negative -2.9 becomes -2. `MathF.Floor` means toward negative infinity, and `MathF.Round` has midpoint rules that must match your requirement. Never substitute these operations without naming the desired rule.

Type the cases and predict every printed value. This particular fraction, 2.5, is exactly representable in binary. Later calculations involving many additions need tolerances chosen for their units and scale. An arbitrary huge tolerance can let a real error pass.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
float assignedLater = 5 / 2;
float fractionalFirst = 5 / 2f;
int truncated = (int)2.9f;
int negative = (int)(-2.9f);
Console.WriteLine($"integer quotient: {assignedLater}");
Console.WriteLine($"fraction preserved: {fractionalFirst == 2.5f}");
Console.WriteLine($"casts: {truncated}, {negative}");
```

## Choose representation by range, precision, and domain

An int is a signed 32-bit whole number with a finite range. A Python integer can grow beyond that range; a C# int cannot. In a checked context, arithmetic outside the range throws OverflowException. Unchecked integer arithmetic may wrap, which is rarely appropriate for credits or array sizes. `checked` makes the requirement explicit at a risky boundary.

Float has roughly seven significant decimal digits; double roughly fifteen to sixteen. Significant digits concern the whole magnitude, not a fixed number of decimal places. Near 16,777,216, adding one to a float can produce the same float because adjacent representable values are farther apart. Double can represent this particular integer increment. More precision costs memory/bandwidth and may not match a graphics API that expects floats.

Decimal, written with an `m` literal suffix, represents many decimal fractions exactly and is commonly useful for decimal business arithmetic. It is not a replacement for every float: it has different range/performance characteristics and does not match Vector3's component type. Our garage credits are whole tokens, so int is the direct representation. Choose the meaning first, then the type.

The first two output lines should report True. The final operation deliberately exceeds the integer range and must stop with OverflowException. This is a runtime failure after successful compilation. We will learn selective exception handling later; do not hide this investigation in a catch-all handler.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
float large = 16777216f;
double wider = 16777216d;
Console.WriteLine($"float unchanged: {large + 1f == large}");
Console.WriteLine($"double increased: {wider + 1d > wider}");
int maximum = int.MaxValue;
Console.WriteLine(checked(maximum + 1));
```

## Challenge — revisit without blocking the course

This challenge is optional and can be deferred. All implementation needed later is in the guided path.

A CSV speed column contains "27.5". Trace text → parsed numeric value → metres per second → display kilometres per hour. State which conversion needs a culture/decimal-separator policy and why an int cast would be the wrong repair.

