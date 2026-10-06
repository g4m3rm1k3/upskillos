---
title: Objects, collections, and ownership
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: csharp
pedagogy: typed
console: true
---

You will distinguish a copied value from a shared object and choose collections by the operations the game needs.

## Create two objects with independent state

A class declares a reference type. `new Counter()` allocates one object and runs its constructor if one is declared. With no explicit constructor, this class gets an empty default constructor. An instance field belongs to each object separately; `Value` begins at zero, the default for int.

`public` permits access from other code. `sealed` prevents subclassing; we do not need subclasses of this simple counter. `void` means the method returns no value. Calling `Add` selects one object as its receiver. Inside the method, `Value` refers to that receiver's field.

`alias = first` copies a reference, not the object. Both names select the same counter, so `alias.Add(2)` changes the value observed through `first`. `second` refers to a different object and remains zero. Predict `2 / 0`, then run. This distinction will determine whether frozen learning opponents really have independent Q-tables.

Type this fragment in `Scratch/Program.cs`. Start or replace this file.

```csharp edit=Scratch/Program.cs mode=replace
Counter first = new();
Counter second = new();
Counter alias = first;
alias.Add(2);
Console.WriteLine($"{first.Value} / {second.Value}");

public sealed class Counter
{
    public int Value;
    public void Add(int amount) { Value += amount; }
}
```

## Index an array and grow a list

An array has a fixed length and zero-based indices. `float[]` is an array of floats; `new float[3]` initializes three zeros. `[]` selects an element. A List can grow and shrink: `List<string>` specifies that every element is text. Angle brackets here supply a generic type argument, not a comparison.

`foreach` visits elements in sequence. Each iteration assigns the next element to its local variable. Do not structurally modify a List during foreach; the enumeration contract rejects that. Later we mark projectiles expired during traversal, then remove them afterward.

Use an array when the roster stays fixed, a List when projectiles come and go, a Queue when the oldest event must be consumed first, and a Dictionary when a key should find its associated value. Array indexing is constant work. List removal may shift later elements. A Dictionary uses hashing for average constant-time lookup; it does not promise sorted traversal. These choices follow required operations rather than collection prestige.

Type this fragment in `Scratch/Program.cs`. Start or replace this file.

```csharp edit=Scratch/Program.cs mode=replace
float[] energy = new float[3];
energy[1] = 35;
List<string> racers = new() { "You", "Ember" };
racers.Add("Volt");
foreach (string racer in racers) Console.WriteLine(racer);
Console.WriteLine($"slots={energy.Length}, racers={racers.Count}");
Queue<string> events = new();
events.Enqueue("rocket"); events.Enqueue("shield");
Console.WriteLine(events.Dequeue());
Dictionary<string, int> scores = new();
scores.Add("You", 10);
Console.WriteLine(scores["You"]);
```

## Read transformations and missing values

The game's collection queries use LINQ, a standard library for querying sequences. In `racers.Where(name => name.Length > 3)`, the lambda `name => ...` is a small function supplied as an argument. For each candidate, it returns whether to keep it. `Select` transforms each element; `Any` stops when a match exists; `All` stops at the first failure. `OrderBy` sorts by a key, and `ThenBy` adds a tie-breaker. `ToArray` and `ToList` execute a query and materialize results. Many queries defer traversal until consumed; a query is not automatically a snapshot.

`var` asks the compiler to infer a local type from its initializer. It does not disable type checking. `new()` similarly infers the constructed type from context. We use explicit types where they help a reader and inference where the result is already clear.

A reference may be `null`, meaning it refers to no object. `Kart?` advertises that possibility under nullable checking. `float?` adds a missing case to a value type: an unfinished racer has no finish time. `value ?? fallback` supplies the fallback only when the value is null. `target?.Id` reads Id only if target exists. A missing target and a target with Id zero are different states.

A `record struct` groups values and supplies value equality. Assignment copies those values; a class assignment copies a reference. `readonly` on a record struct makes its instance data immutable. `readonly` on an array field only prevents replacing the array reference; the elements may still change. These are different guarantees, and our race will deliberately use both.

## Challenge — return to this later

This is optional. You can continue without completing it; no later guided step depends on your solution. Keep your attempt and revisit it.

Create a Dictionary whose values are float arrays. Copy the dictionary entries into another dictionary without cloning the arrays, then change one element. Explain why both dictionaries observe the change. Make the copy independent and repeat.

