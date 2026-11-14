# 05 — A piece is four local coordinates

```powershell
./src/docs/csharp-for-a-python-code-monkey/tetris/run.ps1 -Stage 05
```

Move and rotate the purple T using Left, Right, and Up. Down advances it manually. It falls and stops at the floor; it does not yet become part of a stack.

The new representation is:

```csharp
private (int X, int Y)[] cells = { (1, 0), (0, 1), (1, 1), (2, 1) };
```

`(int X, int Y)` is a tuple of two integers with named components. `[]` makes this an array of tuples. Compare a Python list of coordinate tuples:

```python
cells = [(1, 0), (0, 1), (1, 1), (2, 1)]
```

C# arrays have a fixed length. Here we keep four entries and replace their values or replace the whole array when needed.

<details>
<summary>Complete runnable checkpoint source (expand when entering or comparing code)</summary>

These files use the shared project and application startup from setup. The command above selects this complete checkpoint.

`checkpoints/05/MainWindow.xaml`

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

`checkpoints/05/MainWindow.xaml.cs`

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
    private (int X, int Y)[] cells = { (1, 0), (0, 1), (1, 1), (2, 1) };
    private readonly DispatcherTimer timer = new();

    public MainWindow()
    {
        InitializeComponent();
        AppWindow.Resize(new Windows.Graphics.SizeInt32(560, 580));
        timer.Interval = TimeSpan.FromMilliseconds(500);
        timer.Tick += (_, _) => StepDown();
        Closed += (_, _) => timer.Stop();
    }

    private void Surface_Loaded(object sender, RoutedEventArgs e)
    {
        Surface.Focus(FocusState.Programmatic);
        Draw();
        timer.Start();
    }

    private void Surface_KeyDown(object sender, KeyRoutedEventArgs e)
    {
        if (e.Key == VirtualKey.Left && Fits(cells, x - 1, y)) x--;
        else if (e.Key == VirtualKey.Right && Fits(cells, x + 1, y)) x++;
        else if (e.Key == VirtualKey.Up)
        {
            var rotated = new (int X, int Y)[cells.Length];
            for (int i = 0; i < cells.Length; i++)
                rotated[i] = (2 - cells[i].Y, cells[i].X);
            if (Fits(rotated, x, y)) cells = rotated;
        }
        else if (e.Key == VirtualKey.Down) StepDown();
        else return;
        e.Handled = true;
        Draw();
    }

    private void Surface_PointerPressed(object sender, PointerRoutedEventArgs e)
        => Surface.Focus(FocusState.Programmatic);

    private bool Fits((int X, int Y)[] candidate, int atX, int atY)
    {
        foreach (var cell in candidate)
        {
            int boardX = atX + cell.X;
            int boardY = atY + cell.Y;
            if (boardX < 0 || boardX >= 10 || boardY < 0 || boardY >= 20)
                return false;
        }
        return true;
    }

    private void StepDown()
    {
        if (Fits(cells, x, y + 1)) y++;
        else timer.Stop();
        Draw();
    }

    private void Draw()
    {
        BoardCanvas.Children.Clear();
        foreach (var cell in cells) DrawCell(x + cell.X, y + cell.Y, 3);
        Status.Text = "Checkpoint 05";
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

## Local coordinates versus board coordinates

The shape occupies this three-by-three local box:

```text
       x=0  x=1  x=2
y=0     .    #    .
y=1     #    #    #
y=2     .    .    .
```

The window's `x` and `y` locate the origin of that box on the board. Each local cell becomes `(x + cell.X, y + cell.Y)` when drawn or checked. At origin `(4, 0)`, the occupied board cells are `(5, 0)`, `(4, 1)`, `(5, 1)`, and `(6, 1)`.

This is your first coordinate transformation: translation. The shape can move without rewriting its local geometry.

## Ask whether a proposed state is valid

We replace single-block boundary checks with:

```csharp
private bool Fits((int X, int Y)[] candidate, int atX, int atY)
{
    foreach (var cell in candidate)
    {
        int boardX = atX + cell.X;
        int boardY = atY + cell.Y;
        if (boardX < 0 || boardX >= 10 || boardY < 0 || boardY >= 20)
            return false;
    }
    return true;
}
```

`bool` is C#'s boolean type; its literals are `true` and `false`. `||` means OR. `foreach` visits every element, like Python's `for cell in candidate`.

The function returns false as soon as it finds an invalid cell. Reaching the end means every cell passed. Importantly, it checks a proposal without changing the live position.

Movement now asks `Fits(cells, x - 1, y)` before decrementing `x`. Falling asks `Fits(cells, x, y + 1)` before incrementing `y`. One rule serves multiple inputs.

## Rotation is a coordinate calculation

Inside a square of side length 3, a clockwise quarter-turn in our downward-Y coordinate system maps:

```csharp
rotated[i] = (2 - cells[i].Y, cells[i].X);
```

The general formula is `(size - 1 - oldY, oldX)`. Test it on `(1, 0)`: it becomes `(2, 1)`. Test `(0, 1)`: it becomes `(1, 0)`.

We allocate a candidate array and fill it using an index-based loop:

```csharp
var rotated = new (int X, int Y)[cells.Length];
for (int i = 0; i < cells.Length; i++)
    rotated[i] = (2 - cells[i].Y, cells[i].X);
if (Fits(rotated, x, y)) cells = rotated;
```

`Length` is the array's element count. The loop initializes `i`, checks its condition before each iteration, and increments it after the body. Compare `for i in range(len(cells))`.

We commit the new array only if it fits. Mutating each live cell before checking could leave half-rotated state after a failure. This **propose → validate → commit** sequence will also be useful for database edits.

## Exercise: trace and inspect

Rotate the four coordinates on paper, then press Up in the program. After four rotations, should the original coordinates return?

**Answer:** yes. A quarter-turn repeated four times is a full turn. For this starting T the first rotation produces `(2, 1)`, `(1, 0)`, `(1, 1)`, `(1, 2)` in the original array order.

Move near a wall and try rotating. A rejected rotation leaves the piece unchanged. We have not implemented a wall adjustment yet. That limitation becomes a deliberate requirement when we introduce all seven pieces.

Next: [stacking](07-stacking.md).
