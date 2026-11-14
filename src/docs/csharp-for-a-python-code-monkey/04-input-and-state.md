# 03 — Input changes state; drawing shows the result

```powershell
./src/docs/csharp-for-a-python-code-monkey/tetris/run.ps1 -Stage 03
```

Press Left and Right. The block stays within the board. The new handler is:

```csharp
private void Surface_KeyDown(object sender, KeyRoutedEventArgs e)
{
    if (e.Key == VirtualKey.Left && x > 0) x--;
    else if (e.Key == VirtualKey.Right && x < 9) x++;
    else return;
    e.Handled = true;
    Draw();
}
```

<details>
<summary>Complete runnable checkpoint source (expand when entering or comparing code)</summary>

These files use the shared project and application startup from setup. The command above selects this complete checkpoint.

`checkpoints/03/MainWindow.xaml`

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

`checkpoints/03/MainWindow.xaml.cs`

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
        if (e.Key == VirtualKey.Left && x > 0) x--;
        else if (e.Key == VirtualKey.Right && x < 9) x++;
        else return;
        e.Handled = true;
        Draw();
    }

    private void Surface_PointerPressed(object sender, PointerRoutedEventArgs e)
        => Surface.Focus(FocusState.Programmatic);

    private void Draw()
    {
        BoardCanvas.Children.Clear();
        DrawCell(x, y, 1);
        Status.Text = "Checkpoint 03";
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

## Walk one event through the program

Suppose `x` is 4. Windows delivers a keyboard message; WinUI raises `KeyDown` on the focused content. Our handler receives the event. For Left, the first condition is true, so `x--` changes the field to 3. `Draw()` clears the previous view and draws the block at `3 * 24 = 72`.

Compare Python:

```python
if key == LEFT and x > 0:
    x -= 1
elif key == RIGHT and x < 9:
    x += 1
else:
    return
draw()
```

`&&` means logical AND. `else if` fills the role of `elif`. `x++` increments by one, and `x--` decrements by one. `VirtualKey.Left` is a named enumeration member, avoiding a mysterious integer key code.

The parameters are supplied by WinUI. `sender` identifies the object raising the event. `e` contains the event information. We do not use `sender` yet, but the handler signature must match what the event expects.

`e.Handled = true` tells the event routing system that we handled this key. The early `return` means unrecognized keys are not claimed by this handler.

## Focus is part of the system

The XAML `UserControl` has `IsTabStop="True"`, a `KeyDown` handler, and a `Loaded` handler. On load we call:

```csharp
Surface.Focus(FocusState.Programmatic);
```

The pointer handler also restores that focus when you click the surface. A visible window and keyboard focus are different things. If keys stop working, inspect focus before rewriting the movement rules. See Microsoft's [keyboard events guide](https://learn.microsoft.com/en-us/windows/apps/develop/input/keyboard-events) for routed input behavior.

## Why 9 rather than 10?

Ten columns have indexes 0 through 9. At `x == 9`, moving right would produce the invalid column 10. The boundary check happens before mutation, so invalid state never gets committed.

Hold Right and inspect the result. Repeated key events come from the operating system's repeat settings; we have not implemented our own repeat timing.

## Exercise: move down manually

Add a Down branch immediately before `else return`. Predict the bottom boundary first.

**Answer:**

```csharp
else if (e.Key == VirtualKey.Down && y < 19) y++;
```

Twenty rows use indexes 0 through 19. Try the edge case by holding Down. Remove the `y < 19` check temporarily: the rectangle can move outside the visible board because a canvas does not enforce your game rules. Restore the check.

Next: [time and events](05-time-and-events.md).
