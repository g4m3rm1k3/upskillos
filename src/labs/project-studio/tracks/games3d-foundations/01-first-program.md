---
title: Run C# before opening a graphics window
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

A scene editor still begins with a program you can run and change. You will identify what compiles your text, what executes it and which saved file produced the output.

## Find the SDK and choose the working folder

Select your empty Studio3DLearning folder in Project Studio and open its terminal. A terminal shows text input and output. The shell reads a command and launches a program. The working folder is the base for relative paths like Scratch/Program.cs.

Run `dotnet --list-sdks` and `dotnet --list-runtimes`. These lessons target **net8.0**: have the .NET 8 SDK and runtime installed, or a newer SDK plus the .NET 8 runtime. The SDK includes the compiler and build tools; the runtime alone cannot build your source. This target matches Project Studio's managed .NET baseline and the rendering binding used later. Circuit Clash's net10.0 project is a separate build and is not changed here.

If dotnet is not found or the required SDK/runtime is absent, use [Microsoft's .NET downloads](https://dotnet.microsoft.com/download/dotnet/8.0), install the SDK for your operating system and reopen the terminal. Do not continue by pretending a failed command succeeded. Record the versions you actually have.

Create a Scratch folder inside your learning folder. It will hold experiments, not the eventual editor. We author project files directly so there is no generated application code to interpret first.

## Describe how to build a console program

Create Scratch/Scratch.csproj. The file is XML: angle-bracket tags describe properties. Sdk selects Microsoft's C# build tools. OutputType Exe requests an executable; TargetFramework chooses the runtime API. ImplicitUsings makes common namespaces such as System available; Nullable enables diagnostics about possibly missing references. A namespace groups related type names.

```xml edit=Scratch/Scratch.csproj mode=replace
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
```

## Execute a visible instruction

Create Scratch/Program.cs. Console.WriteLine calls a function that prints text. A string is quoted text; a semicolon ends the instruction. This file uses top-level statements: C# supplies the entry-point wrapper, so you can begin with one instruction.

```csharp edit=Scratch/Program.cs mode=replace
Console.WriteLine("My 3D studio starts here");
```

Save, then run `dotnet run --project Scratch`. The project option identifies the directory containing the build description. Restore resolves build dependencies, compilation checks and translates your source, then the runtime executes the result. First-run output may include SDK information; the important line is My 3D studio starts here.

```check
run "dotnet run --project Scratch" exit=0 stdout="My 3D studio starts here" timeout=120
```

Change here to today, save and run again. The changed output is evidence that the saved source was built. Restore the shown text before using Check my work.

## Use three coordinates and an explicit unit

A position in our world has an X, Y and Z coordinate. We choose X for right/left, Y for height and Z for the other horizontal direction. A coordinate is a signed distance from an origin; its meaning comes from our chosen axes. We use one world unit as one metre for these exercises.

float holds an approximate fractional number; f after a number makes that literal a float. The equals sign assigns a value. The += operator reads, adds and stores. Multiplying metres per second by seconds yields metres. The dollar sign enables string interpolation, inserting expressions in braces; F2 displays two decimal places without changing the stored value.

```predict
question: What is X after moving at 2 metres per second for half a second, starting at X=1?
answer: 2
explain: Displacement is 2 times 0.5, or 1 metre. Add it to the starting coordinate 1. Y and Z are not assigned again, so they stay unchanged.
```

```csharp edit=Scratch/Program.cs mode=replace
float x = 1f;
float y = 0.5f;
float z = 0f;
float speed = 2f;
float seconds = 0.5f;
x += speed * seconds;
Console.WriteLine(FormattableString.Invariant($"position=({x:F2}, {y:F2}, {z:F2})"));
```

FormattableString.Invariant prints numeric punctuation consistently across computer locales; it is a display decision. Expect position=(2.00, 0.50, 0.00).

```check
run "dotnet run --project Scratch" exit=0 stdout="position=(2.00, 0.50, 0.00)" timeout=120
```

## Diagnose division before storing its result

Temporarily change seconds to `1 / 2`. Predict, then run. Both operands are integers, so division produces zero before conversion to float. Change it to `1f / 2` and run; the fractional result restores motion. Also remove a closing quote once, read the compiler diagnostic and repair it. A compiler error and a valid program with the wrong numeric result need different investigations.

Restore seconds to 0.5f. Checks verify this specific printed position; they do not prove an editor exists, graphics work or motion is accurate under every time step.

## Independent task: move another axis

Use a separate Practice folder with its own project file and Program.cs so later required code does not depend on your experiment. Start at Z=-2; move at 3 metres per second for 0.25 seconds. Print all three coordinates and explain why Z becomes -1.25 while X and Y stay unchanged. Add a second case where elapsed time is zero, then a case with negative velocity. Predict each result before running.

```hints
nudge: Write the starting position and the displacement separately. Which coordinate should be assigned?
concept: A signed velocity permits movement in either direction. The formula is the old coordinate plus velocity times elapsed time.
shape: Copy the tiny project description into Practice, declare the three coordinates, update only z and print them. Repeat with zero time and negative velocity, comparing each result with your handwritten calculation.
```
