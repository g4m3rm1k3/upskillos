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
