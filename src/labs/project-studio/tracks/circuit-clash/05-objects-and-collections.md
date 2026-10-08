---
title: Objects, collections, and ownership
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

You will distinguish a copied value from a shared object and choose collections by the operations the game needs.

## Create two objects with independent state

A class declares a reference type. In `Counter first = new()`, the constructor expression `new()` uses the Counter type declared on the left; it is shorthand for `new Counter()` and still creates a specific typed object. `new Counter()` allocates one object and runs its constructor if one is declared. With no explicit constructor, this class gets an empty default constructor. An instance field belongs to each object separately; `Value` begins at zero, the default for int.

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

An array has a fixed length and zero-based indices. `float[]` is an array of floats; `new float[3]` creates three zero-valued elements. Brackets select one element. The valid indices are zero, one, and two; index three is outside the array even though Length is three.

The for loop visits exactly the valid interval by using `< energy.Length`. Predict the printed values: zero, 35, zero. The array variable refers to this array; copying that reference would share its elements rather than duplicate them. An array of floats contains float values, but the array itself is a reference object.

Type this small experiment in `Scratch/Program.cs`, replacing the counter experiment, and run `dotnet run --project Scratch`. Temporarily change `<` to `<=` to observe IndexOutOfRangeException, then restore `<`. Use the index and Length at the failing iteration to explain the error.

```csharp edit=Scratch/Program.cs mode=replace
float[] energy = new float[3];
energy[1] = 35;
for (int i = 0; i < energy.Length; i++) Console.WriteLine(energy[i]);
```

## Grow a sequence and consume oldest-first {#list-and-queue}

A List can grow and shrink. `List<string>` is a generic type: the type argument string specifies what every element must be. Trying to Add an integer would be rejected by the compiler. Add appends; Count reports the current number of elements. Unlike an array's fixed Length, that count changes with additions and removals.

foreach visits each element in order, binding its value to the local racer variable. Do not structurally change a List during that traversal; its enumerator detects incompatible modification. Later combat marks hazards expired during traversal and removes them afterward.

Queue models first-in, first-out order. Enqueue places a new event at the back, and Dequeue removes the oldest. After rocket then shield, the next result must be rocket. Dequeue on an empty queue throws; the keyboard adapter will test Count before consuming. Append the fragment below and run. The previous array still exists because these are later statements in the same entry method.

```csharp edit=Scratch/Program.cs mode=append
List<string> racers = new() { "You", "Ember" };
racers.Add("Volt");
foreach (string racer in racers) Console.WriteLine(racer);
Console.WriteLine($"slots={energy.Length}, racers={racers.Count}");
Queue<string> events = new();
events.Enqueue("rocket"); events.Enqueue("shield");
Console.WriteLine(events.Dequeue());
```

## Associate a key with a value {#dictionary-lookup}

Dictionary<string,int> maps text keys to integer values. The two generic arguments have different roles: lookup accepts a string key, while the retrieved result is an int. Add creates a new association and rejects a duplicate key; bracket assignment can instead replace an existing associated value.

`scores["You"]` selects by key, not by numeric position. A missing key throws rather than automatically supplying zero. TryGetValue is the alternative when absence is expected; the policy-table lesson will use it to create a row only when needed.

Append this fragment and run. Predict ten. Compare the structure with Python's dict, but note that this C# declaration restricts key and value types. It cannot mix an integer score with a list under another key without changing the declared representation.

```csharp edit=Scratch/Program.cs mode=append
Dictionary<string, int> scores = new();
scores.Add("You", 10);
Console.WriteLine(scores["You"]);
```

## Read transformations and missing values

Before combining collections with queries, distinguish an absent value from an empty collection or a stored zero. `null` refers to no object; an empty list is a real object with Count zero; zero can be a legitimate score. The nullable-average experiment already showed why these meanings cannot be collapsed safely.

A `char` literal uses single quotes, such as `'1'`; a string literal uses double quotes, such as `"1"`. Indexing a string returns one UTF-16 char code unit. Our observation keys later contain simple ASCII digits, so comparing `bits[2] == '1'` is appropriate there. It is not a general method for splitting user-perceived Unicode characters.

The next guided labs examine private setters and value records, then algorithms and deferred queries. You do not need to memorize a list of LINQ names here. First be able to trace the underlying loop, identify its element type, and distinguish a copied value from a shared reference. We will introduce query operations where they replace that familiar work.

## Challenge — return to this later

This is optional. You can continue without completing it; no later guided step depends on your solution. Keep your attempt and revisit it.

Create a Dictionary whose values are float arrays. Copy the dictionary entries into another dictionary without cloning the arrays, then change one element. Explain why both dictionaries observe the change. Make the copy independent and repeat.

