# 09 — Finish the playable game

```powershell
./src/docs/csharp-for-a-python-code-monkey/tetris/run.ps1 -Stage 09
```

Arrows move/rotate, Down soft-drops, Space hard-drops, P pauses, and R restarts. Score, lines, and level appear beside the board. Switching away pauses automatically.

This checkpoint still keeps the rules in the window. The new features reuse existing operations rather than introducing a framework.

<details>
<summary>Complete runnable checkpoint source (expand when entering or comparing code)</summary>

These files use the shared project and application startup from setup. The command above selects this complete checkpoint.

`checkpoints/09/MainWindow.xaml`

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

`checkpoints/09/MainWindow.xaml.cs`

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
    public int[,] Board { get; } = new int[Height, Width];
    public (int X, int Y)[] Cells { get; private set; } = Array.Empty<(int, int)>();
    public int X { get; private set; }
    public int Y { get; private set; }
    public int Kind { get; private set; }
    public int Score { get; private set; }
    public int Lines { get; private set; }
    public int Level => Lines / 10 + 1;
    public bool GameOver { get; private set; }
    public bool Paused { get; private set; }
    public int DropMilliseconds => Math.Max(100, 600 - (Level - 1) * 45);

    private readonly Random random = new();
    private readonly Queue<int> bag = new();

    private static readonly (int X, int Y)[][] Shapes =
    {
        new[] { (0, 1), (1, 1), (2, 1), (3, 1) }, // I: 4x4 box
        new[] { (0, 0), (1, 0), (0, 1), (1, 1) }, // O: no rotation
        new[] { (1, 0), (0, 1), (1, 1), (2, 1) }, // T
        new[] { (2, 0), (0, 1), (1, 1), (2, 1) }, // L
        new[] { (0, 0), (0, 1), (1, 1), (2, 1) }, // J
        new[] { (1, 0), (2, 0), (0, 1), (1, 1) }, // S
        new[] { (0, 0), (1, 0), (1, 1), (2, 1) }  // Z
    };

    public void Restart()
    {
        Array.Clear(Board);
        bag.Clear();
        Score = 0;
        Lines = 0;
        Paused = false;
        GameOver = false;
        Spawn();
    }

    private void Spawn()
    {
        if (bag.Count == 0)
        {
            int[] kinds = { 0, 1, 2, 3, 4, 5, 6 };
            // Fisher-Yates: each remaining position is equally likely.
            for (int i = kinds.Length - 1; i > 0; i--)
            {
                int j = random.Next(i + 1);
                (kinds[i], kinds[j]) = (kinds[j], kinds[i]);
            }
            foreach (int kind in kinds) bag.Enqueue(kind);
        }
        Kind = bag.Dequeue();
        Cells = ((int X, int Y)[])Shapes[Kind].Clone();
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

    public bool Move(int dx, int dy)
    {
        if (Paused || GameOver || !Fits(Cells, X + dx, Y + dy)) return false;
        X += dx;
        Y += dy;
        return true;
    }

    public void Rotate()
    {
        if (Paused || GameOver || Kind == 1) return;
        int size = Kind == 0 ? 4 : 3;
        var rotated = new (int X, int Y)[Cells.Length];
        for (int i = 0; i < Cells.Length; i++)
            rotated[i] = (size - 1 - Cells[i].Y, Cells[i].X);
        // Small horizontal kicks; intentionally not official SRS rotation.
        foreach (int offset in new[] { 0, -1, 1, -2, 2 })
        {
            if (!Fits(rotated, X + offset, Y)) continue;
            Cells = rotated;
            X += offset;
            return;
        }
    }

    public void StepDown(bool softDrop = false)
    {
        if (Paused || GameOver) return;
        if (Move(0, 1))
        {
            if (softDrop) Score++;
            return;
        }
        LockPiece();
    }

    public void HardDrop()
    {
        if (Paused || GameOver) return;
        while (Move(0, 1)) Score += 2;
        LockPiece();
    }

    private void LockPiece()
    {
        foreach (var cell in Cells) Board[Y + cell.Y, X + cell.X] = Kind + 1;
        int cleared = ClearRows();
        Score += new[] { 0, 100, 300, 500, 800 }[cleared] * Level;
        Lines += cleared;
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

    public void TogglePause()
    {
        if (!GameOver) Paused = !Paused;
    }

    private readonly DispatcherTimer timer = new();

    public MainWindow()
    {
        InitializeComponent();
        AppWindow.Resize(new Windows.Graphics.SizeInt32(560, 580));
        Restart();
        timer.Tick += (_, _) => { StepDown(); Draw(); };
        Closed += (_, _) => timer.Stop();
        Activated += (_, e) =>
        {
            if (e.WindowActivationState == WindowActivationState.Deactivated
                && !Paused && !GameOver)
            {
                TogglePause();
                Draw();
            }
        };
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
            case VirtualKey.Down: StepDown(true); break;
            case VirtualKey.Up: Rotate(); break;
            case VirtualKey.Space: HardDrop(); break;
            case VirtualKey.P: TogglePause(); break;
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
            foreach (var cell in Cells)
                DrawCell(X + cell.X, Y + cell.Y, Kind + 1);
        string state = GameOver ? "Game over - R to restart"
            : Paused ? "Paused - P to resume" : "Playing";
        Status.Text = $"{state}\nScore: {Score}\nLines: {Lines}\nLevel: {Level}";
        timer.Interval = TimeSpan.FromMilliseconds(DropMilliseconds);
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

## Hard drop is repeated valid movement

```csharp
public void HardDrop()
{
    if (Paused || GameOver) return;
    while (Move(0, 1)) Score += 2;
    LockPiece();
}
```

The loop terminates because each successful move increases Y and the board has a finite floor. The first rejected move leaves the piece at its last valid position. `LockPiece()` stores it, clears rows, updates scoring, and spawns another piece.

This loop runs at most roughly the height of the board. Unlike an infinite sleep loop, this small bounded computation returns promptly to the UI event loop.

`StepDown(bool softDrop = false)` serves both the timer and the keyboard. The default argument lets the timer call `StepDown()` without earning drop points. Down calls `StepDown(true)` and awards one point for a successful step.

## Score is a rule, not a label

When a piece locks:

```csharp
int cleared = ClearRows();
Score += new[] { 0, 100, 300, 500, 800 }[cleared] * Level;
Lines += cleared;
Spawn();
```

The lookup maps clearing zero through four rows to base points. `Level` is calculated from the number of previously cleared lines:

```csharp
public int Level => Lines / 10 + 1;
public int DropMilliseconds => Math.Max(100, 600 - (Level - 1) * 45);
```

These are computed properties. `=>` here supplies an expression-bodied getter, not an event callback. With integer operands, `/` performs integer division: 9 / 10 is 0, while 10 / 10 is 1. This differs from Python's `/`; compare Python's `//` for these nonnegative values.

Level 1 requests 600 ms between steps. Each additional level reduces that by 45 ms, down to a minimum of 100 ms. `Draw()` applies the current interval to the timer. The move and score rules remain independent of the displayed text.

The scoring order matters: a clear that crosses a level boundary scores at the old level, then updates the line count. That is our explicit rule for this game.

## Pause and game over guard every mutation

Movement, rotation, falling, and dropping return without changing gameplay when paused or over. The timer may continue issuing ticks, but those ticks have no gameplay effect. Restart is intentionally available from either state.

```csharp
public void TogglePause()
{
    if (!GameOver) Paused = !Paused;
}
```

`!` negates a boolean. Pause flips the current flag; it does not erase the board or rewind time.

The window listens to `Activated`. When activation state becomes `Deactivated`, it pauses if the game was running. Returning does not auto-resume: P does. Closing stops the timer. These are different lifecycle events with different responsibilities.

## Trace one complete input

Space arrives → handler calls `HardDrop` → valid downward moves award distance points → `LockPiece` writes four board cells → `ClearRows` compacts survivors → scoring and line count update → `Spawn` checks the new origin → handler calls `Draw` → text and rectangles reflect the new state.

If the spawn is blocked, `GameOver` becomes true. The renderer shows settled cells and the game-over message rather than drawing a colliding active piece over the stack.

## Exercise: inspect a level boundary

If `Lines` is 9 and a placement clears two rows, what are the clear points and new level? Ignore drop points.

**Answer:** 300 points × level 1 = 300, then lines become 11 and level becomes 2. Moving `Lines += cleared` before the score calculation would change the awarded points to 600. Both orders compile; only an explicit rule and a check establish which is intended.

Manually check: pause freezes the piece; Space does nothing while paused; R starts a fresh game; changing windows pauses; closing exits. The later automated checks complement these observations rather than replacing them.

Next: [extract and check the rules](11-refactor-and-check.md).
