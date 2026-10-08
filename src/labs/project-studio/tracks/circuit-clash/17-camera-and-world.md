---
title: A chase camera, track mesh, and low-poly scenery
track: Circuit Clash — C# Software Engineering
trackOrder: 31
runtime: dotnet
pedagogy: typed
console: true
---

The camera and scene read the race. They never advance it. We will generate the full road and environment from the geometry tools you already built.

## Follow the kart with a stable chase camera

The camera starts with world-up Y, perspective projection, and a 62-degree vertical field of view. Desired position sits behind the player's forward vector and 4.2 units above it. Menu views use a larger distance and slight yaw offset to show the kart from an angle.

A raw assignment would snap immediately. Lerp returns a weighted mixture: current + blend*(desired-current). The blend `1-exp(-9*seconds)` makes smoothing depend on elapsed time rather than a fixed fraction per display frame. After equal real time, many small updates approximate the same response as fewer larger updates. The first frame uses desired directly to avoid flying in from the origin.

Target is ahead of the kart and slightly above it. Camera position and target have distinct jobs: the first sets where the eye is; the second determines viewing direction. This camera does not avoid scenery collisions. Track/scenery placement must keep the intended view clear, and a more complex course may require a camera collision query.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Game/World.cs`. Start or replace this file.

```csharp edit=Game/World.cs mode=replace
using System.Numerics;
using Raylib_cs;
using CircuitClash;

