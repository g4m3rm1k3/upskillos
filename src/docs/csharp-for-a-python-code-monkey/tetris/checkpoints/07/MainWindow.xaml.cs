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
