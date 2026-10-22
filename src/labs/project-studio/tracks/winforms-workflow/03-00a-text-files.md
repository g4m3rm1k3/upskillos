---
title: 3.0a — A File Is Text That Survives Closing
track: WinForms to React — Save, Open and Recover
trackOrder: 47.02
runtime: none
reference: optional
support: FilePractice/FilePractice.csproj, samples/name.txt
---

You can now collect values in a form. Before connecting a file dialog, find out what saving actually does. By the end you will independently read a name from one file, trim it and write another file. Continue in the same form-desk folder after the native form chapter. Only Windows and .NET are needed.

## Prepare a small experiment

Create the supplied note and its support files. FilePractice is a separate console program; it cannot change your form's controls. Its project settings are the same console settings used in chapter 1. The sample file deliberately contains spaces around a name.

```text file=text-file-guide.txt provided
Save all files before running dotnet commands from the form-desk root.
FilePractice is an experiment; FormDesk remains the Windows application.
samples/name.txt is supplied input, not a C# source file.
```

## Write, close the program, then read

Python's open/write operations have a .NET counterpart. `File.WriteAllText(path, text)` creates a text file or replaces an existing one. `File.ReadAllText(path)` returns the whole file as a string. These convenience methods open and close the file for you.

```csharp file=FilePractice/Program.cs
File.WriteAllText("file-experiment.txt", "Fixture");
string recovered = File.ReadAllText("file-experiment.txt");
Console.WriteLine(recovered);
```

Run `dotnet run --project FilePractice`. Open file-experiment.txt in the editor and inspect its actual contents. Both paths are relative to the **terminal's current folder**, not to the Program.cs folder. Our checks run from the shared project root.

```predict
question: After the program exits, does file-experiment.txt still contain Fixture?
choice: Yes, the file persists
choice: No, it was a local variable
answer: Yes, the file persists
explain: recovered is temporary program memory. The write copied text into a separate filesystem object which survives process exit.
```

```check
run "dotnet run --project FilePractice" stdout="Fixture" timeout=120 os=windows label="Text is written and read by the running program"
```

Diagnostic experiment: close the program, change the file to `Tray` in the editor, then rerun. It prints Fixture again because the first line overwrites the file. Temporarily remove the WriteAllText line, save and run: now the editor's change survives. Explain which line replaced it, then restore the reference before continuing. Use only the named experiment file.

## Explain a missing file without hiding it

ReadAllText can fail. `try` surrounds the operation; `catch (FileNotFoundException failure)` runs only when that exception occurs. An exception interrupts the normal flow, like a Python exception. The failure variable contains details such as Message. This example reports a known file failure instead of silently replacing it with an empty name.

```csharp file=FilePractice/Program.cs
try
{
    string recovered = File.ReadAllText("not-created-by-this-lesson.txt");
    Console.WriteLine(recovered);
}
catch (FileNotFoundException failure)
{
    Console.WriteLine("The source file is missing.");
    Console.WriteLine(failure.Message);
}
```

Run it. Predict whether WriteLine inside try executes when reading fails. Create the missing file yourself, rerun and compare the two paths, then remove only that temporary experiment file. We will later distinguish unreadable files, invalid JSON and invalid request values; one catch does not mean every possible failure was handled.

```check
run "dotnet run --project FilePractice" stdout="The source file is missing." os=windows label="The missing-file path produces an explanation" -- Remove only the experiment file if you created it.
```

## Your turn: read one path and write another

Replace the experiment program yourself. Accept exactly two command-line arguments: source path and destination path. With any other argument count print `Give source and destination paths.` and return before reading or writing. With two arguments, read the source, trim outside whitespace, write the trimmed text to the destination, then print it. Use args.Length and args[0]/args[1] from chapter 1. For now a missing source may throw; do not invent an empty successful result.

Run it on samples/name.txt and copy-name.txt. Inspect the destination as well as terminal output. Choose another short name with spaces, repeat, and explain why printing a trimmed value without writing it is insufficient. Restore the supplied sample before checking.

```hints
nudge: Separate the argument-count decision from the successful read/transform/write path.
concept: ReadAllText returns a string. Trim returns a new string; it does not modify the saved source.
shape: Guard the argument count, read args[0], store its trimmed text, write that text to args[1], then print the same text.
```

```check
run "dotnet run --project FilePractice -- samples/name.txt copy-name.txt" stdout="Fixture" os=windows label="Your program reads the supplied source and reports the name"
run "if ((Get-Content -Raw copy-name.txt) -ne 'Fixture') { throw 'The saved text must be exactly Fixture.' }" os=windows label="The destination actually contains trimmed text"
run "dotnet run --project FilePractice" stdout="Give source and destination paths." os=windows label="Missing arguments take the guard path"
```

Get-Content in the supplied PowerShell check reads the actual output file. The checks establish these examples, not protection from an unwanted destination overwrite. Always choose a disposable output filename in your practice folder. Later the Save dialog asks the user before overwriting.
