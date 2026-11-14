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
