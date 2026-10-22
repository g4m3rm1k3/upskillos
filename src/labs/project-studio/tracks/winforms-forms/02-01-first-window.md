---
title: 2.1 — Your first Windows form
track: FormDesk — Windows Forms
trackOrder: 47.01
runtime: none
reference: optional
support: FormDesk/Program.cs, UiChecks/UiChecks.csproj, UiChecks/Program.cs
---

You already have `Core/Core.csproj` and its `RequestDraft` and `RequestRules`. This chapter gives those rules a Windows interface. Given an empty window, you will be able to change its caption and minimum size and explain which code runs at startup. Use Windows and the .NET 10 SDK from chapter 1.

These are standalone practice forms. There is no Mastercam dependency. Later interface work can call the same Core rules.

## Create the Windows project

Create the provided project and support files. A `.csproj` describes how C# files in its folder are compiled. `UseWindowsForms` adds the Windows control library; `net10.0-windows` deliberately targets Windows. The reference points at the Core project from the previous chapter.

```xml file=FormDesk/FormDesk.csproj provided
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net10.0-windows</TargetFramework>
    <UseWindowsForms>true</UseWindowsForms>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="../Core/Core.csproj" />
  </ItemGroup>
</Project>
```

Open the supplied `FormDesk/Program.cs`. `Main` is the startup method .NET calls. The square brackets in `[STAThread]` attach a setting to Main: Windows UI services require this single-threaded apartment. `ApplicationConfiguration.Initialize()` applies the normal WinForms defaults, including high-DPI support. `Application.Run(new MainForm())` creates our window and runs the event loop that keeps it responsive until it closes. The supplied `internal static class Program` is startup plumbing: internal limits visibility to this compiled project, and static means no Program object is needed.

The `UiChecks` console project is supplied testing code, not a second application to learn. It creates real controls on an STA thread without displaying windows. Checks can inspect properties and raise button click events; they do not prove appearance or physical keyboard behavior.

## Open one window

A `class` describes the objects we can create. `public class MainForm : Form` says MainForm is a kind of Windows `Form`; the colon gives it the base Form's behavior, including closing and resizing. A constructor has the class's name and no return type. `new MainForm()` runs this constructor.

`Text` and `ClientSize` are inherited properties. `new Size(480, 280)` creates a width-and-height value measured in logical pixels, excluding the title bar.

```predict
question: If you change only Text, which part changes?
choice: The window caption
choice: The C# filename
answer: The window caption
explain: Text is the form's caption property. It does not rename MainForm.cs or the MainForm class.
```

```csharp file=FormDesk/MainForm.cs
namespace FormDesk;

public class MainForm : Form
{
    public MainForm()
    {
        Text = "FormDesk";
        ClientSize = new Size(480, 280);
    }
}
```

In **Windows PowerShell**, from the shared project folder:

```powershell
dotnet run --project FormDesk/FormDesk.csproj
```

A blank FormDesk window should appear. Move it, resize it, and close it with the title-bar X. The terminal returns when the application exits. Explain why MainForm's constructor finishing did not immediately end the program.

**Diagnostic experiment:** remove the colon and `Form` from the class declaration, save, and run again. The build should report that properties such as Text do not exist and that MainForm is not a Form. Start with the first compiler error at the changed declaration; many later errors have the same cause. Restore `: Form`, save, and run again. Close the working window before checking.

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- window" stdout="PASS window" timeout=120 os=windows label="The form constructs with its caption and client size"
```

This check establishes construction and the inspected properties. Your manual run establishes that a window can actually open and close on this Windows installation.

### Optional: recognize the visual designer

Visual Studio can generate control-construction code through its drag-and-drop designer. The guided FormDesk project writes that code explicitly so you can follow what executes. To compare the approaches, use a separate scratch project:

```powershell
dotnet new winforms --framework net10.0 --output DesignerPractice
```

With Visual Studio 2026 and its .NET desktop development workload installed, open `DesignerPractice/DesignerPractice.csproj`, then open Form1 in the designer. Drag a Label from Toolbox and change its Text in Properties. Save and inspect `Form1.Designer.cs`: the designer wrote property assignments. `Form1.cs` calls `InitializeComponent()` to apply them. Both files declare a `partial` class, meaning the compiler combines them into one Form1 type. Put your behavior in Form1.cs and let the designer manage its own file. Leave FormDesk unchanged during this comparison. Microsoft's [designer tutorial](https://learn.microsoft.com/en-us/dotnet/desktop/winforms/get-started/create-app-visual-studio) walks through the windows and tool panels.

After learning events in lesson 2.3, revisit this scratch form: double-click a button's Click event in Properties, inspect the generated handler subscription, and compare it with our explicit `+=`. This optional exercise has no automatic check; run the scratch window and explain which code produced the visible label.

## Your turn: make the request window recognizable

Change the caption to **FormDesk — New request**. Prevent resizing below an outer window size of **500 by 320** using the Form's `MinimumSize` property; it takes a Size just as ClientSize does. Make this change yourself.

Run the application and try dragging it narrower and shorter. Record the smallest observed size, explain why MinimumSize and ClientSize are different properties, and design one extra test, such as maximizing and restoring the window. Record what happened in your learning notes.

```hints
nudge: Both settings belong to the existing constructor; you do not need a second class.
concept: Assign to the caption property, then assign a newly created width-and-height value to MinimumSize.
shape: Keep the current client size. Use the requested caption for Text and the requested outer bounds for MinimumSize.
```

```check
run "dotnet run --project UiChecks/UiChecks.csproj -- window-task" stdout="PASS window-task" timeout=120 os=windows label="The request caption and minimum size are configured"
```

The check inspects the two properties. It does not drag the window or judge its appearance on a high-DPI display.
