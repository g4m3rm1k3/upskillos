# 06 — Remember the pieces that have landed

```powershell
./src/docs/csharp-for-a-python-code-monkey/tetris/run.ps1 -Stage 06
```

You now get repeated T pieces. They land on the floor or one another. Fill the spawning area and the game ends; R restarts. Rows do not clear yet.

The key addition is data that survives the next spawn:

```csharp
private readonly int[,] Board = new int[Height, Width];
```

This is a rectangular two-dimensional array. It is indexed as `Board[row, column]`, or `Board[y, x]`. New integer arrays contain zeroes. We use zero for empty and positive numbers for settled piece colors.

Python's approximate representation would be:

```python
board = [[0 for _ in range(width)] for _ in range(height)]
```

Do not translate Python's `[[0] * width] * height` literally: that creates repeated references to the same row. C#'s rectangular array is a different structure, not a list of row objects.

<details>
<summary>Complete runnable checkpoint source (expand when entering or comparing code)</summary>

These files use the shared project and application startup from setup. The command above selects this complete checkpoint.

`checkpoints/06/MainWindow.xaml`

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

`checkpoints/06/MainWindow.xaml.cs`

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

    public const int Width = 10;
    public const int Height = 20;
    private readonly int[,] Board = new int[Height, Width];
    private (int X, int Y)[] Cells = Array.Empty<(int, int)>();
    private int X;
    private int Y;
    private int Kind = 2;
    private bool GameOver;
    private readonly DispatcherTimer timer = new();

    private void Restart()
    {
        Array.Clear(Board);
        GameOver = false;
        Spawn();
    }

    private void Spawn()
    {
        Cells = new[] { (1, 0), (0, 1), (1, 1), (2, 1) };
        X = 3;
        Y = 0;
        GameOver = !Fits(Cells, X, Y);
    }
    public bool Fits((int X, int Y)[] candidate, int atX, int atY)
    {
        foreach (var cell in candidate)
        {
            int boardX = atX + cell.X;
            int boardY = atY + cell.Y;
            // Short-circuit || keeps the array access inside valid bounds.
            if (boardX < 0 || boardX >= Width || boardY < 0 || boardY >= Height
                || Board[boardY, boardX] != 0)
                return false;
        }
        return true;
    }


    private bool Move(int dx, int dy)
    {
        if (GameOver || !Fits(Cells, X + dx, Y + dy)) return false;
        X += dx;
        Y += dy;
        return true;
    }

    private void Rotate()
    {
        if (GameOver) return;
        var rotated = new (int X, int Y)[Cells.Length];
        for (int i = 0; i < Cells.Length; i++)
            rotated[i] = (2 - Cells[i].Y, Cells[i].X);
        if (Fits(rotated, X, Y)) Cells = rotated;
    }

    private void StepDown()
    {
        if (GameOver || Move(0, 1)) return;
        foreach (var cell in Cells) Board[Y + cell.Y, X + cell.X] = Kind + 1;
        Spawn();
    }

    public MainWindow()
    {
        InitializeComponent();
        AppWindow.Resize(new Windows.Graphics.SizeInt32(560, 580));
        Restart();
        timer.Interval = TimeSpan.FromMilliseconds(500);
        timer.Tick += (_, _) => { StepDown(); Draw(); };
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
        switch (e.Key)
        {
            case VirtualKey.Left: Move(-1, 0); break;
            case VirtualKey.Right: Move(1, 0); break;
            case VirtualKey.Up: Rotate(); break;
            case VirtualKey.Down: StepDown(); break;
            case VirtualKey.R: Restart(); break;
            default: return;
        }
        e.Handled = true;
        Draw();
    }

    private void Draw()
    {
        BoardCanvas.Children.Clear();
        for (int row = 0; row < Height; row++)
            for (int col = 0; col < Width; col++)
                if (Board[row, col] != 0) DrawCell(col, row, Board[row, col]);
        if (!GameOver)
            foreach (var cell in Cells) DrawCell(X + cell.X, Y + cell.Y, Kind + 1);
        Status.Text = GameOver ? "Game over - R to restart" : "Checkpoint 06";
    }

    private void Surface_PointerPressed(object sender, PointerRoutedEventArgs e)
        => Surface.Focus(FocusState.Programmatic);

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

## Keep the falling piece separate

The board stores settled pieces only. `Cells`, `X`, and `Y` describe the active piece. This means a movement check can examine the board without accidentally colliding with the piece's previous position.

`Draw()` now draws occupied board cells first, then overlays the active piece. Clearing the canvas erases the picture, not the board array. The next drawing reconstructs the same stack from data.

## Extend the existing fit rule

After calculating each candidate board coordinate, `Fits` now checks occupancy too:

```csharp
if (boardX < 0 || boardX >= Width || boardY < 0 || boardY >= Height
    || Board[boardY, boardX] != 0)
    return false;
```

C# evaluates `||` left to right and stops when a term is true. An invalid coordinate therefore returns false without accessing the array out of bounds. The ordering is part of correctness, not just formatting.

## What happens when falling fails?

The new `StepDown()` is:

```csharp
private void StepDown()
{
    if (GameOver || Move(0, 1)) return;
    foreach (var cell in Cells) Board[Y + cell.Y, X + cell.X] = Kind + 1;
    Spawn();
}
```

`Move` tries the proposal and returns whether it succeeded. If the game is over, nothing happens. If movement succeeds, we are finished for this tick. Otherwise the current position is the last valid one: copy its four cells into the board, then spawn a new active piece.

`Kind` is currently always 2 for the T; `Kind + 1` stores color index 3, leaving zero reserved for empty.

Read `Spawn()` in checkpoint 06. It resets the local shape and origin, then asks whether that new piece fits. A blocked spawn sets `GameOver`. We do not let the new piece overwrite existing cells.

## State transitions, without a framework

```text
active piece --valid step--> active piece one row lower
active piece --blocked step--> settled board cells + newly spawned piece
spawn        --blocked origin--> game over
game over    --R--> empty board + new active piece
```

You can model behavior clearly before introducing an enum or a state-machine library. Naming the transitions helps decide where code belongs and what must be checked.

The current version locks immediately on a failed downward step. It does not offer a lock-delay window. That is a simplified rule, not a timing bug.

## Exercise: reason about a collision

Suppose a local cell is `(1, 1)`, the piece origin is `(3, 17)`, and `Board[18, 4]` is occupied. Does the piece fit at that origin?

**Answer:** no. Translation gives `(4, 18)`, which indexes `Board[18, 4]`. Row and column are intentionally reversed relative to `(x, y)` notation.

Play until game over. Press arrows and Down, then R. Verify that movement is blocked after game over and restart removes all settled cells. Finally explain why clearing the canvas alone would not implement restart.

**Answer:** drawing objects are only a view. Restart must clear the stored board as well as reset the active piece and game-over flag.

Next: [clearing rows](08-clearing-rows.md).