public sealed class World
{
    private Camera3D camera = new() { Up = Vector3.UnitY, FovY = 62, Projection = CameraProjection.Perspective };
    private bool first = true;
    public void Camera(Kart player, float seconds, bool menu)
    {
        float yaw = player.Yaw + (menu ? 0.65f : 0);
        Vector3 desired = player.Position - Track.Forward(yaw) * (menu ? 12 : 8.5f) + Vector3.UnitY * 4.2f;
        float blend = 1 - MathF.Exp(-9 * seconds);
        camera.Position = first ? desired : Vector3.Lerp(camera.Position, desired, blend);
        camera.Target = player.Position + Track.Forward(player.Yaw) * 7 + Vector3.UnitY;
        first = false;
    }
```

## Extrude a ribbon along the track

Edge offsets a centerline sample sideways in its local right direction. For each pair of neighboring samples, the left and right edges form a four-corner strip. We split that strip into triangles a,c,b and b,c,d with upward winding. The final sample connects to wrapped sample zero, closing the road.

The lift vector adds a small vertical offset. Coplanar road markings can fight with the road in the depth buffer, so we lift them slightly. Large offsets would make them visibly float. This is an intentional rendering accommodation, not part of collision height.

Every ribbon is generated from the same track function as driving. That prevents a hand-drawn visual road drifting away from simulation coordinates. It does not make the road a full collision mesh: driving still uses nearest centerline distance and sampled height.

Type this fragment in `Game/World.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/World.cs mode=append
    private static Vector3 Edge(int index, float offset) => Track.At(index) + Track.Right(Track.Yaw(index)) * offset;
    public static void Ribbon(float left, float right, Color color, float lift)
    {
        Vector3 up = Vector3.UnitY * lift;
        for (int i = 0; i < Track.Count; i++)
        {
            Vector3 a = Edge(i,left) + up, b = Edge(i,right) + up;
            Vector3 c = Edge(i+1,left) + up, d = Edge(i+1,right) + up;
            Art.Face(a,c,b,color); Art.Face(b,c,d,color);
        }
    }
```

## Layer the road and its visual boundaries

BeginMode3D installs this camera. The ground plane lies below the elevated circuit. A wider green ribbon supplies shoulders; the darker ribbon marks the road. Narrow pale ribbons mark its edges. Order alone does not solve visibility; the depth buffer compares geometry depth, and the explicit lifts separate nearly coplanar surfaces.

Every sixth sample adds curb boxes and a center dash. `i % 12` alternates curb color. The local yaw rotates each box along the track. These sample-based intervals vary in physical length on the winding curve; uniform metre spacing would require accumulated arc length and interpolation. That is a useful future geometry extension, not a hidden prerequisite.

The renderer uses the same half-width convention as the race. A visible shoulder does not promise full grip there: the darker fourteen-unit road is the driving surface, and the off-road rule begins outside it.

This fragment opens a declaration that continues in the following step. Save it, but wait for the stated build checkpoint before compiling.

Type this fragment in `Game/World.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/World.cs mode=append
    public void Draw(Race race)
    {
        Raylib.BeginMode3D(camera);
        Raylib.DrawPlane(new Vector3(0,-4,0), new Vector2(1000,1000), new Color(115,152,139,255));
        Ribbon(-11,11,new Color(134,173,119,255),-0.1f);
        Ribbon(-7,7,new Color(70,86,104,255),0);
        Ribbon(-7.1f,-6.8f,Color.Beige,0.03f); Ribbon(6.8f,7.1f,Color.Beige,0.03f);
        for (int i = 0; i < Track.Count; i += 6)
        {
            float yaw = Track.Yaw(i);
            foreach (int side in new[] {-1,1})
                Art.Box(Edge(i,side*7.5f), new Vector3(0.8f,0.2f,2), i % 12 == 0 ? Color.Beige : new Color(238,128,111,255), yaw);
            Art.Box(Track.At(i) + Vector3.UnitY*0.025f, new Vector3(0.15f,0.02f,1.5f), Color.LightGray, yaw);
        }
```

## Render transient state without mutating it

Scenery and Gates draw static world objects. A pickup appears only when its respawn timer is zero; race time rotates it, so a paused race also freezes that animation. Projectiles select size and color from their type. Every kart uses the shared Art.Kart composition.

Rendering does not decrement lifetime, collect a pickup, or grant a shield. Those changes happen only in Tick. Consequently drawing twice in one simulation interval does not double the game speed. This is the central separation that also allows thousands of headless training steps without drawing any frames.

EndMode3D restores 2D coordinates for the HUD. A missing End call can make later menu coordinates be interpreted through the wrong transformation state, so keep Begin/End pairs visibly balanced.

Type this fragment in `Game/World.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/World.cs mode=append
        Scenery(); Gates();
        foreach (Pickup p in race.Pickups) if (p.Wait == 0)
            Art.Box(Track.At(p.Index) + Vector3.UnitY*1.5f, new Vector3(1.4f), Art.Mint, race.Time*2);
        foreach (Hazard h in race.Hazards)
            Art.Box(h.Position, new Vector3(h.IsMine ? 1 : 0.7f), h.IsMine ? Color.Red : Color.Yellow, h.Yaw);
        foreach (Kart kart in race.Karts) Art.Kart(kart);
        Raylib.EndMode3D();
    }
```

## Compose a landscape with parameterized repetition

Mountains are five-sided cones arranged on a large circle around the circuit. Their radius and height vary with index remainder, producing deterministic variation without consuming the race's random sequence. Presentation must not change gameplay randomness just because an extra tree is drawn.

Trees use a box trunk and a cone canopy. Their index advances by 17 samples to distribute them along the loop, with alternating side and varied offset. Setting base Y to -4 places their roots on the ground plane; they do not sit on the elevated road. The trunk and canopy heights overlap so they read as one object.

Repeated shapes are a modeling decision. They establish a readable low-poly landscape with small code and no external assets. A production art direction might replace them with authored meshes, but the same transforms, triangle topology, normals, and resource ownership would still apply.

Type this fragment in `Game/World.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/World.cs mode=append
    private static void Scenery()
    {
        for (int i = 0; i < 20; i++)
        {
            float a = i*MathF.Tau/20;
            Art.Cone(new Vector3(MathF.Sin(a)*210,-4,MathF.Cos(a)*210), 35+i%4*9, 45+i%5*12, new Color(115,146,137,255),5);
        }
        for (int i = 0; i < 90; i++)
        {
            Vector3 p = Edge(i*17, (i%2==0 ? -1 : 1)*(14+i%5*3)); p.Y = -4;
            Art.Box(p + Vector3.UnitY*4, new Vector3(0.5f,8,0.5f), Color.Brown);
            Art.Cone(p + Vector3.UnitY*4, 3, 8+i%4, new Color(64,122,101,255));
        }
    }
```

## Make rule locations visible

Each checkpoint gets two gold posts outside the road. The start also receives a crossbar and a two-row checker strip. The inner loops alternate color using the parity of x+z. Geometry.Transform places those local tile coordinates into the start line's world position and heading.

`continue` skips the start-only decorations for nonzero gates. It does not exit the outer checkpoint loop. A mistaken return here would prevent later posts from rendering. The posts are visual cues rather than obstacles; the checkpoint rule tests the central region and heading.

The stripe tiles are lifted slightly to avoid depth fighting. Their small thickness and the camera angle should be inspected in a running frame. Numeric geometry tests can establish winding and coordinate transforms, but cannot establish that the start line is visually understandable.

Type this fragment in `Game/World.cs`. Append it after the previous fragment in this file.

```csharp edit=Game/World.cs mode=append
    private static void Gates()
    {
        for (int index = 0; index < 360; index += 90)
        {
            foreach (int side in new[] {-1,1})
                Art.Box(Edge(index,side*8),new Vector3(0.4f,9,0.4f),Color.Gold);
            if (index != 0) continue;
            Art.Box(Track.At(0)+Vector3.UnitY*5,new Vector3(17,1,0.5f),Art.Mint,Track.Yaw(0));
            for (int x = 0; x < 14; x++) for (int z = 0; z < 2; z++)
            {
                Vector3 p = Geometry.Transform(new Vector3(x-6.5f,0.04f,z-0.5f),Track.At(0),Track.Yaw(0));
                Art.Box(p,new Vector3(1,0.03f,1),(x+z)%2==0 ? Color.White : Art.Dark,Track.Yaw(0));
            }
        }
    }
}
```

## Verify and explain the boundary

Run `dotnet build Game`. To preview the world before adding menus, temporarily create `var preview = new CircuitClash.Race(1,CircuitClash.Package.Handling);` and `var world = new World();` before the triangle loop. Replace the BeginMode3D-through-EndMode3D section with `world.Camera(preview.Karts[0],Raylib.GetFrameTime(),false); world.Draw(preview);`. Keep BeginDrawing, background clear, and EndDrawing around it. Inspect the elevated road, start stripe, kart, and scenery, then restore the triangle preview. The later final entry point replaces this entire file, so this preview is not a hidden dependency.

