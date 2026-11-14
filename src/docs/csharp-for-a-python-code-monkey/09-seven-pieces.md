# 08 — Seven shapes, copying, and a shuffled bag

```powershell
./src/docs/csharp-for-a-python-code-monkey/tetris/run.ps1 -Stage 08
```

You now receive all seven tetrominoes. Rotation tries small horizontal adjustments if the original rotated position is blocked.

The shape catalog is an array of coordinate arrays:

```csharp
private static readonly (int X, int Y)[][] Shapes =
{
    new[] { (0, 1), (1, 1), (2, 1), (3, 1) }, // I
    new[] { (0, 0), (1, 0), (0, 1), (1, 1) }, // O
    new[] { (1, 0), (0, 1), (1, 1), (2, 1) }, // T
    new[] { (2, 0), (0, 1), (1, 1), (2, 1) }, // L
    new[] { (0, 0), (0, 1), (1, 1), (2, 1) }, // J
    new[] { (1, 0), (2, 0), (0, 1), (1, 1) }, // S
    new[] { (0, 0), (1, 0), (1, 1), (2, 1) }  // Z
};
```

Unlike the board's `int[,]`, `[][]` is a jagged array: an outer array containing references to other arrays. `Shapes[2]` returns the T coordinate array. `Shapes[2][0]` returns its first coordinate tuple.

`static` makes the catalog belong to the type rather than each instance. `readonly` prevents replacing the catalog field after initialization; it does not make every inner array immutable.

<details>
<summary>Complete runnable checkpoint source (expand when entering or comparing code)</summary>

These files use the shared project and application startup from setup. The command above selects this complete checkpoint.

`checkpoints/08/MainWindow.xaml`

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

`checkpoints/08/MainWindow.xaml.cs`

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


    private void Restart()
    {
        Array.Clear(Board);
        GameOver = false;
        bag.Clear();
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


    private bool Move(int dx, int dy)
    {
        if (GameOver || !Fits(Cells, X + dx, Y + dy)) return false;
        X += dx;
        Y += dy;
        return true;
    }
    public void Rotate()
    {
        if (GameOver || Kind == 1) return;
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
        Status.Text = GameOver ? "Game over - R to restart" : "Checkpoint 08";
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

## Templates versus active state

Spawning copies a template:

```csharp
Cells = ((int X, int Y)[])Shapes[Kind].Clone();
```

`Clone()` returns `object`, so the cast tells C# the actual array type. The clone is a separate array. Its coordinate tuples contain integers, so copying the elements is sufficient here.

Compare Python's `cells = shapes[kind].copy()`. Without copying, direct edits such as `Cells[0] = ...` would also edit the catalog's array. Our current rotation allocates a new array, but explicit copying keeps templates separate from mutable active data.

## Why not choose a random kind every spawn?

Independent random selection can produce long gaps between particular shapes. A seven-piece bag guarantees that each batch contains each kind exactly once, in shuffled order. A boundary between bags can still put matching pieces next to one another.

When the queue is empty, we shuffle seven indexes:

```csharp
int[] kinds = { 0, 1, 2, 3, 4, 5, 6 };
for (int i = kinds.Length - 1; i > 0; i--)
{
    int j = random.Next(i + 1);
    (kinds[i], kinds[j]) = (kinds[j], kinds[i]);
}
foreach (int kind in kinds) bag.Enqueue(kind);
Kind = bag.Dequeue();
```

`Queue<int>` is a generic collection holding integers in first-in, first-out order. `Enqueue` adds to the back; `Dequeue` removes from the front. In Python, `collections.deque` offers comparable queue operations.

The shuffle is Fisher–Yates. At position `i`, choose uniformly from indexes 0 through `i`, then swap. `Random.Next(i + 1)` excludes its upper bound, like `randrange(i + 1)`. Tuple assignment swaps without overwriting one value prematurely.

The shuffle takes O(n) work for n elements. Here n is always seven. Keeping one `Random` instance avoids recreating the generator for every spawn.

## Rotation differences

The I piece uses a four-by-four local box, so its rotation formula uses `size = 4`. Other rotating shapes use a three-by-three box. The O piece stays unchanged.

After constructing a rotated candidate, we try origin offsets `0, -1, 1, -2, 2` in that order. The first valid candidate wins. This is a small horizontal wall-kick search, not official SRS; there are no vertical floor kicks. At some floor positions, a rotation is therefore rejected.

## Exercise: check guarantees rather than appearances

Could a shuffled bag produce two I pieces consecutively? Could it produce a bag containing no I piece?

**Answer:** consecutive I pieces are possible across a bag boundary. A complete bag without an I is impossible because shuffling rearranges indexes without adding or removing them.

For a repeatable investigation, temporarily use `new Random(123)` rather than `new Random()`. Restart the whole process twice and compare the opening sequence. Seeding aids reproducibility on this runtime; it is not a promise of identical sequences across all future .NET versions. Restore the unseeded version when finished.

Next: [scoring and lifecycle](10-scoring-and-lifecycle.md).
