---
title: Complete the menus, garage, training screen, and HUD
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

Every required game system is now reachable through an explained user flow. Optional challenges are not needed to obtain the complete guided game.

## Offer explicit entry points and honest policy selection

Each button returns an activation result. Start race calls Start with its default false argument; demo passes true; garage and learning choose screens. The rival toggle is enabled only when the policy has rows. An untrained empty table is not presented as a trained rival.

Labels display the current strategy rather than an unexplained AI difficulty score. The instructions describe the actual keyboard adapter: left Shift boosts, E shields, number keys select a weapon, and Space fires. The sample browser additionally has touch controls; this native desktop course uses keyboard driving and mouse/keyboard menus.

A menu is a product boundary: the learner should be able to tell what happens before activating a control. We do not hide setup, saving, or training status behind a button that silently performs several unrelated actions.

Type this fragment in `Game/App.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/App.cs mode=append
    private void Menu()
    {
        Ui.Text("Good lines. Bad intentions.",40,90,30,Art.Mint);
        Ui.Text("Play the game you built, one system at a time.",40,140,18);
        if (Ui.Button("Start race",40,195)) Start();
        if (Ui.Button("Watch a demo race",40,245)) Start(true);
        if (Ui.Button("Garage",40,295)) screen = Screen.Garage;
        if (Ui.Button("Learning rivals",40,345)) screen = Screen.Learning;
        if (Ui.Button(scripted ? "Rivals: scripted" : "Rivals: Q-learning",40,395,280,policy.Values.Count > 0)) scripted = !scripted;
        Ui.Text("WASD / arrows: drive   R: recover",40,465,18);
        Ui.Text("1: rocket   2: mine   Space: fire",40,495,18);
        Ui.Text("Shift: boost   E: shield   Escape: pause",40,525,18);
        Ui.Text("Menus: click, or Tab and Enter",40,570,18);
    }
```

## Present cost, ownership, and persistence feedback

The loop maps package enum order to descriptions and controls. The displayed speeds convert metres per second to kilometres per hour and round for readability. Armor's description describes impact reduction, not invulnerability.

The label distinguishes Equipped, Equip, and Unlock with cost. Enabled requires a different selection and either ownership or affordability. Even though the UI prevents an invalid click, Garage.Select still validates the operation. UI disabling is feedback; the model enforces the rule.

When an invalid original save was preserved, the explicit replacement button is the only path that re-enables saving. This avoids overwriting existing data merely because the player navigated into the garage. Notice truncation with `[..65]` takes a prefix for this fixed panel; a production interface should offer the full diagnostic in a log or expandable view.

Type this fragment in `Game/App.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/App.cs mode=append
    private void GarageMenu()
    {
        Ui.Text($"Garage / {garage.Credits} credits",40,90,28,Art.Mint);
        string[] descriptions = { "Handling: tight steering, 101 km/h", "Engine: slower steering, 112 km/h", "Armor: half hit penalty, 94 km/h" };
        for (int i = 0; i < 3; i++)
        {
            Package package = (Package)i; Ui.Text(descriptions[i],40,145+i*105,18);
            string label = garage.Selected == package ? "Equipped" : garage.Owned.Contains(package) ? "Equip" : "Unlock / 150 credits";
            if (Ui.Button(label,40,175+i*105,280,garage.Selected != package && (garage.Owned.Contains(package) || garage.Credits >= 150)))
            { garage.Select(package); Save(); }
        }
        if (!canSave && Ui.Button("Use new garage (replace invalid save)",40,475,450)) { canSave = true; Save(); }
        Ui.Text(notice.Length > 65 ? notice[..65] : notice,40,535,14);
        if (Ui.Button("Back",40,580)) screen = Screen.Menu;
    }
```

## Resume from a paused lifecycle, not a fresh race

Resume restores Countdown or Racing based on the remaining countdown. It clears the accumulator and pending input, then selects the race screen. Restart instead calls Start and constructs a fresh race, preserving whether this was a demo. Main menu leaves the old state unused until a future Start creates a replacement.

Results uses a snapshot of Ranking. A nullable finish time is formatted to two decimals, with On track for unfinished racers. The interpolation `i+1` converts zero-based array position to a human rank. Display order follows the same method as reward calculation, preventing two definitions of first place.

Demo results explicitly say there is no award. A time-limit result is distinguished from a finish. Product language should not claim the player finished simply because the loop ended. Race again starts normal play; the demo is an observation mode, not a way to farm credits.

