# 04 — Falling without freezing the window

```powershell
./src/docs/csharp-for-a-python-code-monkey/tetris/run.ps1 -Stage 04
```

The block falls every half-second. You can still move it sideways. In the constructor we configure a retained timer:

```csharp
timer.Interval = TimeSpan.FromMilliseconds(500);
timer.Tick += (_, _) => StepDown();
Closed += (_, _) => timer.Stop();
```

`Surface_Loaded` starts it after the view exists. Each tick calls:

```csharp
private void StepDown()
{
    if (y < 19) y++;
    else timer.Stop();
    Draw();
}
```

<details>
<summary>Complete runnable checkpoint source (expand when entering or comparing code)</summary>

These files use the shared project and application startup from setup. The command above selects this complete checkpoint.

`checkpoints/04/MainWindow.xaml`

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

`checkpoints/04/MainWindow.xaml.cs`

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
        if (e.Key == VirtualKey.Left && x > 0) x--;
        else if (e.Key == VirtualKey.Right && x < 9) x++;
        else return;
        e.Handled = true;
        Draw();
    }

    private void Surface_PointerPressed(object sender, PointerRoutedEventArgs e)
        => Surface.Focus(FocusState.Programmatic);

    private void StepDown()
    {
        if (y < 19) y++;
        else timer.Stop();
        Draw();
    }

    private void Draw()
    {
        BoardCanvas.Children.Clear();
        DrawCell(x, y, 1);
        Status.Text = "Checkpoint 04";
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

## Why no loop and sleep?

A `while` loop in the window constructor would occupy the UI thread. Sleeping that thread prevents it from processing input and painting. The event-driven version returns control to WinUI between updates.

A `DispatcherTimer` schedules callbacks on the UI thread. Our keyboard handler, timer handler, and drawing methods execute there, one callback at a time. We have not created a background thread. Microsoft's [DispatcherTimer reference](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.dispatchertimer) describes that behavior.

## Translate the event syntax

`timer.Tick += handler` subscribes a callback. The lambda `(_, _) => StepDown()` is an anonymous function, similar in intent to `lambda sender, event: step_down()` in Python. These event arguments are unused, so we use discard parameter names.

`readonly` on the timer field means we do not assign a different timer object to that field after construction. It does not prevent changing the timer's properties or calling its methods.

`Closed` stops the timer when the window closes. Resource lifetime is part of behavior: callbacks should not keep doing work for a view that no longer exists.

## A timer is not an exact clock

At 500 ms per step, the requested speed is two rows per second. A busy UI thread can delay ticks. This simple game advances one row per callback; it does not make up missed simulation time. That is sufficient for this checkpoint. Later simulations may need elapsed-time measurement and a fixed-step accumulator.

## Trace the floor case

When a tick arrives at `y == 18`, the block moves to 19. At the next tick, the condition fails, the timer stops, and the block remains at 19. Left and Right still work because stopping this timer does not stop WinUI's event loop.

## Exercise: speed and ownership

Change the interval to 250 ms. Predict the requested speed, then run it.

**Answer:** four rows per second, subject to callback delays. Restore 500 ms. Then explain why `Draw()` should not itself advance `y`.

**Answer:** drawing may happen for reasons other than time passing, including a key press. If drawing changes the simulation, moving sideways could accidentally accelerate falling. We want explicit state changes followed by a view refresh.

Next: [pieces and rotation](06-pieces-and-rotation.md).
