---
title: 1.1 — Your First C# Program
track: WinForms to React — C# for Python Scripters
trackOrder: 47
runtime: none
reference: optional
---

Build **FormDesk**, a small request-entry tool: enter a name and quantity, explain mistakes beside the fields, preview the request, and save or open it. Later, put a React form inside a separate Windows host while keeping the same C# rules. These are general desktop UI skills; no CAD software, add-in SDK, or earlier C# course is required.

You should already recognize Python variables, `if`, and functions. Knowing React's `useState` is enough for the later chapter. C# and React syntax are taught when needed. Follow the chapters in order in **one folder**; they share files. The Windows UI needs Windows and the **.NET 10 SDK**, which includes the compiler and development commands. A runtime alone cannot build your code. This modern .NET exercise is not a promise of compatibility with any particular add-in host; that host's target framework must be checked separately when you eventually integrate it.

## Prepare an empty folder

In Project Studio Desktop, select an empty folder called `form-desk`. A terminal command runs relative to that folder. The editor changes files; a command only sees changes after you save them. The browser edition can show these lessons; Desktop runs checks against your real files.

In the Windows PowerShell terminal, run:

```powershell
dotnet --list-sdks
```

Look for a `10.0` SDK. If absent, install the **SDK for Windows** from the [official .NET 10 download page](https://dotnet.microsoft.com/en-us/download/dotnet/10.0), then reopen the terminal. All commands in this series are typed into the terminal; close a GUI window to let its `dotnet run` command finish. Do not leave a window running while rebuilding its executable.

```check
run "dotnet --list-sdks" stdout="10.0." os=windows label="The .NET 10 SDK is available" -- Install an SDK, not only a runtime, then reopen the terminal.
```

## Make a console project

Run this once from `form-desk`:

```powershell
dotnet new console --framework net10.0 --output Scratch
```

`console` means a terminal application. `--output Scratch` creates its own folder. `Scratch.csproj` is an XML text file describing how to build the project. Its `.cs` files contain C# source. `dotnet` compiles source before executing it. Python usually executes through an interpreter; here the compiler catches many mistakes before the program starts.

Replace the generated `Scratch/Program.cs`:

```csharp file=Scratch/Program.cs
string name = "Fixture request";
int quantity = 3;
Console.WriteLine($"{name}: {quantity}");
```

`string` declares text and `int` declares a whole number. Unlike Python, the variable's type remains fixed. Quotes make a string; `3` without quotes is a number. C# ends these statements with semicolons. `Console.WriteLine` calls a method (C#'s name for a function belonging to a type). `$"...{quantity}..."` inserts a value into text, like Python's `f"...{quantity}..."`. Names are case sensitive.

Run `dotnet run --project Scratch`. Expect `Fixture request: 3`. Top-level statements are the program's entry point: .NET starts executing them from the top. We'll write an explicit `Main` entry point for the Windows application later.

```predict
question: If quantity becomes 4, which line will the program print?
choice: Fixture request: 4
choice: Fixture request: quantity
answer: Fixture request: 4
explain: Interpolation reads the value stored in quantity when WriteLine executes.
```

```check
run "dotnet run --project Scratch" stdout="Fixture request: 3" timeout=120 os=windows label="The first C# program builds and prints the request" -- Save Program.cs and restore quantity to 3.
```

## Diagnose a type error

Temporarily replace `int quantity = 3;` with `int quantity = "three";`. Predict whether any output will print. Run again: the compiler reports that a string cannot become an int. Read the file and line number in the diagnostic; don't chase the final "build failed" line. Restore `3` and rerun. Then remove one semicolon, observe the missing-semicolon diagnostic, and restore it.

This is a **compile error**: execution never began. A later wrong calculation with valid syntax is a **logic error** and needs behavioral checks. Explain that difference in your own words.

## Your turn: describe another request

Create a second console project, `Practice`, using the same `dotnet new` command with a different output folder. Write its `Program.cs` yourself. Declare the name `Inspection tray`, declare a whole-number quantity `6`, and print `Inspection tray: 6`. Change six to seven, predict and observe, then restore six.

```hints
nudge: Scratch is a model, but the second project's files must stay in their own folder.
concept: A string stores text, an int stores a whole number, and interpolation reads their values.
shape: Declare the two values, then make one WriteLine call using both variable names.
```

```check
run "dotnet run --project Practice" stdout="Inspection tray: 6" timeout=120 os=windows label="Your independent program prints its request" -- Create the Practice console project and save its Program.cs.
```

The checks establish that these programs compile and print the named examples. They do not prove you can explain types or that every possible input works. Keep your changed-value observation and explanation as learning evidence.
