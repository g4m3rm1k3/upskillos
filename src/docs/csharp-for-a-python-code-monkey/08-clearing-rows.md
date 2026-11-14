# 07 — Clear rows without skipping their neighbors

```powershell
./src/docs/csharp-for-a-python-code-monkey/tetris/run.ps1 -Stage 07
```

The game still uses T pieces, but completed rows now disappear. The downward-step handler calls `ClearRows()` after storing the landed piece and before spawning another.

Here is the whole algorithm:

```csharp
public int ClearRows()
{
    int write = Height - 1;
    int cleared = 0;
    for (int read = Height - 1; read >= 0; read--)
    {
        bool full = true;
        for (int col = 0; col < Width; col++)
            if (Board[read, col] == 0) full = false;
        if (full)
        {
            cleared++;
            continue;
        }
        for (int col = 0; col < Width; col++)
            Board[write, col] = Board[read, col];
        write--;
    }
    for (; write >= 0; write--)
        for (int col = 0; col < Width; col++) Board[write, col] = 0;
    return cleared;
}
```

<details>
<summary>Complete runnable checkpoint source (expand when entering or comparing code)</summary>

These files use the shared project and application startup from setup. The command above selects this complete checkpoint.

`checkpoints/07/MainWindow.xaml`

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

`checkpoints/07/MainWindow.xaml.cs`

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
        ClearRows();
        Spawn();
    }
    public int ClearRows()
    {
        int write = Height - 1;
        int cleared = 0;
        for (int read = Height - 1; read >= 0; read--)
        {
            bool full = true;
            for (int col = 0; col < Width; col++)
                if (Board[read, col] == 0) full = false;
            if (full)
            {
                cleared++;
                continue;
            }
            for (int col = 0; col < Width; col++) Board[write, col] = Board[read, col];
            write--;
        }
        for (; write >= 0; write--)
            for (int col = 0; col < Width; col++) Board[write, col] = 0;
        return cleared;
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
        Status.Text = GameOver ? "Game over - R to restart" : "Checkpoint 07";
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

## Two indexes have different jobs

`read` visits each original row from bottom to top. `write` identifies where the next surviving row belongs. A full row is skipped. A non-full row is copied to `write`, then `write` moves upward.

This is **compaction**: retain selected elements while closing gaps. The same idea appears when removing invalid records from a buffer or filtering values in place.

`continue` skips the rest of this iteration. It does not end the whole loop. `return cleared` ends the function and provides a count; we will use that count for scoring later.

## Trace a smaller board

Use four columns on paper. Letters represent occupied cells:

```text
Before, top to bottom:     After:
....                      ....
..A.                      ....
BBBB                      ....
CCCC                      ..A.
```

Start `read = 3`, `write = 3`. Row C is full: skip it, leaving `write` at 3. Row B is also full: skip it too. Row A survives: copy it from row 1 to row 3, then decrement `write` to 2. The empty row 0 survives and is copied to row 2. Finally zero the remaining rows 1 and 0.

## Why bottom to top?

During this algorithm, the destination is at or below the source. Copying down into an already-read row cannot destroy a source we still need. With the wrong traversal direction, an in-place copy can overwrite unread data.

The invariant is: **rows below `write` already contain the surviving processed rows in their final order**. Each iteration preserves that statement.

An alternative that deletes a row and then increments its index can accidentally skip the adjacent row that just moved into its place. Separating reading from writing avoids that trap.

## Cost

For board height H and width W, scanning and copying take O(H × W) time. There is no second board allocation; the extra working storage is O(1). These describe how work and storage grow with input size, not a claim that this must be the fastest implementation on every machine.

## Exercise: make the check easy to reproduce

In checkpoint 07's constructor, immediately after `Restart()`, temporarily add:

```csharp
for (int col = 0; col < Width; col++)
{
    Board[19, col] = 1;
    Board[18, col] = 2;
}
Board[17, 3] = 5;
ClearRows();
```

Predict the result before launching.

**Answer:** the two full rows disappear. The single cell originally at row 17, column 3 appears at row 19, column 3. No full row should remain, and the vacated top rows should be empty. Remove the temporary setup afterward.

This is a reproducible fixture: controlled initial data that makes a behavior observable. Later we will express the same check without opening a window.

Next: [seven pieces](09-seven-pieces.md).
