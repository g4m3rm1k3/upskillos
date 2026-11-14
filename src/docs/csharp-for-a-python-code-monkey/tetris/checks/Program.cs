using PythonMonkey.Tetris;

int passed = 0;
void Check(bool condition, string name)
{
    if (!condition) throw new Exception($"FAIL: {name}");
    Console.WriteLine($"PASS: {name}");
    passed++;
}

var game = new Game();
game.Restart();
Check(game.Cells.Length == 4 && !game.GameOver, "restart spawns a valid piece");
Check(!game.Fits(game.Cells, -5, 0), "left boundary rejects movement");
Check(!game.Fits(game.Cells, 10, 0), "right boundary rejects movement");
Check(!game.Fits(game.Cells, 3, 20), "floor rejects movement");
Check(!game.Fits(game.Cells, 3, -5), "ceiling rejects movement");
game.Board[game.Y + game.Cells[0].Y, game.X + game.Cells[0].X] = 7;
Check(!game.Fits(game.Cells, game.X, game.Y), "settled cells reject overlap");
game.Restart();
var original = game.Cells.ToArray();
for (int i = 0; i < 4; i++) game.Rotate();
Check(original.SequenceEqual(game.Cells), "four rotations restore the shape");
int oldY = game.Y;
game.TogglePause();
game.StepDown();
game.HardDrop();
Check(game.Y == oldY && game.Score == 0, "pause blocks falling and dropping");
game.TogglePause();
game.StepDown(true);
Check(game.Y == oldY + 1 && game.Score == 1, "soft drop moves and scores");
game.Restart();
game.HardDrop();
Check(game.Board.Cast<int>().Count(x => x != 0) == 4 && game.Score > 0,
    "hard drop locks four cells and scores distance");

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

// Complete the bottom row using whichever shape was spawned.
game.Restart();
while (game.Move(0, 1)) { }
int bottom = game.Cells.Max(c => game.Y + c.Y);
for (int col = 0; col < Game.Width; col++) game.Board[bottom, col] = 7;
foreach (var cell in game.Cells) game.Board[game.Y + cell.Y, game.X + cell.X] = 0;
game.StepDown();
Check(game.Lines == 1 && game.Score == 100, "locking a complete row updates lines and score");

game.Restart();
var kinds = new HashSet<int>();
for (int i = 0; i < 7; i++)
{
    kinds.Add(game.Kind);
    game.HardDrop();
    Array.Clear(game.Board); // Isolate the generator from a growing stack.
}
Check(kinds.Count == 7, "one bag contains all seven different pieces");

game.Restart();
while (game.Move(0, 1)) { }
for (int row = 0; row < 4; row++)
    for (int col = 0; col < Game.Width; col++) game.Board[row, col] = 1;
for (int row = 4; row < Game.Height; row++) game.Board[row, 0] = 1;
// Keep the top rows non-full so line clearing cannot remove the spawn obstruction.
for (int row = 0; row < 4; row++) game.Board[row, 0] = 0;
game.StepDown();
Check(game.GameOver, "blocked spawn ends the game");
var frozen = game.Board.Cast<int>().ToArray();
game.HardDrop();
Check(frozen.SequenceEqual(game.Board.Cast<int>()), "game over blocks further placement");
game.Restart();
Check(!game.GameOver && !game.Paused && game.Score == 0 && game.Lines == 0
    && game.Board.Cast<int>().All(x => x == 0), "restart clears previous state");
Console.WriteLine($"{passed} checks passed.");
