# 02 — Draw one block: data coordinates become screen coordinates

```powershell
./src/docs/csharp-for-a-python-code-monkey/tetris/run.ps1 -Stage 02
```

Expected: one cyan block near the top of a dark board. Stage 02 adds a `Canvas` named `BoardCanvas` in XAML. Here is the essential new drawing operation, inside `DrawCell`:

```csharp
var rectangle = new Rectangle
{
    Width = 23,
    Height = 23,
    Fill = new SolidColorBrush(colors[color])
};
Canvas.SetLeft(rectangle, x * 24);
Canvas.SetTop(rectangle, y * 24);
BoardCanvas.Children.Add(rectangle);
```

Read the complete `checkpoints/02/MainWindow.xaml.cs` beside this lesson. The excerpt depends on the WinUI imports and the palette declared in that file.

<details>
<summary>Complete runnable checkpoint source (expand when entering or comparing code)</summary>

These files use the shared project and application startup from setup. The command above selects this complete checkpoint.

`checkpoints/02/MainWindow.xaml`

```xml
<Window x:Class="PythonMonkey.Tetris.MainWindow"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    Title="C# for a Python code monkey - Tetris">
  <UserControl x:Name="Surface" IsTabStop="True" Loaded="Surface_Loaded"
               KeyDown="Surface_KeyDown" PointerPressed="Surface_PointerPressed">
    <Grid Background="#101827" Padding="20" ColumnSpacing="24">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="Auto" />
        <ColumnDefinition Width="*" />
      </Grid.ColumnDefinitions>
      <Canvas x:Name="BoardCanvas" Width="240" Height="480"
              Background="#1F2937" VerticalAlignment="Top" />
      <StackPanel Grid.Column="1" Spacing="16" MinWidth="170">
        <TextBlock Text="TETRIS" FontSize="28" Foreground="White" />
        <TextBlock x:Name="Status" Foreground="White" TextWrapping="Wrap" />
        <TextBlock Foreground="#CBD5E1" TextWrapping="Wrap"
          Text="Arrows: move / turn&#10;Down: soft drop&#10;Space: hard drop&#10;P: pause&#10;R: restart&#10;&#10;Click the board to focus.&#10;Later controls unlock as you learn." />
      </StackPanel>
    </Grid>
  </UserControl>
</Window>
```

`checkpoints/02/MainWindow.xaml.cs`

```csharp
using Microsoft.UI;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Shapes;
using Windows.System;

namespace PythonMonkey.Tetris;

public sealed partial class MainWindow : Window
{
    private int x = 4;
    private int y = 0;

    public MainWindow()
    {
        InitializeComponent();
        AppWindow.Resize(new Windows.Graphics.SizeInt32(560, 580));
    }

    private void Surface_Loaded(object sender, RoutedEventArgs e)
    {
        Surface.Focus(FocusState.Programmatic);
        Draw();
    }

    private void Surface_KeyDown(object sender, KeyRoutedEventArgs e)
    {
        // Input is added in checkpoint 03.
    }

    private void Surface_PointerPressed(object sender, PointerRoutedEventArgs e)
        => Surface.Focus(FocusState.Programmatic);

    private void Draw()
    {
        BoardCanvas.Children.Clear();
        DrawCell(x, y, 1);
        Status.Text = "Checkpoint 02";
    }

    private void DrawCell(int x, int y, int color)
    {
        var colors = new[] { Colors.Transparent, Colors.Cyan, Colors.Yellow,
            Colors.MediumPurple, Colors.Orange, Colors.RoyalBlue,
            Colors.LimeGreen, Colors.Tomato };
        var rectangle = new Rectangle
        {
            Width = 23,
            Height = 23,
            Fill = new SolidColorBrush(colors[color])
        };
        Canvas.SetLeft(rectangle, x * 24);
        Canvas.SetTop(rectangle, y * 24);
        BoardCanvas.Children.Add(rectangle);
    }
}
```

</details>

## What happens when it runs

The window initializes its XAML. The `Surface_Loaded` handler runs when the content loads, focuses the input surface, and calls `Draw()`. `Draw()` clears old rectangles, reads the position fields, and calls `DrawCell(x, y, 1)`.

```csharp
private int x = 4;
private int y = 0;
```

These are fields: values retained by the window between method calls. `int` specifies an integer type. Unlike a dynamically typed Python variable, this field cannot later hold a string. `private` limits access to this type's implementation.

## Two coordinate systems

The board is ten columns by twenty rows. A cell is 24 device-independent units wide, so the drawing area is 240 by 480 units. WinUI units are not necessarily physical monitor pixels: display scaling affects that conversion.

The logical position `(4, 0)` becomes the drawing position `(96, 0)`. X increases rightward; Y increases downward. The 23-unit rectangles leave a one-unit gap between neighboring cells.

`Canvas.SetLeft` and `Canvas.SetTop` set **attached properties**: layout information the parent canvas uses to position a child. The rectangle itself does not know anything about board columns.

## C# syntax you just met

`var` asks the compiler to infer a local variable's type. `rectangle` is still a statically typed `Rectangle`; `var` does not make C# dynamically typed.

The braces after `new Rectangle` are an object initializer: construct an object, then set its properties. They do not create a Python dictionary. `SolidColorBrush` is an object describing how to fill an area. `colors[color]` selects a color from an array.

`BoardCanvas` becomes a generated C# field because its XAML element has `x:Name="BoardCanvas"`. This is one practical reason `InitializeComponent()` must run before drawing.

## Why erase and redraw?

For this small program, rebuilding the rectangles is easy to follow. If we later profile a real performance problem, we can keep rectangles and update them, or switch drawing APIs. For now, one rendering function gives us a reliable relationship: current state → current picture.

The rendered rectangle is not the authoritative position. The fields `x` and `y` are. This distinction becomes essential when we add collision detection.

## Predict and change

Set `x = 2` and `y = 3`. Where should the rectangle's top-left corner appear?

**Answer:** `(48, 72)` in canvas units. Change the fields and verify. Then change only the multiplier for X from 24 to 30. The logical board position remains `(2, 3)`, but the displayed X position becomes 60. You have changed the mapping, not the game state.

Restore the multiplier before continuing. Explain why storing a screen X position of 96 instead of a board column of 4 would complicate grid-based collision rules.

**Answer:** every grid operation would need to translate drawing units back into cells. Keeping the rules in cell coordinates avoids mixing game meaning with presentation size.

Next: [input and state](04-input-and-state.md).
