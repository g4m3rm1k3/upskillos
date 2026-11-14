# 01 — The smallest running window

Run:

```powershell
./src/docs/csharp-for-a-python-code-monkey/tetris/run.ps1 -Stage 01
```

The complete window markup is:

```xml
<Window x:Class="PythonMonkey.Tetris.MainWindow"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="01 - A running WinUI program">
  <TextBlock Text="Hello, Python code monkey." FontSize="28"
             HorizontalAlignment="Center" VerticalAlignment="Center" />
</Window>
```

Its C# companion, `checkpoints/01/MainWindow.xaml.cs`, is:

```csharp
using Microsoft.UI.Xaml;

namespace PythonMonkey.Tetris;

public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }
}
```

These files use the shared application shell explained in setup. Create no extra registration files: the checked-in project already selects this checkpoint.

<details>
<summary>Complete runnable checkpoint source (expand when entering or comparing code)</summary>

These files use the shared project and application startup from setup. The command above selects this complete checkpoint.

`checkpoints/01/MainWindow.xaml`

```xml
<Window x:Class="PythonMonkey.Tetris.MainWindow"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="01 - A running WinUI program">
  <TextBlock Text="Hello, Python code monkey." FontSize="28"
             HorizontalAlignment="Center" VerticalAlignment="Center" />
</Window>
```

`checkpoints/01/MainWindow.xaml.cs`

```csharp
using Microsoft.UI.Xaml;

namespace PythonMonkey.Tetris;

public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }
}
```

</details>

## Read the C# using what you know

`using Microsoft.UI.Xaml;` makes names from that namespace available. It is closer to importing names for lookup than executing Python's `import` machinery. `namespace PythonMonkey.Tetris;` groups our types and avoids collisions with other libraries.

`class MainWindow : Window` derives from the framework's window type. Compare Python's `class MainWindow(Window):`. A constructor has the class's name and no return type. Its role resembles `__init__`; C# does not require writing `self` for every field or method access.

`public` controls accessibility. `sealed` prevents subclasses of our window. `partial` allows the XAML-generated code and your handwritten code to contribute to one class. Neither word is a design pattern to apply everywhere.

`InitializeComponent()` loads the UI defined in XAML and connects generated members and event handlers. Remove it and the markup is not initialized. Curly braces group statements where Python uses indentation; semicolons terminate these statements.

## What starts this constructor?

Open the shared `App.xaml.cs`:

```csharp
private Window? window;

protected override void OnLaunched(LaunchActivatedEventArgs args)
{
    window = new MainWindow();
    window.Activate();
}
```

This excerpt lives inside the `App` class. `new MainWindow()` constructs the window; `Activate()` displays and activates it. The field retains our reference. `Window?` allows a null value before launch. `override` means the framework calls our replacement for an inherited method at the appropriate lifecycle point.

The call path is: generated entry point starts WinUI → WinUI launches `App` → `OnLaunched` creates `MainWindow` → its constructor initializes XAML → the window is activated. After that, Windows events drive the application. We do not write a blocking `while True` loop in the constructor.

## XAML is object construction

`TextBlock` displays text. `Text`, `FontSize`, and the alignment attributes set properties on that object. `x:Class` ties this document to the C# class. The namespace URLs identify XAML vocabularies; the application does not download those URLs to draw a window.

## Make a change

Change the greeting and font size in checkpoint 01. Close the window, run stage 01 again, and verify both changes appear. Then deliberately misspell `TextBlock` and build.

**Expected observation:** invalid XAML fails during the build. Restore the spelling. This is an early example of a tool catching a mistake before execution.

**Explain before moving on:** which file controls the greeting, which method constructs the window, and why does the application stay open after the constructor returns?

**Answer:** the XAML controls the greeting; `App.OnLaunched` constructs the window; WinUI's event loop continues processing window messages after our initialization methods return.

Next: [draw one block](03-draw-a-block.md).
