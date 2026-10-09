---
title: Watch a trained bot make decisions in a 3D playground
track: Build a 3D Game Studio — Foundations
runtime: dotnet
pedagogy: typed
console: true
---

Turn the tested learning experiment into something you can observe. The renderer reads tile coordinates and the trained table; it does not update learning. This runner is an early motivation project inside our continuing workspace. It does not yet import editor scenes or provide Play/Stop isolation.

## Give the experiment its own executable

Create Bot/Bot.csproj. The editor and bot both depend on Core, but neither depends on the other's executable. This boundary keeps graphics out of rule tests and avoids a circular reference. Use the same pinned graphics package and target as Studio.

```xml edit=Bot/Bot.csproj mode=replace
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="../Core/Core.csproj" />
    <PackageReference Include="Raylib-cs" Version="8.1.0" />
  </ItemGroup>
</Project>
```

## Draw the world and step the frozen policy

Create Bot/Program.cs. Training finishes before opening the window; 600 tiny episodes are bounded here. Training a larger problem on the UI thread would freeze the app; asynchronous work, cancellation and reporting become later lessons when that need is real. Space advances one decision so you can inspect its estimates. R resets the attempt, not the trained table. There is no real-time movement or collision solver yet.

```predict
question: Does pressing R erase the learned Q-values?
choice: No, it resets only the attempt state
choice: Yes, a replay creates a fresh agent
answer: No, it resets only the attempt state
explain: The QAgent instance lives outside the loop. R changes state, steps and ended; it does not construct or train an agent. Episode state and learned policy have different lifetimes.
```

```csharp edit=Bot/Program.cs mode=replace
using System.Numerics;
using Raylib_cs;
using Studio3D;

QAgent agent = new();
Console.WriteLine($"Before: {BotTraining.Evaluate(agent)}");
BotTraining.Train(agent, 19);
Console.WriteLine($"After: {BotTraining.Evaluate(agent)}");
int state = BeaconWorld.Start;
int steps = 0;
bool ended = false;
string status = "Space: advance trained bot | R: replay";
Camera3D camera = new()
{
    Position = new Vector3(6, 7, 8), Target = new Vector3(1, 0, 1),
    Up = Vector3.UnitY, FovY = 45, Projection = CameraProjection.Perspective
};
Raylib.InitWindow(1000, 700, "Beacon Bot - Q-learning in 3D");
Raylib.SetTargetFPS(60);
try
{
    while (!Raylib.WindowShouldClose())
    {
        if (Raylib.IsKeyPressed(KeyboardKey.R))
        {
            state = BeaconWorld.Start; steps = 0; ended = false;
            status = "Replay: same trained table";
        }
        if (!ended && Raylib.IsKeyPressed(KeyboardKey.Space))
        {
            Transition result = BeaconWorld.Step(state, agent.Greedy(state));
            state = result.State; steps++;
            ended = result.Terminal || steps >= 20;
            status = result.Terminal ? (state == BeaconWorld.Goal ? "Beacon reached" : "Hazard reached") :
                steps >= 20 ? "Step limit reached" : "Space: next decision";
        }
        Raylib.BeginDrawing();
        Raylib.ClearBackground(Color.RayWhite);
        Raylib.BeginMode3D(camera);
        for (int tile = 0; tile < BeaconWorld.StateCount; tile++)
        {
            Vector3 floor = new(tile % 3, -0.1f, tile / 3);
            Color color = tile == BeaconWorld.Goal ? Color.Gold : tile == BeaconWorld.Hazard ? Color.Red : Color.LightGray;
            Raylib.DrawCube(floor, 0.95f, 0.2f, 0.95f, color);
            Raylib.DrawCubeWires(floor, 0.95f, 0.2f, 0.95f, Color.DarkGray);
        }
        Raylib.DrawCube(new Vector3(state % 3, 0.3f, state / 3), 0.5f, 0.6f, 0.5f, Color.SkyBlue);
        Raylib.EndMode3D();
        Raylib.DrawText(status, 20, 20, 20, Color.DarkBlue);
        Raylib.DrawText($"State {state} | Steps {steps} | R resets the attempt", 20, 54, 20, Color.DarkBlue);
        for (int action = 0; action < BeaconWorld.ActionCount; action++)
            Raylib.DrawText(FormattableString.Invariant($"{(BotAction)action}: {agent.Value(state, (BotAction)action):F2}"),
                20, 100 + action * 28, 20, Color.DarkBlue);
        Raylib.EndDrawing();
    }
}
finally { Raylib.CloseWindow(); }
```

Each floor tile is a 3D cuboid with thickness; the bot has height and a perspective camera projects the scene. The navigation abstraction is a grid in the X/Z plane, as an early controlled task. Its constrained decision space is intentional: unrestricted 3D navigation needs a different state representation.

## Run the comparison and inspect the decisions

Build Bot, then run dotnet run --project Bot manually. Before should report Won=False, Steps=20, Reward=-20: zero-value ties choose Right and become stuck at a wall. After should report Won=True, Steps=4, Reward=7. Step with Space four times, avoiding the red center and ending at the gold beacon. At each tile compare the greatest visible estimate with the next action. Terminal rows remain zero because no actions are learned there. Press R and observe the same route. Close the window.

```check
run "dotnet build Bot" exit=0 timeout=120
run "dotnet run --project Checks" exit=0 stdout="LEARNING CHECKS PASSED" timeout=120
```

In a practice copy replace Greedy(state) in the runner with BotAction.Right. Observe the wall and bounded Step limit reached, then restore Greedy. A visually stuck bot might be an input, environment, policy or presentation bug; inspect the state and headless evaluation before changing rewards.

## Independent task: explain and compare a losing bot

In a practice runner omit Train. Observe its route and show its evaluation result alongside it. Keep the trained runner unchanged. Add a visible indicator identifying which policy is displayed and explain why replay and retraining must be separate controls. Record a result, its explanation and a new test or observation.

```hints
nudge: A fresh agent is a usable baseline. Its tie rule predicts the first action.
concept: A reproducible comparison uses the same world and evaluation cap while changing only the policy. Rendering should describe rather than conceal failures.
shape: Construct a separate fresh QAgent, evaluate and display it with the same Step loop. Label the untrained policy and compare its 20-step timeout with the trained four-step win.
```
