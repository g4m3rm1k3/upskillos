# Primitives, low-poly assets and imported models

Status: connected box authoring lessons authored, 2026-10-10. A [visible shape experiment](../src/labs/project-studio/tracks/games3d-foundations/08c-shape-preview.md) precedes the [validated recipe](../src/labs/project-studio/tracks/games3d-foundations/09-box-recipes.md), [per-object editing and undo](../src/labs/project-studio/tracks/games3d-foundations/09a-box-editing.md), and [saved dimensions with migration](../src/labs/project-studio/tracks/games3d-foundations/09b-box-storage.md). The studio now draws individually sized boxes; other primitives, persisted materials, compound props, procedural generators and mesh importing remain planned. This extends the [completion roadmap](3d-studio-completion-roadmap.md), with prerequisites and visible problems determining teaching order.

## The learner's workflow

Start a game with built-in shapes, compose a small low-poly prop, save it as a reusable definition, place several instances, then replace selected visuals with an imported model. The same scene identity, transform, behavior and collision workflows apply to both sources. A learner must be able to finish the early beacon game without obtaining external art.

Teach the distinctions explicitly: a primitive is a parameterized shape; a mesh stores geometric data; a model can contain meshes, materials, hierarchy and animation; a reusable object definition also describes the scene components and child objects needed to instantiate a prop. A visual mesh is not automatically its collision shape or gameplay behavior.

## Built-in palette and low-poly authoring

| Stage | Assets and controls | Game use and evidence |
| --- | --- | --- |
| Early shape palette | Cube/box, plane, sphere, cylinder and cone; dimensions, color and modest segment counts where applicable | Beacon room, floor, pillars and simple trees. Save/reopen the chosen shape and parameters; changing one instance leaves others unchanged. |
| More construction shapes | Capsule, wedge/ramp, triangular prism, pyramid and ring/torus | Character proxies, ramps, roofs, wheels and pickups. Explain bounds, pivots, orientation and which collider approximates each shape. |
| Low-poly styling | Flat shading, face/vertex normals, palette materials, scale/rotation, grouping and adjustable tessellation | Build a tree, rock, house or kart from shapes; compare flat and smooth appearance with the same underlying gameplay rules. |
| Procedural mesh lessons | Vertices, triangle indices, winding, normals and UVs; generate a wedge before a larger terrain or track generator | Show a missing/back-facing triangle, diagnose its winding and repair it. Check finite coordinates, valid indices and degenerate geometry. |
| Reusable game asset library | Save compound props, define a pivot, place instances, customize permitted material/transform settings and record dependencies | A building or kart has multiple independently editable instances; reload and export preserve their definitions and overrides. |
| Genre construction tools | Track pieces, modular rooms, cliffs/terrain and navigation/collision previews | Racing gates align with the authored track; platformer ramps and steps have verified spatial interactions. |

Low-poly means deliberate geometric and artistic choices, not merely reducing every segment count. Teach silhouettes, readable colors, scale and lighting through the game camera. Complexity controls should report measured mesh work and memory; do not claim a universally correct polygon budget or assume simple geometry guarantees fast rendering.

Compound authoring starts with transforms, hierarchy and reusable definitions. Vertex editing, extrusion, bevels and mesh merging can follow a concrete game need; they are not prerequisites for the first low-poly asset kit. Model geometry and collision geometry remain separately inspectable.

## Imported meshes join the same library

The first importer target is a tested subset of static glTF 2.0/GLB, followed by broader materials, hierarchies, skins and animation only after their runtime lessons exist. The [Khronos specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) describes the format; it does not establish which features our renderer supports. An author spike must test the pinned native binding and representative files on each claimed platform before lessons advertise support.

GLB can package JSON and binary data together, while glTF assets may reference additional files. Record and collect the actual dependencies of either form; a GLB filename alone is not evidence that every texture is embedded. Preserve editable source files separately from runtime assets: glTF is a delivery format, not a replacement for the original modeling project. Additional formats such as OBJ should be introduced with a clearly tested capability list; avoid an unsupported promise to import every model format.

The planned import workflow is:

