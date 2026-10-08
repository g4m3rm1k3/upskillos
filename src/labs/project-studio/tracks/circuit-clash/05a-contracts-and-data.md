---
title: Objects with contracts and validated data
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

The previous lesson introduced references and collections. Before combining them into a game, we will protect a small object's invariant and distinguish value records from mutable objects. This is where “use a class” becomes a design decision rather than a wrapping exercise.

## State the contract before implementing the operation

Energy is always between zero and 100. Spending a negative amount must fail without increasing energy. Spending more than available must fail without changing energy. A valid spend succeeds and subtracts exactly once.

The class exposes a public getter but keeps its setter private. `Energy { get; private set; }` is a property: callers can read it, but only code inside EnergyStore can assign it. The compiler creates backing storage. Its initializer sets the starting value for each new object.

TrySpend's temporary body returns false for every request. That preserves state but violates the valid-spend requirement. The assertions first reject a negative spend, then require a valid spend of 35 to succeed. Run and expect the second assertion to fail with `Valid spend rejected`. This is a compiling stub producing a meaningful red test, not a type error.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
EnergyStore store = new();
if (store.TrySpend(-1) || store.Energy != 100)
    throw new Exception("Negative spend changed energy");
if (!store.TrySpend(35) || store.Energy != 65)
    throw new Exception("Valid spend rejected");
Console.WriteLine("ENERGY STORE PASSED");

public sealed class EnergyStore
{
    public int Energy { get; private set; } = 100;
    public bool TrySpend(int amount)
    {
        return false;
    }
}
```

## Make invalid changes impossible through the public operation

The guard rejects negative or unaffordable amounts before mutation. After it passes, subtraction preserves the range and true signals success. The extra failed-spend assertion checks that failure did not partially alter state. Try temporarily moving subtraction before the guard to see that regression, then restore it.

Private setters constrain what other code can do, not just how fields look in a diagram. Try adding `store.Energy = -10` at the call site and compile; expect an inaccessible-setter error. Remove that deliberate invalid line before continuing. The object itself must still implement its internal changes correctly; encapsulation does not prove its method's arithmetic.

Our later race prototype uses mutable data fields with changes centralized in Race. That is a consciously weaker boundary suitable for an internal simulation, not an example of enforced public invariants. If that model becomes a plugin/network API, narrow its mutation surface as you did here. Choose the boundary according to who can call it and which invalid states matter.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
EnergyStore store = new();
if (store.TrySpend(-1) || store.Energy != 100)
    throw new Exception("Negative spend changed energy");
if (!store.TrySpend(35) || store.Energy != 65)
    throw new Exception("Valid spend rejected");
if (store.TrySpend(66) || store.Energy != 65)
    throw new Exception("Failed spend changed energy");
Console.WriteLine("ENERGY STORE PASSED");

public sealed class EnergyStore
{
    public int Energy { get; private set; } = 100;
    public bool TrySpend(int amount)
    {
        if (amount < 0 || amount > Energy) return false;
        Energy -= amount;
        return true;
    }
}
```

## Copy values and identify shared mutable state

A record struct groups values and supplies value-based equality. With readonly, its instance data cannot change after construction. The positional declaration below creates a Speed property and a Turn property and a constructor accepting both. No hidden game engine is involved; this is a C# language feature.

Copying Specs copies those numeric values. `with { Speed = 31 }` constructs another record value, keeping unspecified values from the original. The original remains 28. This is useful for immutable configuration or a request describing one tick. It is different from copying a Kart reference, which selects the same mutable racer.

A value type containing an object reference would still copy that reference rather than recursively copy its target. Do not reduce ownership to “struct always deep, class always bad.” Ask what data is inside the value, what is shared, and which operations mutate it. Arrays and dictionaries in the later policy still need explicit independent row copies.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
Specs handling = new(28f, 2.4f);
Specs copy = handling;
Specs engine = copy with { Speed = 31f };
if (handling.Speed != 28f || engine.Speed != 31f)
    throw new Exception("Record replacement changed the original");
if (copy != handling) throw new Exception("Record values should compare equal");
Console.WriteLine("VALUE COPY PASSED");

public readonly record struct Specs(float Speed, float Turn);
```

## Read text as text until validation succeeds

A text field supplies characters, even when they look like digits. `int.TryParse` tries to interpret them as a whole number and returns a bool. Its `out` argument receives the parsed integer on success; on failure this integer output is zero, which is not evidence that the user entered zero. The bool must decide which meaning applies.

The loop tests valid whole text, fractional text, nonnumeric text, and a value outside int's range. It then checks a separate domain rule: a credit input cannot be negative. Parsing answers “can this be represented as an int?” Validation answers “is this permitted here?” They are different operations.

`string[]` is a fixed sequence of strings and foreach visits each; the collections lesson will examine its storage and indexing. Here it only lets us repeat the same boundary experiment. No exception handler is needed for expected invalid user input because TryParse represents failure directly.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
string[] entries = { "35", "3.5", "hello", "2147483648", "-1" };
foreach (string text in entries)
{
    bool parsed = int.TryParse(text, out int credits);
    if (!parsed) Console.WriteLine($"{text}: not a representable integer");
    else if (credits < 0) Console.WriteLine($"{text}: negative credits rejected");
    else Console.WriteLine($"{text}: accepted {credits}");
}
```

## Challenge — revisit without blocking the course

This challenge is optional and can be deferred. All implementation needed later is in the guided path.

Choose between an immutable value and a mutable object for a lap-time measurement, a racer identity, and an input command. Give a concrete failure caused by choosing poorly for each case.

