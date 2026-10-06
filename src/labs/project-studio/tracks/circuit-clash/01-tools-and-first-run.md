---
title: A terminal, a compiler, and your first execution
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: csharp
pedagogy: typed
console: true
---

You will build a native desktop C# game using .NET 10 and Raylib-cs 8.1.0. Raylib creates the window, reads devices, and submits geometry to the graphics driver. We will write the game rules, mesh construction, face lighting, camera movement, menus, persistence, and learning algorithm. The browser sample is a behavior reference; this course does not turn C# into a web game.

Use a desktop with a graphics display and the .NET **SDK**, not only the runtime. The SDK includes build tools. The runtime only executes compiled programs. The verified author environment is macOS on Apple silicon; the binding also ships native libraries for Windows and Linux. Their window systems and drivers still require testing on those platforms. Browser-only Project Studio can display these lessons, but cannot execute native .NET or open a Raylib desktop window. Use the desktop terminal or a local editor and terminal. No Java series is required.

## Choose a folder you own

Create a new empty folder named `CircuitClashLearning` and select it as your Project Studio project. Open its terminal. A terminal displays input and output; the shell interprets your command and launches a program. The current directory is the base for relative paths such as `Scratch/Program.cs`. All commands in this course run from this learning folder, not from the UpSkillOS application's repository.

Install .NET 10 SDK from [Microsoft's SDK download page](https://dotnet.microsoft.com/en-us/download/dotnet/10.0). Follow the installer for your operating system and processor. Close and reopen the terminal so it sees the executable search path. Run `dotnet --info`. Confirm an installed 10.x SDK and the expected architecture. A “command not found” error means the shell cannot locate the executable; it says nothing about your C# code. A runtime listed without an SDK cannot build this project.

Create a directory named `Scratch` using the file tree. We will use it for small complete experiments before creating the game's separate projects. Do not use the single-file Run button for the finished game; its dependencies span projects. The terminal commands explicitly select the correct project.

## Describe a build, not a program

A `.csproj` file tells the .NET build system what to compile. XML uses opening and closing tags; a closing tag begins with `/`. An attribute such as `Sdk="Microsoft.NET.Sdk"` chooses the build tasks. `OutputType` set to `Exe` requests a runnable program; `TargetFramework` selects the library/runtime contract. `net10.0` is a framework identifier, not the SDK patch version.

`ImplicitUsings` makes common library namespaces available, including `System`, which contains `Console`. `Nullable` enables warnings when code may use a missing reference. These settings do not write game logic. The SDK includes `.cs` files beneath this project's folder automatically. Keeping Scratch separate prevents its entry point being compiled into Game.

Type this fragment in `Scratch/Scratch.csproj`. Start or replace this file.

```xml edit=Scratch/Scratch.csproj mode=replace
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
```

## Execute one observable instruction

`Console` names a library type. The dot selects its `WriteLine` method. Parentheses supply arguments; the quoted characters form a string, a text value. The semicolon terminates this statement. The program writes one line to standard output, which the terminal displays.

C# permits top-level statements: the compiler creates the entry method around them. This is not code running before the program starts. The launcher enters that generated method and executes the statement. Only one source file in an executable project can contain these top-level statements.

Type the line, save, then run `dotnet run --project Scratch`. The option `--project` identifies which project to build and execute. On its first run, .NET restores dependencies, compiles source into managed instructions, then the runtime loads and executes them. Compilation must succeed before the edited program can run. Expect `Circuit Clash workshop`. Change the text and run again to establish that you are executing your saved file.

Type this fragment in `Scratch/Program.cs`. Start or replace this file.

```csharp edit=Scratch/Program.cs mode=replace
Console.WriteLine("Circuit Clash workshop");
```

## Diagnose the stage that failed

Remove the closing quote and run again. The compiler should report a string/syntax diagnostic and a failed build. Restore it. Next change `WriteLine` to `Writeline`: names are case-sensitive, so lookup fails even though the punctuation is valid. Restore it and run successfully.

Now run `dotnet run --project Missing`. That failure concerns a project path, before compilation. Diagnose from the first relevant error, the path, and the failing stage. Do not install random packages to solve a spelling error. Record the exact command, expected output, observed output, and smallest change that reproduces a failure. That habit scales to a renderer and a deployed service alike.

```check
run "dotnet run --project Scratch" exit=0 stdout="Circuit Clash workshop" timeout=120
```

## Challenge — return to this later

This is optional. You can continue without completing it; no later guided step depends on your solution. Keep your attempt and revisit it.

Without looking at the original, recreate the one-line program in a separate scratch project and explain the roles of the shell, SDK, compiler, runtime, and Console. If a cached executable prints old text, which evidence would prove the edited source actually compiled?

