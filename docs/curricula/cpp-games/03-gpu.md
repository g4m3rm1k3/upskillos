# C — Understand graphics, then write shaders with SDL GPU

**Status: curriculum draft.** Prerequisite: [B's SDL3 application](02-sdl3.md), especially coordinates, resource ownership and the update/render boundary. Return to the [whole path](../../cpp-games-learning-path.md).

The learner can draw using SDL's 2D renderer but does not yet know linear algebra or GPU programming. The project starts by writing pixels to an image file, then explains the computations behind a triangle, a texture and a camera. Only then does the learner express those operations as shaders and assemble an SDL GPU renderer for the same game.

The first GPU deliverable is a correctly cleared window with safe resize behavior. The eventual scene is a simple tabletop: dice as geometry, a board, scores and legal-action indicators. Physical dice simulation is not needed; animation presents a game result already decided by the rules.

Before C01, teach [C00 — Build the picture behind the game](course-openings.md#c00--build-the-picture-behind-the-game). Show the final tabletop and its inspection views, then explain the learner's route from pixels to shaders. Each chapter starts with its visual payoff before the supporting mathematics.

## API and toolchain decisions

Use SDL GPU directly in this part, not an SDL 2D renderer running on a GPU backend. The learner creates a GPU device, uploads resources, records work and writes shaders. The SDL GPU API has explicit shader-format and binding conventions. Teach the convention before creating a shader. [SDL GPU overview](https://wiki.libsdl.org/SDL3/CategoryGPU), [shader creation and bindings](https://wiki.libsdl.org/SDL3/SDL_CreateGPUShader).

Draft shader language: HLSL, introduced as its own small language rather than assumed C++. Use an offline compiler path through SDL_shadercross or a directly documented compiler, pinned and tested when authored. Begin with a verified Vulkan/SPIR-V route on the initial Windows/Linux target. SPIR-V is compiled shader data, not handwritten game implementation. Metal/D3D12 variants are separate portability work with their own format and binding verification; do not advertise them from a Vulkan-only test. The [device-creation contract](https://wiki.libsdl.org/SDL3/SDL_CreateGPUDevice) determines which supplied shader formats can be used.

## Chapter C1 — What is a pixel?

| Lesson | Problem and files | Mechanism and vocabulary | Independent challenge and evidence |
|---|---|---|---|
| C01 — Write an image without a graphics API | Type `explore/image.cpp`, then a small `Image` value that writes a plain PPM file. | Pixel, channel, resolution, row, stride and image format. Explain width × height storage and coordinate-to-index conversion using a tiny grid. | Draw a checker pattern with a different image size. Test corners, indexing and exact file header/data. Open the generated image; a parser test does not prove the intended picture is understandable. |
| C02 — Points and directions differ | Add `math/Vec2` only after two coordinate components repeatedly travel together. | Scalar, vector, component, displacement, length and normalization. Use movements such as (3,4) before square-root notation. Handle the zero vector deliberately. | Move a point by two different directions and compare order. Test a length-five vector and zero behavior. Explain why normalizing a position is not generally a meaningful way to move it. |
| C03 — Cover a triangle | Build a CPU triangle experiment with three points and an inside test. | Vertex, edge, signed area, winding and rasterization: determining which pixel samples a shape covers. Trace an inside, outside and edge sample numerically. | Handle reversed vertex order and a degenerate triangle. Tests inspect selected pixels and bounds; a follow-up seam test exposes the need for a consistent shared-edge rule. |
| C04 — Blend values across the triangle | Add interpolation of vertex colors in the CPU experiment. | Barycentric weights, interpolation and weights summing to one. Start at a vertex and the midpoint of an edge before an arbitrary interior sample. | Predict and compute colors at chosen samples. Check the weights and reconstruct the point. Distinguish computing a weighted color from deciding whether a pixel is inside. |
| C05 — Sample an image | Create a small texture pattern as data and map it onto the CPU shape. | Texture, texel, UV coordinate, nearest sampling, filtering and addressing. A pixel in the output and a texel in the source are different samples. | Compare nearest sampling with a hand-worked bilinear sample. Test edges and out-of-range UV policy. Change source texture size without changing geometry. |

Gate: explain how geometry and source data produce a selected output pixel. The CPU renderer is a learning/reference tool, not a performance competitor with the GPU. Preserve its small reference images for later comparisons.

## Chapter C2 — Move geometry predictably

| Lesson | Problem and files | Mechanism and vocabulary | Independent challenge and evidence |
|---|---|---|---|
| C06 — Scale, rotate, translate | Build separate numerical functions in `explore/transforms.cpp`. | Transformation, angle, degrees/radians, sine/cosine and order of operations. Work a right-angle rotation and a simple translation by hand. | Rotate a rectangle around its center rather than the origin. Test known points and show that translate-then-rotate differs from rotate-then-translate. |
| C07 — Package a transformation as a matrix | Introduce `math/Mat3` after the separate operations become cumbersome. | Matrix, row/column, multiplication, identity and homogeneous coordinate. Declare one column-vector convention and use it consistently. Introduce small operator overloads only after ordinary named functions work. | Compose two transforms and implement the same result with explicit operations. A nonsymmetric example detects transposition mistakes. Explain storage order separately from algebraic convention. |
| C08 — A camera chooses a view | Add a 2D camera before extending examples to `Vec3`. | World space, view space, camera position and inverse transform. Moving the camera right makes stationary scene coordinates move left in view space. | Pan/zoom while preserving click-to-world conversion. Test forward/inverse round-trips and a singular transform rejection; define approximate comparisons. |
| C09 — A 3D point reaches a screen | Introduce `Vec3`, `Mat4`, perspective and a tiny wireframe cube experiment. | Model/view/projection, clip coordinates, homogeneous w, perspective division, normalized device coordinates and viewport. Each space gets a named numeric trace. | Compare near and far equal-size objects. Test a known projection and handle points outside the valid view rather than dividing blindly by zero. Specify depth range and coordinate conventions explicitly. |
| C10 — Which surface is in front? | Extend the CPU experiment with depth and a simple directional-light example. | Depth buffer, depth test, face normal, dot product and diffuse light. Teach cross product in a tiny example before generating a triangle normal. | Reverse draw order and preserve the nearest surface. Test a normal facing toward, sideways and away from the light. Treat nonuniform-scale normal transforms as a later extension, not an unexplained matrix trick. |

Gate: trace one vertex through named spaces and explain why draw order alone cannot solve opaque 3D visibility. Repair an order/convention bug with a known point, not guessed sign changes.

## Chapter C3 — Move the computation to the GPU

| Lesson | Problem and files | Mechanism and vocabulary | Independent challenge and evidence |
|---|---|---|---|
| C11 — CPU submits, GPU executes | Write a small command-timeline experiment, then create `gpu/SdlGpuDevice`. | CPU/GPU, parallel work, device, command buffer, submission and completion. Distinguish recording an operation from executing it. Use the resource-lifetime skills from B. | Classify which objects must stay alive for pending work. The actual app reports selected backend and supported shader formats and fails clearly if the selected path is unavailable. |
| C12 — Clear a GPU window | Claim the existing window for the GPU device, acquire its current presentation texture, record a clear and submit. | Swapchain as a rotating set of presentation images, render pass as a group of drawing operations, load/store choices and minimized/unavailable frame. Keep this example shader-free. | Change the clear color from input and survive minimize/restore. Check a bounded run and visually inspect it. A frame with no acquired texture must not be dereferenced or falsely reported as drawn. |
| C13 — Your first shader is a program | Type tiny HLSL vertex and fragment shader files under `shaders/`. Compile them offline before integrating them. | Shader stage, entry point, input/output semantics, scalar/vector types, compile diagnostics and SPIR-V artifact. A fragment is a candidate contribution to a pixel, not always a final pixel. | Change one output component and predict the image; introduce and repair a real compiler error. A missing or stale shader build must fail the application build rather than silently reuse old output. |
| C14 — A buffer describes vertices | Add a `Vertex` value, GPU buffer and transfer/upload path. | Byte size, stride, offset, format, alignment and staging/transfer buffer. Explain `sizeof` and `offsetof` through the actual layout; never assume a C++ struct packs like a shader struct. | Add a per-vertex color and update both sides of the layout contract. Check byte counts and offsets, then inspect the interpolation. A deliberate stride mismatch is diagnosed with validation/output, not treated as a random graphics glitch. |
| C15 — Assemble a graphics pipeline | Build `gpu/ColoredPipeline` from the taught shaders and vertex layout. | Pipeline state, primitive topology, rasterizer, color target and shader-resource declaration. Teach each setting with an observed effect; do not paste a complete create-info block. | Render a second triangle from new input data. Compare known sample colors with the CPU reference within declared tolerances. Explain which differences are expected at edges and from color encoding. |

Gate: build shaders from source, draw data not hardcoded inside the shader, and explain the entire CPU-to-image route. Every unexplained pipeline field is a lesson-authoring defect.

## Chapter C4 — A useful renderer

| Lesson | Problem and files | Mechanism and vocabulary | Independent challenge and evidence |
|---|---|---|---|
| C16 — A mesh reuses vertices | Add indexed geometry and a `Mesh` owner. | Index buffer, index type, draw count, topology and buffer bounds. Compare two adjacent triangles before introducing a cube. | Build a different rectangle mesh and verify expected triangle connectivity. Catch an out-of-range index in CPU validation before submission. Explain when vertices must be duplicated for different UVs or normals. |
| C17 — Per-frame data is not vertex data | Pass a model/view/projection transform through uniforms. | Uniform, binding, layout/packing and per-draw versus per-frame data. Work out the C++ and HLSL byte contract explicitly. Declare matrix layout and multiplication order. | Move two objects independently with one mesh. Compare a transformed vertex against the CPU math. Test a nonuniform set of matrix values that exposes transposition and padding mistakes. |
| C18 — Upload and sample a texture | Add a `Texture` resource and sampler, using the earlier pattern before an external image decoder. | Upload region, row pitch, sampler state, image origin and texture format. Then introduce a decoder as a dependency whose output is inspected, not trusted blindly. | Flip a deliberately upside-down image and explain which coordinate convention differed. Check bad image handling and reuse the CPU sampling examples as qualitative references. |
| C19 — Depth, light and visible dice | Add a depth target, normals and the simple diffuse light from C10. | Depth attachment, clear value, comparison convention and shader lighting inputs. Begin with uniform scale; document the limit rather than slipping in an unexplained inverse-transpose. | Draw opaque cubes in two orders and compare visible surfaces. Fix a wrong-normal/wrong-space fault. Confirm die face labels show the resolved game value, independent of decorative rotation. |
| C20 — Colors and transparent overlays | Add a small overlay with alpha, then investigate a visibly wrong blend. | Linear light versus encoded sRGB, alpha, straight versus premultiplied alpha, blending and ordering of translucent surfaces. Use numerical color samples before enabling flags. | Blend known colors and match the chosen convention. Keep opaque depth behavior unchanged. A screenshot comparison uses controlled colors/tolerance rather than exact cross-driver bytes. |

## Chapter C5 — Reuse, measure and explain

| Lesson | Problem and files | Mechanism and vocabulary | Independent challenge and evidence |
|---|---|---|---|
| C21 — Replace the view, keep the game | Build a `SceneDescription` from `GameSnapshot` and add a GPU application entry point. | Presentation data, renderer boundary and separating game geometry from rules. Define a minimal interface only now that B and C provide concrete implementations. | Replay the same match with the SDL2D and SDL GPU views and compare every game state. Backend selection must not change random draws, legal actions or agent updates. |
| C22 — Two implementations, one contract | Introduce a small renderer interface and owning selection at the composition root. | Abstract interface, virtual method, override, virtual destructor, runtime polymorphism and object slicing. Contrast with a simple compile-time choice; use the more complex mechanism only for a demonstrated runtime need. | Add a recording renderer that records drawing intent for tests. Verify safe destruction through the base interface and identify one thing the test double cannot verify about real graphics. |
| C23 — Measure before optimizing | Add CPU frame measurements and separate GPU timing where the chosen backend/tool supports it. | Latency, throughput, bottleneck, warm-up and benchmark variability. A submission's CPU duration is not the GPU's execution time. | Compare an intentionally wasteful upload pattern with reuse. Report settings, sample distribution and what was actually measured. Add instancing only after repeated draws create a measured teaching problem. |
| C24 — Independent graphics feature | Choose an orbit camera, alternate board geometry or a texture-atlas overlay; write the design and tests first. | Integration and transfer across math, shader layout, resource ownership and gameplay boundaries. No new reinforcement-learning algorithm is required. | Rebuild from a clean folder, compile all shaders, run validation and demonstrate resize/minimize/close. Explain a chosen pixel's origin and one resource's full lifetime. |

## Project additions

```text
dice-lab/
  include/math/       Vec2.hpp, Vec3.hpp, Mat3.hpp, Mat4.hpp
  src/math/           matching implementation files
  include/render/     Image.hpp, SceneDescription.hpp, Renderer.hpp
  src/render/         CPU image/raster experiments and scene preparation
  include/gpu/        SdlGpuDevice.hpp, Mesh.hpp, Texture.hpp
  src/gpu/            SDL GPU renderer and resource implementations
  shaders/            colored.vert.hlsl, colored.frag.hlsl, textured shaders
  apps/               gpu_game.cpp
  tests/              math_tests.cpp, raster_tests.cpp, scene_tests.cpp
  build/shaders/      compiler-generated artifacts, never source files
```

Pure math types own numeric values. `Mesh` and `Texture` own resources tied to a device. `SceneDescription` contains presentation data with defined coordinate conventions. `Renderer` expresses only common needs proven by working implementations; it is not an engine plugin system. Device/resource order and outstanding-work constraints are part of the diagram, not an appendix.

## Validation and handoff to Vulkan

Author-side checks include CPU numerical references, shader compilation, asset failures, bounded GPU runs, driver/backend reporting and actual image observations. Unit tests of command descriptions cannot establish that pixels reached the screen. Validation must include resized and minimized windows and safe cleanup after a partially created pipeline.

No automatic cross-platform pass is earned from one shader format. Pin the shader compiler and confirm each claimed backend with its generated artifacts. Figures in the lessons require browser checks in addition to mathematical tests. Review shader and C++ diffs for unexplained fields just as carefully as game code.

Next: [D — Vulkan](04-vulkan.md). The learner now understands what is rendered and why. Vulkan teaches the lower-level mechanisms used to schedule and manage that work.
