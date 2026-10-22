---
title: 3.0b — JSON Numbers Are Different from JSON Text
runtime: none
reference: optional
support: JsonPractice/JsonPractice.csproj, samples/number.json, samples/text-number.json
---

Plain text can store a name. To store a name **and** quantity in one file, give the values names and preserve their types. This lesson explores JSON without a form, a dialog, or a validation system. You will independently inspect the type of a supplied value. Continue after the text-file experiment.

## Prepare the JSON experiment

Create the supplied note and project. JsonPractice references Core, just as the form does, so it can construct a RequestDraft. System.Text.Json ships with .NET; there is no extra package to install.

```text file=json-value-guide.txt provided
Run JsonPractice from the form-desk project root.
samples/number.json contains a numeric quantity.
samples/text-number.json contains a string quantity.
```

## Turn one object into JSON text

A serializer turns an object into text with a defined structure. A JSON object has quoted property names, a colon before each value, and commas between properties. Text is quoted; a number is not. Read the output before trying to parse it.

```csharp file=JsonPractice/Program.cs
using FormDesk.Core;
using System.Text.Json;

RequestDraft draft = new RequestDraft();
draft.Name = "Fixture";
draft.Quantity = 3;
string json = JsonSerializer.Serialize(draft);
Console.WriteLine(json);
```

Run `dotnet run --project JsonPractice`. Expect JSON with Name Fixture and Quantity 3. JsonSerializer writes the quotes and escaping for you. Do not build JSON by concatenating an unescaped name between quotation marks.

```predict
question: In the JSON output, is the value for Quantity surrounded by quotes?
choice: No, it is a JSON number
choice: Yes, all JSON values are strings
answer: No, it is a JSON number
explain: The C# Quantity property is an int, so Serialize writes a number. JSON text is a string in memory but its contents describe typed values.
```

```check
run "dotnet run --project JsonPractice" stdout="\"Quantity\":3" os=windows label="Serialization preserves the numeric quantity"
```

## Inspect a value, not just its appearance

JsonDocument.Parse reads JSON syntax. Its RootElement describes the outer value; GetProperty finds a named value. JsonElement is a value describing one part of the document. Its ValueKind says Object, String, Number, Null, and so on. A syntactically valid document can still contain the wrong kinds for our application.

```csharp file=JsonPractice/Program.cs
using System.Text.Json;

using JsonDocument document = JsonDocument.Parse("{\"Quantity\":\"3\"}");
JsonElement quantity = document.RootElement.GetProperty("Quantity");
Console.WriteLine(quantity.ValueKind);
```

Run it: String. Change the inner JSON from `"3"` to `3`, run again, and observe Number. The backslashes in the C# string escape quotation marks; they are not extra characters in the parsed JSON. GetProperty assumes the property exists; later we use TryGetProperty when a file may be incomplete.

The `using` before JsonDocument is a **resource declaration**, unlike the `using System.Text.Json` namespace import. The document owns resources. A using declaration disposes them automatically when this scope ends, including if an exception interrupts it. It has the same purpose as Python's `with` cleanup. The JsonElement must be used while its document is alive.

Diagnostic experiment: remove a closing JSON brace inside the string and run. JsonException describes invalid syntax; it is not a quantity-range error. Restore the brace. Then use `true` as the value, predict its kind and run before restoring `"3"`.

```check
run "dotnet run --project JsonPractice" stdout="String" os=windows label="The quoted quantity is identified as text"
```

## Your turn: inspect two real input files

Write a program that accepts exactly one path argument. With any other count print `Give one JSON path.` and return. Read the file, parse it using a using declaration, obtain its Quantity property and print `Quantity kind: ` followed by ValueKind. Do not convert the value to an int yet: the point is to observe what the file actually says.

Run both supplied files. Then create a third sample with a boolean Quantity, predict and record its kind, and run your program on it. Explain why the characters 3 in two files do not establish that they have the same value type. Leave the provided samples unchanged.

```hints
nudge: The text-file exercise already demonstrated reading a path from args.
concept: Parse accepts the file's returned string. GetProperty selects Quantity; ValueKind describes it without numeric conversion.
shape: Guard args.Length, read the file, create the JsonDocument in a using declaration, select Quantity, then print its kind.
```

```check
run "dotnet run --project JsonPractice -- samples/number.json" stdout="Quantity kind: Number" os=windows label="Your parser sees an actual JSON number"
run "dotnet run --project JsonPractice -- samples/text-number.json" stdout="Quantity kind: String" os=windows label="Your parser distinguishes numeric-looking text"
run "dotnet run --project JsonPractice" stdout="Give one JSON path." os=windows label="Missing input is handled before reading"
```

The checks establish type inspection for these files; they do not establish that your program can accept incomplete or malicious files. The next lesson builds those guards, then asks you to implement the numeric reader yourself.
