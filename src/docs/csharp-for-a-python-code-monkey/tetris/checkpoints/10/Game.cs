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