Type this fragment in `Game/App.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/App.cs mode=append
    private void PauseMenu()
    {
        Ui.Text("Race paused",40,90,34,Art.Mint);
        if (Ui.Button("Resume",40,175))
        { race.Phase = race.Countdown > 0 ? Phase.Countdown : Phase.Racing; accumulator = 0; keyboard.Clear(); screen = Screen.Race; }
        if (Ui.Button("Restart",40,230)) Start(demo);
        if (Ui.Button("Main menu",40,285)) screen = Screen.Menu;
    }
    private void Results()
    {
        Ui.Text(race.Karts[0].Finish != null ? "Chequered flag" : "Time limit reached",40,90,32,Art.Mint);
        Kart[] order = race.Ranking();
        for (int i = 0; i < order.Length; i++)
        {
            Kart kart = order[i]; string time = kart.Finish?.ToString("F2") ?? "On track";
            Ui.Text($"{i+1}. {kart.Name} / {time}",40,155+i*38,22,Art.Paint[kart.Id]);
        }
        Ui.Text(demo ? "Demonstrations award no credits." : $"Garage balance: {garage.Credits} credits",40,335,18);
        if (Ui.Button("Race again",40,395)) Start();
        if (Ui.Button("Garage",40,445)) screen = Screen.Garage;
        if (Ui.Button("Main menu",40,495)) screen = Screen.Menu;
    }
```

## Run training off the graphics thread

Task.Run schedules the pure training operation on a worker. It receives no Raylib object and makes no graphics calls; the native graphics context belongs to the main thread. The button disables itself while a task exists, preventing overlapping training jobs from racing to replace the policy.

The progress callback uses Interlocked.Exchange to publish the completed count, and the UI uses Volatile.Read to observe it. `ref completed` passes the field location rather than a copy. This is a narrowly scoped shared-state channel. It does not make arbitrary compound operations on the policy thread-safe.

The screen states what is learned and what stays programmed. It also directs the learner to held-out command-line evaluation, rather than treating visited-state count as a quality score. Closing the program can abandon an unfinished background training job; we save only completed policies. A future cancel button should use cooperative cancellation, not terminate a thread during a write.

Type this fragment in `Game/App.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/App.cs mode=append
    private void Learning()
    {
        Ui.Text("Learn the fight",40,90,32,Art.Mint);
        Ui.Text("Waypoint steering is programmed.",40,150,19);
        Ui.Text("The Q-table learns equipment decisions.",40,180,19);
        Ui.Text("Policies stay frozen during your race.",40,210,19);
        Ui.Text($"Visited states: {policy.Values.Count}",40,255,20);
        if (Ui.Button(training == null ? "Train 600 simulated races" : $"Training {Volatile.Read(ref completed)} / 600",40,315,350,training == null))
        { completed = 0; training = Task.Run(() => Training.Train(600,n => Interlocked.Exchange(ref completed,n))); }
        Ui.Text("Compare with scripted tactics from the menu.",40,390,18);
        Ui.Text("Use --evaluate for held-out CSV results.",40,420,18);
        Ui.Text(notice.Length > 65 ? notice[..65] : notice,40,470,14);
        if (Ui.Button("Back",40,540)) screen = Screen.Menu;
    }
```

## Translate model values into legible feedback

The HUD reads place, lap, elapsed time, ranking, speed, energy, inventory, selected weapon, and shield state. Speed multiplication by 3.6 is a display conversion; F0 and F2 control formatting only. Lap is capped at two to avoid showing a third lap during the finish transition.

The ranking loop increases y after each row, creating consistent vertical spacing. Paint[Id] matches kart colors. Countdown uses Ceiling so a remaining fraction such as 1.2 displays 2, not 1; a countdown label should not promise the next integer boundary has already passed.

The event queue is already bounded by Race.Message, so drawing every message cannot grow this panel without limit. This renderer reads one coherent current state after fixed updates. It does not interpolate between previous/current simulation positions; adding interpolation can smooth high-refresh displays but requires retaining both states without altering the rules.

Type this fragment in `Game/App.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/App.cs mode=append
    private void Hud()
    {
        Kart player = race.Karts[0]; int place = Array.IndexOf(race.Ranking(),player)+1;
        Ui.Panel(20,65,285,245);
        Ui.Text($"{place}/4   LAP {Math.Min(2,player.Lap+1)}/2",35,80,28,Art.Mint);
        Ui.Text($"TIME {race.Time:F2} s",35,120,22);
        int y = 160;
        foreach (Kart kart in race.Ranking()) { Ui.Text(kart.Name + " / " + kart.LastAction,35,y,18,Art.Paint[kart.Id]); y += 30; }
        Ui.Panel(20,540,440,150);
        Ui.Text($"{player.Speed*3.6f:F0} KM/H  ENERGY {player.Energy:F0}%",35,555,24);
        Ui.Text($"Rocket {player.Rockets} / Mine {player.Mines} / {keyboard.Weapon}",35,590,20);
        Ui.Text(player.Shield > 0 ? "SHIELD ACTIVE" : "Space: fire / Shift: boost / E: shield",35,630,18,Art.Mint);
        if (race.Countdown > 0) Ui.Text(MathF.Ceiling(race.Countdown).ToString(),580,280,100,Art.Dark);
        if (demo) Ui.Text("DEMO DRIVER",850,25,20,Art.Dark);
        y = 70; foreach (string message in race.Messages) { Ui.Text(message,800,y,17,Art.Dark); y += 26; }
    }
}
```

## Build before replacing the entry point

Run `dotnet build Game` and `dotnet run --project Checks`. App is complete, though the current entry point still displays the triangle experiment. A successful build confirms referenced types and APIs exist; it does not yet prove the menu transitions. The next lesson starts this App and adds headless command modes, then you will exercise each screen.

