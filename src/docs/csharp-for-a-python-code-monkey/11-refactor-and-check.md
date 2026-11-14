# 10 — Refactor a game you already understand

First play the extracted version:

```powershell
./src/docs/csharp-for-a-python-code-monkey/tetris/run.ps1 -Stage 10
```

Then close it and run the rules without a window:

```powershell
dotnet run --project src/docs/csharp-for-a-python-code-monkey/tetris/checks/Checks.csproj
```

Expected: named `PASS` lines followed by `17 checks passed.` The program throws an exception and exits unsuccessfully if a check fails.

<details>
<summary>Complete runnable checkpoint source (expand when entering or comparing code)</summary>

These files use the shared project and application startup from setup. The command above selects this complete checkpoint.

`checkpoints/10/Game.cs`

```csharp
namespace PythonMonkey.Tetris;

public sealed class Game
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
}
```

`checkpoints/10/MainWindow.xaml`

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

`checkpoints/10/MainWindow.xaml.cs`

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
    private readonly Game game = new();

    private readonly DispatcherTimer timer = new();

    public MainWindow()
    {
        InitializeComponent();
        AppWindow.Resize(new Windows.Graphics.SizeInt32(560, 580));
        game.Restart();
        timer.Tick += (_, _) => { game.StepDown(); Draw(); };
        Closed += (_, _) => timer.Stop();
        Activated += (_, e) =>
        {
            if (e.WindowActivationState == WindowActivationState.Deactivated
                && !game.Paused && !game.GameOver)
            {
                game.TogglePause();
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
            case VirtualKey.Left: game.Move(-1, 0); break;
            case VirtualKey.Right: game.Move(1, 0); break;
            case VirtualKey.Down: game.StepDown(true); break;
            case VirtualKey.Up: game.Rotate(); break;
            case VirtualKey.Space: game.HardDrop(); break;
            case VirtualKey.P: game.TogglePause(); break;
            case VirtualKey.R: game.Restart(); break;
            default: return;
        }
        e.Handled = true;
        Draw();
    }

    private void Draw()
    {
        BoardCanvas.Children.Clear();
        for (int row = 0; row < Game.Height; row++)
            for (int col = 0; col < Game.Width; col++)
                if (game.Board[row, col] != 0) DrawCell(col, row, game.Board[row, col]);
        if (!game.GameOver)
            foreach (var cell in game.Cells)
                DrawCell(game.X + cell.X, game.Y + cell.Y, game.Kind + 1);
        string state = game.GameOver ? "Game over - R to restart"
            : game.Paused ? "Paused - P to resume" : "Playing";
        Status.Text = $"{state}\nScore: {game.Score}\nLines: {game.Lines}\nLevel: {game.Level}";
        timer.Interval = TimeSpan.FromMilliseconds(game.DropMilliseconds);
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

## The new requirement gives the refactor a purpose

We want to verify stacking, row clearing, and scoring without waiting for pieces to fall or creating a WinUI window. In checkpoint 09, the rules are methods on `MainWindow`, so constructing the rules also constructs UI. In checkpoint 10, a plain C# `Game` object owns those rules.

The behavior stays the same. The dependencies change:

```text
Before: MainWindow = input + timing + game rules + state + drawing
After:  MainWindow = input + timing + drawing
             |
             v
          Game = rules + state

        Console checks --> Game
```

`Game.cs` imports no WinUI types. It knows neither keyboard keys nor rectangles. The window translates a key into an operation:

```csharp
private readonly Game game = new();

// Inside Surface_KeyDown:
case VirtualKey.Left: game.Move(-1, 0); break;
case VirtualKey.Space: game.HardDrop(); break;
```

## Compare the files instead of trusting the diagram

Open checkpoint 09's `MainWindow.xaml.cs`, then checkpoint 10's `Game.cs` and `MainWindow.xaml.cs`.

The board, shape catalog, bag, score, movement, rotation, locking, clearing, and restart move into `Game`. The timer, event handlers, window lifecycle, brushes, rectangles, and status text remain in `MainWindow`. Calls such as `Move(-1, 0)` become `game.Move(-1, 0)`.

`public sealed class Game` defines a type that we instantiate with `new Game()`. C# would also let us put many operations in static functions. Here an object is useful because a match has related state that those operations must update consistently. Two `Game` instances can represent two independent matches.

## Properties versus fields

```csharp
public int Score { get; private set; }
public int[,] Board { get; } = new int[Height, Width];
```

The window can read `Score`, but only `Game` can assign it. This prevents a display handler from accidentally overwriting the score. `Board` has no setter, so callers cannot replace its array. They can still mutate its elements: this is deliberately visible for our learning fixtures, not complete encapsulation.

Similarly, `Cells` exposes an array even though its setter is private. Stronger protection could expose read-only snapshots or queries. That would add code and possibly allocations. Understand the present tradeoff before changing the interface.

## A meaningful check has controlled inputs and an observable claim

From `checks/Program.cs`:

```csharp
game.Restart();
for (int col = 0; col < Game.Width; col++)
{
    game.Board[19, col] = 1;
    game.Board[18, col] = 2;
}
game.Board[17, 3] = 5;
Check(game.ClearRows() == 2, "adjacent full rows both clear");
Check(game.Board[19, 3] == 5 && game.Board.Cast<int>().Count(x => x != 0) == 1,
    "survivors compact down and vacated rows become empty");
```

This sets up the difficult adjacent-row case directly. It checks both the returned count and the resulting board. A broken algorithm might return 2 yet fail to clear stale cells, so checking just the count is insufficient.

`Cast<int>()` enumerates the rectangular array's integer elements. `Count(x => x != 0)` counts occupied cells using a predicate. These are LINQ operations; compare `sum(1 for x in values if x != 0)` in Python. The lambda here returns a boolean for each element.

The tiny `Check` function throws on failure. We use a console harness to keep the first checks free of testing-library dependencies. A later project can introduce a framework when fixtures, reporting, or parameterized cases make it useful.

## What the checks prove—and what they do not

The harness checks boundaries, overlap, four-turn rotation, pause, soft/hard drop, adjacent clears, scoring, bag membership, blocked spawn, and restart. They establish specific rule behaviors on controlled states. They do not prove the game is bug-free or verify focus, colors, window clipping, or keyboard delivery.

Build all checkpoints and run the checks:

```powershell
./src/docs/csharp-for-a-python-code-monkey/tetris/verify.ps1
```

If vulnerability metadata is unreachable, `-OfflineAudit` explicitly disables only NuGet's vulnerability audit for this verification invocation. It does not disable compiler checks or allow missing packages. Do not confuse the offline verification option with a security audit result.

## Exercise: add a rule check yourself

Check that moving left while paused does not change X. Write it before reading the answer.

**Answer:**

```csharp
game.Restart();
int oldX = game.X;
game.TogglePause();
game.Move(-1, 0);
Check(game.X == oldX, "pause blocks horizontal movement");
```

Then temporarily remove the pause guard in `Move`. Run the checks and observe the failure. Restore it. This demonstrates that your check can detect the intended regression.

## Carry the design into the next app

For the XML editor, a button click will become a request to parse or save records, rather than a request to move a piece. UI events still should not own every data rule. Pure validation can be checked without a window; SQL operations need integration checks against a disposable database; table editing and focus still need UI checks.

We do not need repositories, dependency injection, MVVM, or domain aggregates to explain every line of this first game. We now have concrete boundaries and a working example to compare when a later requirement justifies those tools.
