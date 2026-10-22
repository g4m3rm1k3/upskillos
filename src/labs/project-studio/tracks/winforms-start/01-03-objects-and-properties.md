---
title: 1.3 — An Object Holds a Form's Data
runtime: none
reference: optional
---

A name and quantity belong to one request. Bundle them in an object before introducing a graphical form. An object holds data; it is not a visible window. Continue after 1.2 in the same folder.

## Describe a request

Create a new file beside the Scratch program. A **class** describes the fields and behavior its objects can have, somewhat like a Python class. An **instance** is one actual object created from it.

```csharp file=Scratch/RequestDraft.cs
public class RequestDraft
{
    public string Name { get; set; } = "";
    public int Quantity { get; set; } = 1;
}
```

`public` makes this type or member accessible to other code. A **property** offers a value to read (`get`) and write (`set`); the compiler stores it for us. Its initial value is used for each new object. A default quantity of one is convenient, but defaults do not guarantee later assignments are valid. `null` means no object reference and differs from `""`, an existing string containing no characters. We initialize Name so ordinary new drafts have text rather than a missing reference.

Projects automatically compile `.cs` files inside their own folder and subfolders. Do not put another program's files inside `Scratch`. A new file is enough here; you do not import it by filename.

## Create two independent drafts

Replace the Scratch program:

```csharp file=Scratch/Program.cs
RequestDraft first = new RequestDraft();
first.Name = "Fixture request";
first.Quantity = 3;

RequestDraft second = new RequestDraft();
second.Name = "Inspection tray";
Console.WriteLine($"{first.Name}: {first.Quantity}");
Console.WriteLine($"{second.Name}: {second.Quantity}");
```

`new RequestDraft()` constructs an instance. The parentheses call its default **constructor**, the initialization method the compiler supplies here. A dot accesses an object's property, similar to `draft.name` in Python. Each `new` makes another object; changing the first does not change the second.

```predict
question: What quantity does second have when printed?
choice: 1
choice: 3
answer: 1
explain: second is a separate instance. Its Quantity initializer runs when that instance is constructed.
```

```check
run "dotnet run --project Scratch" stdout="Inspection tray: 1" os=windows label="A second instance keeps its own default" -- Construct second with new; do not assign first to second.
```

Temporarily replace `new RequestDraft()` on the `second` line with `first`, then assign `second.Quantity = 9;` before printing. Both printed quantities become nine: two variables refer to the same object, like two Python names referring to one dictionary. Restore the separate `new` and remove the temporary assignment. Explain why "copy the variable" did not copy the data.

## Your turn: make a third request

In the Practice project, create your own `RequestDraft.cs` with the same two properties. Replace Practice's Program with two separately created drafts named `Clamping plate` and `Gauge holder`, quantities `2` and `8`. Print those names and quantities as in Scratch. Also confirm in an experiment that changing the second does not change the first; restore the requested values before checking.

```hints
nudge: A class declaration defines the shape; new creates actual objects that can hold different values.
concept: Assigning one existing object variable to another creates an alias. Construct each draft separately.
shape: Make two new RequestDraft instances, set their properties, then print each instance's Name and Quantity.
```

```check
run "dotnet run --project Practice" stdout="Clamping plate: 2\nGauge holder: 8" os=windows label="Two independent draft objects print their values" -- Save the class in Practice, then build two instances in its Program.cs.
```

The check establishes this output and successful compilation. Hardcoded output could imitate it: your alias experiment and explanation are required evidence of understanding object identity.
