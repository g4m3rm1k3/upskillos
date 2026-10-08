---
title: What the computer executes and stores
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

Before debugging a typed language or graphics library, separate source text, compiled instructions, the running process, and stored data. This gives later error messages somewhere concrete to fit.

## Follow source through a process

Your .cs file contains characters. The compiler checks syntax and types and emits managed instructions plus metadata describing types and references. The .NET runtime loads those assemblies and generally compiles needed methods to machine instructions as they run, using just-in-time compilation. Other deployment modes exist; our ordinary dotnet run path does not require learning them first.

The operating system starts a process with its own address space and resources such as file handles. Threads are execution paths within that process and can share its memory. Closing a terminal is not a general proof that every child process stopped; later we explicitly own and close the game window. A process exit code communicates success or failure to its caller.

Follow one Console.WriteLine call: your entry method calls a library operation, which writes to an output stream; the terminal displays it. The terminal is not executing C# line by line. A compiler error prevents this new program from running. A runtime exception occurs after execution starts. An incorrect result may involve neither kind of error.

For each failure, identify its layer: command not found, missing project, incompatible assignment, divide-by-zero exception, wrong checkpoint count. This classification tells you what evidence to collect next.

## Distinguish bits, bytes, characters, and values

A bit has two possible states; eight bits form one byte. Integers and floating-point numbers interpret bit patterns differently. A 32-bit signed int occupies four bytes in its numeric representation; that does not mean every object holding an int occupies only four bytes because objects may include metadata and alignment.

Text requires an encoding from characters to bytes. C# string Length counts UTF-16 code units, not necessarily user-perceived characters. UTF-8 can use a different number of bytes for the same text. The example's é uses one UTF-16 code unit and two UTF-8 bytes. Other symbols and combined characters can span multiple code units too.

`sizeof(int)` asks for the primitive representation's size. Encoding.UTF8.GetByteCount computes the encoded byte count without writing a file. The dots select library members. Run and expect 4, 1, and 2 on separate lines. This matters later when save files contain text while graphics APIs expect numeric channel bytes: a file's byte count and a string's length measure different things.

Type this complete small experiment into `Scratch/Program.cs`, replacing its previous contents. Run `dotnet run --project Scratch` unless this step explicitly asks you to inspect a compiler failure. This experiment does not change the game files.

```csharp edit=Scratch/Program.cs mode=replace
Console.WriteLine(sizeof(int));
Console.WriteLine("é".Length);
Console.WriteLine(System.Text.Encoding.UTF8.GetByteCount("é"));
```

## Keep lifetime separate from scope and storage location

Scope determines where a name can be referenced in source. Lifetime determines how long its value or object remains available. An object may outlive the method that created it if another reachable reference still selects it. A call stack records active method invocations; it is not a list of every object in the program.

Managed garbage collection reclaims memory for unreachable managed objects. It does not mean “all resources disappear immediately when a variable goes out of scope.” Native graphics contexts, files, and similar resources need explicit ownership and cleanup. The first-window lesson uses finally to close its window even if drawing fails.

Avoid the shortcut “all value types live on the stack and all references live on the heap.” Value-type fields can live inside heap objects, and runtime optimizations affect placement. The reliable language rule for our reasoning is what assignment copies: the value's contents or a reference to an object. We will test that rule with two counters and policy rows.