1. Select an asset, inspect its units, orientation, geometry, materials and dependencies, and preview it before changing a game scene.
2. Copy the required source/dependencies into the game project's asset area. Give the logical asset a stable identity independent of its machine-specific absolute path.
3. Store import settings for scale, up-axis conversion, pivot, normals and material treatment. Preserve the source; conversion should be reproducible.
4. Report unsupported features, invalid data, missing textures and resource limits clearly. A static-only importer must identify animation it does not support instead of implying animation was imported successfully.
5. Instantiate the asset in the scene with an object ID and local transform. Select and inspect it through the same editor operations used for primitives.
6. Choose a simple collision proxy or an explicitly supported mesh collider. Preview its relationship to the visual asset and test the game's actual movement interactions.
7. Save, reload and export the project with its asset references and dependencies. Verify it launches after the original external source location is unavailable.

Later reimport must preserve logical asset identity and scene instances where the supported compatibility contract permits it. Use a candidate asset and validation before replacing a working resource. Track changed materials, hierarchy, clips and bounds rather than treating all source changes as harmless. Undo/recovery and diagnostics must account for reimport failures.

## Ownership and C# concepts

Scene data stores primitive descriptions or asset references, transforms and gameplay settings. It does not serialize GPU handles or duplicate imported vertex arrays for every instance. The renderer/resource owner creates and releases runtime resources; the game project describes what it needs. Identical geometry may be shared, while changing an instance's material must not silently mutate all other instances.

Introduce a primitive enum and validated parameter records before a general generator interface. A resource cache earns dictionaries, identity and lifecycle lessons when repeated instances otherwise load duplicate resources. An importer interface earns its place when tested implementations or import stages must vary. Native mesh/model ownership motivates IDisposable, deterministic teardown and the managed/native boundary. Larger imports motivate progress, cancellation and background data processing, while graphics uploads remain on their required thread.

Asset iteration also teaches dependency graphs, hashing, compatibility, bounds, coordinate spaces, profiling and reference validation. Add production complexity after a measured failure or a real genre requirement, with an independent task explaining the tradeoff.

## Games and asset kits

- Beacon Island: primitive floors, walls, pillars, collectible markers and simple low-poly vegetation; a learner-designed prop makes the first level their own.
- Circuit Clash: a reusable kart assembled from a body and wheels, modular track pieces and barriers; import a replacement kart while retaining driver rules and gate validation.
- Skybound Courier: platforms, ramps, lifts and checkpoints; inspect collision separately from art, then add animation-supported character models.
- Clockwork Rooms: modular walls, doors, switches and mechanisms; reusable definitions retain stable gameplay references.
- Sentinel Valley: towers, paths and enemy silhouettes; geometry and rendering costs become measurable with repeated instances.
- Harbor Quest and Signal Arena: modular buildings, props, imported characters and animation; track content ownership, dialogue/item references and resource lifetime.

Provide original built-in procedural examples so external asset downloads are not required. For imported examples, record origin, license and attribution with the project; the packaged game includes the necessary notices. Do not download third-party art or imply permission merely because a model can be previewed.

## Learning-agent connection

Primitive and imported visuals must not silently redefine the bot's observations or reward rules. Gameplay markers, collisions and navigable space define the environment explicitly. First show that replacing a beacon's visual mesh preserves its role; then deliberately change a collider or route and rebuild/validate the environment. A changed-looking scene is not automatically an unseen task, and a changed collision layout may invalidate a saved policy even if asset names stay the same.

## Acceptance gates

The primitive path must support add/edit/duplicate, save/reopen, undo and export with reproducible shape parameters. A compound low-poly asset must have independently editable instances and a defined pivot. Imported assets must survive project relocation and packaging, release resources after repeated play/reload, and fail visibly on missing or unsupported content. Validate selection and collision with non-unit scale and rotation, not just a unit cube.

Each teaching arc includes a learner-built prop or independently imported model, a diagnosed visual/import failure and a gameplay test showing why the asset pipeline matters. A successful model preview does not establish collision correctness, animation support, standalone packaging or mastery.
