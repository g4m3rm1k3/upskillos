---
title: Tests that protect rules rather than appearances
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

We will exercise the same Core library that Game uses. No graphics window, fake renderer, or duplicated simulation is involved.

## Create an assertion with a process-level failure

Require receives a bool and a message. If the bool is false it throws; otherwise it prints PASS. That makes success visible without treating printed text as the test itself. Near compares floats within a small absolute tolerance. It is appropriate for these small unit-scale calculations; values over widely different scales may need a relative tolerance too.

The first assertions cover both wrap boundaries and the seam of the continuous curve. The rotation assertion compares vectors by the length of their difference. Its expected direction comes from our coordinate convention, not from repeating Transform's formula inside the test. The degenerate-triangle case requires a finite ambient fallback.

Type these before running. Predict which assertion would fail if integer division accidentally returned in Track.At, or if the sine sign in Transform changed. Different tests detect different mistakes; no single green assertion proves the entire renderer.

Type this fragment in `Checks/Program.cs`. Start or replace this file.

```csharp edit=Checks/Program.cs mode=replace
using System.Numerics;
using CircuitClash;

void Require(bool condition, string message)
{
    if (!condition) throw new Exception(message);
    Console.WriteLine("PASS " + message);
}
bool Near(float actual, float expected) => MathF.Abs(actual - expected) < 0.0001f;
Require(Track.Wrap(-1) == 359 && Track.Wrap(360) == 0, "track wraps both boundaries");
Require(Vector3.Distance(Track.Point(0), Track.Point(1)) < 0.0001f, "track closes");
Require(Vector3.Distance(Geometry.Transform(Vector3.UnitZ, Vector3.Zero, MathF.PI / 2), Vector3.UnitX) < 0.0001f, "local forward rotates right");
Require(Geometry.Light(Vector3.Zero, Vector3.Zero, Vector3.Zero) == 0.35f, "degenerate triangle stays finite");
```

## Verify all box faces and ordered gates

For each triangle, we load its three indexed positions. The cross product points along its winding normal; the centroid `(a+b+c)/3` points from the box center toward that face. A positive dot product means the normal faces outward. Merely asserting that the index array has 36 elements would miss reversed or incorrectly connected triangles.

The checkpoint test first visits the start before the required gates and requires zero laps. It then deliberately places the kart at every valid gate in order twice. Place supplies the correct heading too. This is a focused state-transition test; it does not prove that a real driver can navigate between those gates. Later seeded full races cover that integration path.

Test setup writes state directly to isolate a rule. Production input must pass through Race. Keep that distinction explicit: bypassing the rules in a test is useful arrangement, but doing so in a player control path would undermine the test's guarantee.

Type this fragment in `Checks/Program.cs`. Append it after the previous fragment in this file.

```csharp edit=Checks/Program.cs mode=append
Vector3[] vertices = Geometry.Corners(new Vector3(2));
for (int i = 0; i < Geometry.BoxIndices.Length; i += 3)
{
    Vector3 a = vertices[Geometry.BoxIndices[i]], b = vertices[Geometry.BoxIndices[i+1]], c = vertices[Geometry.BoxIndices[i+2]];
    Require(Vector3.Dot(Vector3.Cross(b-a,c-a), (a+b+c)/3) > 0, "outward triangle " + i/3);
}
Race race = new(42,Package.Handling);
Kart player = race.Karts[0];
player.Place(0,0); race.Checkpoint(player);
Require(player.Lap == 0, "start line cannot skip checkpoints");
foreach (int gate in new[] {90,180,270,0,90,180,270,0})
{
    player.Place(gate,0); race.Checkpoint(player);
}
Require(player.Lap == 2 && player.Finish != null, "ordered gates finish two laps");
```

## Check equipment and the pause boundary

Shield activation must both spend energy and set its timer. Checking only the timer would accept a free infinite shield. Hit must leave suffered count unchanged while shielded. A rocket immediately after activation must be rejected by cooldown without spending ammunition.

Pause testing records countdown, invokes the ordinary Tick entry point, then compares time and countdown. The requirement is established at the rule boundary, not by finding the word Paused in a menu. Add a hazard in a later extension if you want a more explicit regression against accidentally moving Combat before the pause guard.

Run `dotnet run --project Checks` and expect FOUNDATION CHECKS PASSED. Deliberately remove the pause early return in Race.Tick; run again and observe the pause assertion fail. Restore the guard and rerun. Do the same with the shield energy subtraction. If a mutation survives, identify the missing observation rather than adding an assertion that merely checks source text.

Type this fragment in `Checks/Program.cs`. Append it after the previous fragment in this file.

```csharp edit=Checks/Program.cs mode=append
race = new(42,Package.Handling); player = race.Karts[0];
race.Act(player,Tactic.Shield);
Require(player.Energy == 65 && player.Shield == 2, "shield spends energy");
race.Hit(player,1); Require(player.Suffered == 0, "shield blocks damage");
race.Act(player,Tactic.Rocket); Require(player.Rockets == 2, "cooldown rejects a second action");
race.Phase = Phase.Paused;
float countdown = race.Countdown;
race.Tick(new Control[4]);
Require(race.Time == 0 && race.Countdown == countdown, "pause freezes clocks");
Console.WriteLine("FOUNDATION CHECKS PASSED");
```

## Recognize a misleading green suite

A test that asserts `2 + 2 == 4` while claiming to test damage never calls damage. A test that repeats the implementation's formula may repeat its mistake. A test that mocks Race.Hit and only verifies that it was called cannot establish the resulting speed or shield behavior. Test the observable rule at the smallest real boundary that can establish it.

Flaky tests change result without a relevant code change. Real clock timing, uncontrolled random seeds, shared save files, and leftover processes are common causes. Use fixed seeds, temporary per-test storage, and simulation time. Do not make a flaky test “reliable” by rerunning until it happens to pass.

These checks still cannot establish comfortable steering, legible menus, or visible triangles. Keep visual and human checks alongside deterministic rule tests. Write down what each kind of evidence covers and what it cannot prove.

```check
run "dotnet run --project Checks" exit=0 stdout="FOUNDATION CHECKS PASSED" timeout=120
```

## Challenge — return to this later

This is optional. You can continue without completing it; no later guided step depends on your solution. Keep your attempt and revisit it.

Write a test for overlapping karts at exactly the same position. Require finite coordinates and separation, then remove the zero-distance fallback to prove the test catches the error.

