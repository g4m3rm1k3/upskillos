# Course plan: 3D Modelling, Geometry & Graphics

Status (2026-09-30):
- **Lesson 1.1** is built, as a trial.
- **The MeshLab work the lessons need is done** (see "MeshLab work before the lessons"). Lessons are next.
- **Scope widened** at the user's request. The course now teaches four things together: the maths, the
  algorithms, the computer graphics, and the MeshLab tools.
- **Order of work:** finish the open MeshLab items first (see "MeshLab work before the lessons"), then write
  the lessons.

## What the course teaches

Not only modelling. **Every lesson teaches one idea in four strands:**

| Strand | The question it answers | Example (bevel) |
|---|---|---|
| **Maths** | What is true, and why? | Sliding a corner along its edges; the Bézier profile; why the patch at a corner must fan |
| **Algorithm** | How is it computed, with what data, at what cost? | Walk the selected edges; build the strip and corner patches; update the face list |
| **Graphics** | How does it reach the screen? | Why a sharp edge shades wrongly without a bevel; how normals are shared across it |
| **Tool** | How do you use it in MeshLab (and Blender)? | Select edges, Ctrl+B, drag the width, scroll for segments; the Adjust panel |

By the end, a learner can use each tool as a modeller would. They can also explain the maths behind it, write
the algorithm themselves, and say how the result gets drawn.

## Why a new course

MeshLab lets you model, rig, animate, unwrap and shade, and it shows its algorithms as they run: traces,
Predict mode, heat maps. It does not teach the ideas from the ground up. This course does.

It is not an extension of an existing course:
- **Mesh Engine** is computational geometry for CAM: point-to-mesh distance, bounding volumes, signed
  distance, comparing two models.
- **Three.js** teaches the rendering API.

This course links to both where they overlap, and changes neither.

**Who it is for.** Someone who wants to understand 3D graphics deeply, and to use a modelling tool the way
Blender users do: the same audience as MeshLab.

## The shape of every lesson

Each lesson follows `docs/lesson-writing-standard.md` and has four parts:

1. **Learn: the maths.**
   - The one-sentence target first, then concrete numbers before any formula.
   - Every symbol defined before use, and the technique as a numbered procedure.
   - Maths in LaTeX, tied to the code that computes it.
2. **Build it: the algorithm.**
   - A notebook in which the learner writes the algorithm and sees it drawn with three.js.
   - A graded challenge whose check names what is wrong without giving the fix.
3. **Watch MeshLab do it: the algorithm, inside the tool.**
   - The same operation in MeshLab with Record traces on, stepped through in Predict mode: the learner works
     out each step before it is shown.
   - Or a heat map of the quantity the lesson computes.
   - The learner compares their notebook's numbers with MeshLab's.
4. **Use the tool.**
   - A MeshLab project or challenge (a link built with `meshLabLink`).
   - A short "how a modeller uses this": keys, the Adjust panel, when to reach for it, and the Blender
     equivalent.

The **graphics** strand runs through parts 1–3. For each topic, say what the GPU receives, how it is shaded,
and what goes wrong visibly when the maths or the algorithm is wrong.

## Chapters and lessons (about 70 lessons)

Each row gives the lesson title, then the four strands:
- **Maths**
- **Algorithm:** its data structure and its cost
- **Graphics**
- **MeshLab:** the tool taught, and its project (P) or challenge (C)

✓ marks a built lesson. A "(new)" project or challenge does not exist yet and is made alongside its lesson.

### 1. Meshes as data (7)

| # | Lesson | Maths | Algorithm | Graphics | MeshLab |
|---|---|---|---|---|---|
| 1 ✓ | A mesh is two lists | Vertex list, face list, degree, slot counting | Reading faces back as points; validating lists | Fan triangulation for drawing | Edit mode, G on a vertex; P: two-lists |
| 2 ✓ | Winding and normals | Cross product, right-hand rule, face normal, area | Newell's normal for n-gons | Back-face culling; Flip normals | Normals overlay, Mesh › Flip normals (traced); P: winding-and-normals, C: fix-the-normals |
| 3 ✓ | Edges and neighbours | Edges from faces; manifold and boundary edges | Edge table as a hash map, O(F); neighbour lists | Drawing the wireframe (edge lines) | Wire overlay, status-bar counts (edges, open edges), Edit › Select non-manifold (traced edge table); P: edges-and-neighbours, C: remove-the-fin |
| 4 ✓ | Connected pieces | Graphs, components | Breadth-first search on the face graph | Selection highlighting | Edit › Select linked (face select: traced BFS across shared edges); P: connected-pieces, C: remove-the-floaters |
| 5 ✓ | Euler's formula | V − E + F = 2; genus | Counting from the edge table | Why holes change shading seams (built as: the genus sets how many seam loops an unwrap needs) | Inspector › MESH (Euler V − E + F); traced `mesh.topology()`; P: eulers-formula, link to curvature-gallery |
| 6 ✓ | Welding, cleaning and filling holes | Equality with a tolerance; boundary loops | Spatial hashing to merge close points; compacting indices; filling a hole with consistent winding | Cracks and double edges on screen | Merge at centre, F Fill; C: close-the-box; built with Mesh › Merge by distance (traced spatial hash), traced Fill, P: welding-and-filling |
| 7 ✓ | Files: OBJ and glTF | Index bases (1 in OBJ); buffers | Parsing OBJ; writing glTF buffers | What glTF hands the GPU | File › Import / Export OBJ / GLB (link: Mesh Engine 1.4); traced OBJ read (`scene.fromOBJ`, `scene.toOBJ` in scripts), P: obj-files |

### 2. Vectors, matrices and transforms (8)

| # | Lesson | Maths | Algorithm | Graphics | MeshLab |
|---|---|---|---|---|---|
| 1 ✓ | Vectors, dot and cross | Length, angle, projection | — | Lighting uses dot products | Inspector numbers; Mesh › Measure angle (traced); P: vectors-dot-cross |
| 2 ✓ | Translate, rotate, scale | 3×3 matrices, the 4×4 homogeneous form | Building T·R·S | The model matrix in the vertex shader | Move / Rotate / Scale, the matrix readout; Object › Trace the transform (T·R·S), traced; P: translate-rotate-scale |
| 3 ✓ | Order matters | Non-commuting matrices | Composing and decomposing TRS | Wrong order, visible distortion | Inspector › How it is built: T, R and S; Object › Decompose the matrix (traced, finds shear); P: order-matters |
| 4 ✓ | The determinant | Volume scaling; a negative determinant mirrors | 3×3 determinant | Mirroring flips winding, then faces go dark | Negative scale, the determinant readout; Object › Determinant of the matrix (traced); P: the-determinant |
| 5 ✓ | Hierarchies | world = parent × local | Walking the parent chain | The scene graph | Outliner parenting, Clear parent; Object › Trace the world matrix (parents), traced; P: hierarchies, link to robot-arm |
| 6 ✓ | Local and global axes | Change of basis | Gizmo axes from the matrix columns | Drawing the gizmo | Local axes toggle; Object › Trace the local axes (traced); P: local-and-global-axes |
| 7 ✓ | Euler angles and gimbal lock | Rotation order; singularity | Euler to matrix and back | Visible gimbal lock | Rotation fields (XYZ); Object › Trace the Euler angles (traced); P: gimbal-lock (new: a three-ring gimbal), link to euler-vs-slerp |
| 8 ✓ | Numbers you can type | Grammars and operator precedence | Recursive-descent expression parser | — | Inspector fields accept `pi/4`, `2*1.5`; traced `parse()` in scripts; P: numbers-you-can-type |

### 3. From scene to screen: the rendering pipeline (7)

| # | Lesson | Maths | Algorithm | Graphics | MeshLab |
|---|---|---|---|---|---|
| 1 ✓ | Cameras | The view matrix as an inverse transform; look-at | Orbit, pan, zoom | Camera space | Viewport navigation, Frame selected / all; Object › Trace the view matrix (camera), traced; P: cameras |
| 2 ✓ | Projection | Perspective divide; orthographic; field of view | Building projection matrices | Clip space, NDC | View › Perspective / Front / Right / Top, and a new View › Orthographic / perspective (5); Object › Trace the projection (camera), traced; P: projection |
| 3 ✓ | Rasterization | Barycentric coordinates; edge functions | Filling triangles, interpolating | Per-pixel attributes | (notebook-only software rasterizer; links to the projection project, Wire) |
| 4 ✓ | The depth buffer | Depth precision, z-fighting | Z-test | Polygon offset for outlines | X-ray toggle; Inspector › Camera › Near, far (new); Object › Trace the depth buffer (camera), traced; P: depth-buffer |
| 5 ✓ | Flat and smooth shading | Vertex normals as weighted averages | Area/angle-weighted normals; split normals at hard edges | Faceted versus smooth | Shade smooth / flat, and a new Object › Shade auto smooth (30°); Mesh › Trace the vertex normal, traced; P: flat-and-smooth |
| 6 ✓ | Lines, outlines and overlays | Screen-space width | Inverted-hull silhouette; the stencil test that keeps it outside the body | Why a hull alone shows through creases, and how the stencil fixes it | Selection outline, Wire, Grid, Axes; new View › Outline stencil on / off and Object › Trace the outline width (camera), traced; P: outlines, link to crate |
| 7 ✓ | A camera you can place, and a still image | Camera as an object; lookAt as a change of basis; tall and wide field of view | Rendering offscreen at a size; hiding overlays | Resolution, aspect, the frame | Add › Camera, 0 look through, Render still; Object › Trace look-at (new, traced); P: camera-and-still (new), link to island-flythrough |

### 4. Interacting with 3D: how a modelling tool works (7)

| # | Lesson | Maths | Algorithm | Graphics | MeshLab |
|---|---|---|---|---|---|
| 1 ✓ | Picking by ray | The ray from the mouse through the inverse projection | Ray–triangle intersection (Möller–Trumbore) | Hover highlight | Click-select objects, faces; Object › Trace picking (camera, the image centre), traced; P: picking |
| 2 ✓ | Picking in screen space | Distance from a point to a segment | Nearest vertex or edge on screen | Why thin things need a pick radius | Vertex / edge select, bones; Mesh › Trace screen picking (scene camera, image centre), traced; P: screen-picking |
| 3 ✓ | Box and loop selection | Point-in-rectangle after projection; edge loops through quads | Box select; the loop walk (straight on at 4-edge vertices, stop at poles) | Selection colours | B box select, Alt+click loop select; with Record traces on, Alt+click traces the loop walk; P: loops |
| 4 ✓ | Dragging with a gizmo | Projecting mouse motion onto an axis or plane | Axis and plane constraints; snapping to the grid | Gizmo drawing | G/R/S, X/Y/Z, Snap; Object › Trace a gizmo drag (scene camera), traced; P: gizmo-drag |
| 5 ✓ | The knife | A screen line is a plane through the eye; plane–edge intersection | Split faces crossed twice; share edge vertices so no cracks | Front faces only, or through with X-ray | K Knife; knife trace expanded (plane, crossings, split); P: knife-cut |
| 6 ✓ | Undo and redo | State as a value | Snapshots and the command pattern; the redo stack | — | Ctrl+Z / Ctrl+Shift+Z, one undo per operation; Edit › Trace the undo stack (new, traced); P: undo-redo |
| 7 ✓ | Every click is code | Serialising actions | The GUI → code recorder | — | Script › GUI → code log; Script › Trace the GUI → code log (replay it), new; P: every-click |

### 5. Modelling operations (9)

| # | Lesson | Maths | Algorithm | Graphics | MeshLab |
|---|---|---|---|---|---|
| 1 ✓ | Extrude | Offsetting along a normal | Copy the region, build walls on its boundary edges; one normal per region | Shading of the new walls | E; P: crate |
| 2 ✓ | Inset | Offsetting a polygon inwards; mitres | Per face and as a region | Support for bevels and panels | I, Inset individual; P: crate |
| 3 ✓ | Edge rings and loop cuts | Walking opposite edges of quads | Ring traversal; splitting | Edge flow | Ctrl+R Loop cut; P: character-model |
| 4 ✓ | Bevel | Sliding corners along edges; Bézier profiles | Strips, corner patches, fans | Catching highlights on edges | Ctrl+B, segments; P: crate, dining-set |
| 5 ✓ | Dissolve and delete | Keeping the shape while merging faces | Merging faces across an edge; removing vertices | n-gons and how they are drawn | Ctrl+X Dissolve, Delete |
| 6 ✓ | Merge and smooth vertices | Averages; Laplacian smoothing as one step | Merge at centre; neighbour average | — | Merge at centre, Smooth vertices |
| 7 ✓ | Mirror and modifiers | Reflection matrices | A non-destructive modifier stack; welding on the mirror plane | The cage versus the evaluated mesh | Mirror modifier, Apply modifiers; P: character-model |
| 8 ✓ | Box modelling a character | Topology planning | A sequence of operations | Silhouette | P: character-model |
| 9 ✓ | Clean topology | Quads, poles, n-gons | Measuring valence | How topology affects shading and deformation | P: support-loops |

### 6. Subdivision (5)

| # | Lesson | Maths | Algorithm | Graphics | MeshLab |
|---|---|---|---|---|---|
| 1 ✓ | Corner cutting | Chaikin in 2D; limit curves | Repeated averaging | Smooth curves from coarse ones | notebook |
| 2 ✓ | Catmull–Clark | Face, edge and vertex points; (F̄ + 2R̄ + (n−3)V)/n | One subdivision step with the edge table | Smooth-shaded result | Subdivide smooth; P: predict-catmull-clark |
| 3 ✓ | Extraordinary vertices and limits | Valence ≠ 4; limit positions | Levels and cost (×4 faces a level) | Pinching near poles | Subdivision modifier levels |
| 4 ✓ | Keeping edges sharp | Support loops pull the limit surface | Adding loops, measuring volume | Hard-surface looks | P: support-loops; C: keep-it-a-box |
| 5 ✓ | Subdividing UVs | Catmull–Clark on a UV mesh; affine reproduction; boundaries kept | UV vertices = same vertex and same UV; seams as boundaries | Texture distortion on the smoothed surface (1.49 → 1.32 mean on a sphere) | Subdivision modifier › Smooth UVs |

### 7. Geometry on a surface: discrete differential geometry (8)

| # | Lesson | Maths | Algorithm | Graphics | MeshLab |
|---|---|---|---|---|---|
| 1 ✓ | Fields on a mesh and colour maps | A value per vertex; interpolation | Mapping values to colours (turbo, cool-warm) | Vertex colours | Heat map › Height (y), the legend |
| 2 ✓ | The Laplacian | Umbrella average to cotan weights | Sparse matrix assembly | — | P: smoothing |
| 3 ✓ | Mean curvature | Laplacian of position | Per-vertex H with the mixed area | Heat map | Heat map › Mean curvature (H); P: curvature-gallery |
| 4 ✓ | Gaussian curvature | Angle defect; Gauss–Bonnet | Summing angles | Heat map | Heat map › Gaussian curvature (K) |
| 5 ✓ | Sparse linear systems | Symmetric positive-definite systems | Conjugate gradients; iteration counts | — | Trace iteration counts; P: knot-distance |
| 6 ✓ | Distance on a surface | The heat method: diffuse, normalise, solve | Two sparse solves | Contour lines | Heat map › Distance from selected vertices; P: knot-distance; C: farthest-point |
| 7 ✓ | Smoothing as heat flow | Implicit versus explicit steps; shrinkage | Implicit smoothing | Before and after | Smooth vertices; P: smoothing |
| 8 ✓ | Level sets and contours | Marching along edges | Contour extraction per triangle | Contour lines | Contours on any heat map (link: Mesh Engine thresholds) |

### 8. UVs (6)

| # | Lesson | Maths | Algorithm | Graphics | MeshLab |
|---|---|---|---|---|---|
| 1 ✓ | What UVs are | A map from the surface to the plane | Per-corner attributes (wedges) | Texture lookup | UV tab, checker texture |
| 2 ✓ | Seams and charts | Cutting a surface into discs | Charts by BFS across non-seam edges | Visible seams | Mark seam, Seams from sharp; C: six-squares |
| 3 ✓ | Projection | Planar and cylindrical maps | Project from above | Stretching on steep faces | Project from above; P: island |
| 4 ✓ | Conformal maps and LSCM | Cauchy–Riemann, least squares, pins | Sparse CG solve per chart | Checker squares stay square | Unwrap (LSCM); P: unwrap-basics |
| 5 ✓ | Measuring distortion | Singular values σ₁/σ₂ of the 2×2 Jacobian | Per-triangle SVD | Distortion heat map | Angle distortion heat map |
| 6 ✓ | Straighten and pack | Minimal bounding box (rotating calipers) | Shelf packing | Texel density | The UV layout; P: dining-set |

### 9. Shading and textures (7)

| # | Lesson | Maths | Algorithm | Graphics | MeshLab |
|---|---|---|---|---|---|
| 1 ✓ | Light and the cosine law | Lambert, irradiance | Per-pixel N·L | The fragment shader | Shader model: Lambert; P: shader-gallery |
| 2 ✓ | Highlights | Phong, Blinn–Phong, the half vector | Specular exponent | Shininess | Blinn–Phong, Shininess |
| 3 ✓ | Physically based shading | Microfacets, Fresnel, energy conservation | GGX, Smith, Schlick | Roughness and metalness | PBR model |
| 4 ✓ | Stylised shading | Quantising light | Toon bands | Outlines with toon | Toon model |
| 5 ✓ | Debug views | Normals and UVs as colours | Encoding vectors in RGB | Finding bad normals and UVs | Normals and UV shader models |
| 6 ✓ | Procedural textures | Periodic functions, noise | Checker, grid, bricks, wood, grass | Texture scale, repeating | Texture choices; P: dining-set, island |
| 7 ✓ | Write a shader | GLSL, colour space and tone mapping | Compiling; mapping error lines | Shader errors | Custom GLSL (C: toon shader, new) |

### 10. Animation (7)

| # | Lesson | Maths | Algorithm | Graphics | MeshLab |
|---|---|---|---|---|---|
| 1 ✓ | Keyframes | Piecewise functions of time | Sampling keys at a frame | Redrawing per frame | I to key, the Timeline; P: bouncing-ball |
| 2 ✓ | Interpolation and easing | Linear, ease-in/out; s = t² for gravity | Easing functions | Motion that reads as weight | Interpolation per key; C: land-on-20 |
| 3 ✓ | Quaternions | Rotations on the 4D unit sphere | Euler ⇄ quaternion | — | Rotation mode |
| 4 ✓ | Slerp | Great-circle interpolation, constant speed | Slerp and its shortest-path sign | Smooth turns | P: euler-vs-slerp |
| 5 ✓ | Motion through a hierarchy | Composition over time | Baking world motion into keys | Motion paths | P: robot-arm, island-flythrough (a camera keyed with lookAt and slerp) |
| 6 ✓ | A walk cycle | Contact, down, passing, up; loops | Cyclic keys | Foot sliding | P: walk-cycle |
| 7 ✓ | Animation in files | Channels and samplers | Writing a glTF animation clip | Playback elsewhere | Export GLB with animation |

### 11. Rigging and skinning (8)

| # | Lesson | Maths | Algorithm | Graphics | MeshLab |
|---|---|---|---|---|---|
| 1 ✓ | Bones | The bone's frame, from its head, tail and roll | Rest matrix B | Drawing bones | Add › Armature, bones mode (Tab), E extrude |
| 2 | Posing | Posed P, skin S = P·B⁻¹ | Walking the bone chain | Pose mode | Ctrl+Tab pose; P: tentacle |
| 3 | Roll and editing joints | Rotation about the bone's own axis | Moving joints together | Rest pose while editing | Bone roll, joint drag |
| 4 | Linear blend skinning | Weighted sum of matrices | Per-vertex blend on the CPU or GPU | The skinning vertex shader | Bind to armature; P: walk-and-wave |
| 5 | Automatic weights | Heat diffusion from bones | A sparse solve per bone; limits and normalising | Weight heat map | Heat map › Bone weights |
| 6 | Weight painting | Brush falloff (1 − (d/r)²)²; normalising | Dabs, mirror by bone name | Painting in the viewport | Weight paint mode; P: fix-a-bad-rig; C: fix-the-chest |
| 7 | The candy wrapper and dual quaternions | Dual numbers; blending rigid motions | DQS | Volume kept at twisting joints | Skin panel › Blend; P: candy-wrapper |
| 8 | Skins in files | Four influences per vertex | Limiting and renormalising; glTF skins | Skinned mesh on the GPU | Limit to 4 bones, Export GLB |

### 12. Modelling by code (5)

| # | Lesson | Maths | Algorithm | Graphics | MeshLab |
|---|---|---|---|---|---|
| 1 | The scene API | — | Building meshes from lists and primitives | — | Script panel; P: island; C: staircase |
| 2 | Parametric surfaces | Surfaces of revolution; tubes along curves | Generating grids of vertices and quads | Normals from parameters | P: knot-distance, python-vase |
| 3 | Python in the browser | — | Pyodide; bridging two languages | — | Python scripts; P: python-vase |
| 4 | Recording algorithms | Instrumentation | How traces and Predict questions are made | Showing a trace in the viewport | Record traces, Algorithm trace |
| 5 | A capstone model | All of the above | Plan, script, check | Render a still | A capstone challenge (new) |

## MeshLab tool coverage

Every MeshLab tool is taught in at least one lesson. When a tool is added to MeshLab, add a row here and a
place in a lesson.

| MeshLab | Taught in |
|---|---|
| File: New, Open, Save | 1.7 (as data formats), 12.1 |
| File: Import OBJ/glTF, Export OBJ, Export GLB | 1.7, 10.7, 11.8 |
| Edit: Undo, Redo | 4.6 |
| Edit: Duplicate, Delete, Select all | 5.5, 4.3 |
| Edit: Select linked | 1.4 |
| Edit: Select non-manifold; status-bar edge and open-edge counts | 1.3 |
| Inspector: MESH section (counts, Euler V − E + F, pieces) | 1.3, 1.5 |
| Mesh: Merge by distance | 1.6 |
| Mesh: Measure angle | 2.1 |
| Object: Trace the transform (T·R·S) | 2.2 |
| Object: Decompose the matrix | 2.3 |
| Object: Determinant of the matrix | 2.4 |
| Object: Trace the world matrix (parents) | 2.5 |
| Object: Trace the local axes | 2.6 |
| Object: Trace the Euler angles | 2.7 |
| Script: parse("…") (the number-field parser, traced) | 2.8 |
| Object: Trace the view matrix (camera) | 3.1 |
| Object: Trace the projection (camera); View: Orthographic / perspective (5) | 3.2 |
| Object: Trace the depth buffer (camera); Inspector: camera Near, far | 3.4 |
| Object: Shade auto smooth (30°); Mesh: Trace the vertex normal | 3.5 |
| View: Outline stencil on / off; Object: Trace the outline width (camera) | 3.6 |
| Object: Trace look-at | 3.7 |
| Object: Trace picking (camera) | 4.1 |
| Mesh: Trace screen picking | 4.2 |
| Edit: Alt+click loop (traced with Record traces on) | 4.3 |
| Object: Trace a gizmo drag | 4.4 |
| Edit: Trace the undo stack | 4.6 |
| Script: Trace the GUI → code log (replay it) | 4.7 |
| Add: primitives, Empty, Armature | 12.1, 2.5, 11.1 |
| Mesh: Extrude, Inset (region), Inset individual | 5.1, 5.2 |
| Mesh: Bevel edges | 5.4 |
| Mesh: Loop cut | 5.3 |
| Mesh: Subdivide faces, Subdivide smooth | 6.1, 6.2 |
| Mesh: Merge at centre, Smooth vertices | 5.6, 7.7 |
| Mesh: Flip normals | 1.2 |
| Mesh: Fill (F) | 1.6 |
| Mesh: Dissolve, Delete | 5.5 |
| UV: Mark seam, Clear seam, Seams from sharp | 8.2 |
| UV: Unwrap (LSCM), Project from above | 8.4, 8.3 |
| UV: Angle distortion heat map, UV layout | 8.5, 8.6 |
| Heat map: distance, H, K, height, bone weights | 7.6, 7.3, 7.4, 7.1, 11.5 |
| Object: Edit mode, Shade smooth/flat | 1.1, 3.5 |
| Object: Mirror and subdivision modifiers, Apply | 5.7, 6.3 |
| Object: Clear parent | 2.5 |
| Object: Insert keyframe, Clear animation | 10.1 |
| Object: Bind, Unbind, Pose mode, Clear pose | 11.4, 11.2 |
| View: Frame, Front/Right/Top, Perspective | 3.1, 3.2 |
| Add: Camera, Camera from this view; View: Look through, Align camera, Render still; Inspector: Camera | 3.7, 10.5 |
| Toolbar: Move, Rotate, Scale, Local axes, Snap | 2.2, 2.6, 4.4 |
| Toolbar: Grid, Axes, Normals, Wire, X-ray | 3.6, 1.2, 1.3, 3.4 |
| Toolbar: Record traces | 12.4 (and part 3 of most lessons) |
| Inspector: transform, matrices, expressions, material | 2.2–2.4, 2.8, chapter 9 |
| Outliner: parenting by drag | 2.5 |
| Timeline: keys, interpolation, playback | 10.1, 10.2 |
| UV tab | chapter 8 |
| Shader tab: models, textures, custom GLSL | chapter 9 |
| Script tab: JavaScript, Python, Step through | 12.1–12.3 |
| GUI → code log | 4.7 |
| Algorithm trace, Predict mode | 12.4 (and part 3 of most lessons) |
| Weight paint mode: brush, mirror, normalise | 11.6 |
| Bones mode: select, drag joints, extrude, roll | 11.1, 11.3 |
| Skin panel: blend method, limit influences | 11.7, 11.8 |
| Examples and challenges gallery; guide steps that tick | every lesson's part 4 |
| Edit: Select loop (Alt+click) | 4.3 |
| Mesh: Knife (K) | 4.5 |
| Subdivision modifier: Smooth UVs | 6.5 |

## MeshLab work before the lessons

These are the open items in `docs/meshlab-status.md`, which lessons 3.7, 4.3, 4.5 and 6.5 depend on:

1. ~~More challenges, one per project group, and guides whose steps tick themselves.~~ Done 2026-09-30, along with Fill (F).
2. ~~A camera object; a fly-through of the island; rendering a still to a PNG.~~ Done 2026-09-30.
3. ~~Knife and loop select; the outline showing through concave creases; UV smooth.~~ Done 2026-09-30.

Also needed by lessons:
- `?example=<id>` links, which load a script example.
- The challenges marked "new" in the tables above. They are made alongside their lessons, not in advance.

## How lessons are built and checked

**Conventions, from lesson 1.1:**
- **Notebook:** a `JSNotebook` visualization, with `props: { lesson: { title, subtitle, cells } }`. Its cell types
  are `js`, `challenge` (with `check`, `solutionCode`) and `markdown`.
- **Picture cells:** each loads three.js with a dynamic `import()` from jsDelivr, because a cell runs as a
  classic script inside a sandboxed iframe. The shared drawing code is one string, appended to each cell.
- **Challenge checks:** read the learner's answer from the code without running it, and name what is wrong.
  The tests in `src/courses/modelling-geometry/lessons.test.js` check each kind of mistake, and check that
  console-only cells print what the prose says. They also check that every MeshLab link names a real project or
  challenge.
- **Bridge callouts:** the app adds generic "Bridge: …" callouts (`unifiedLessonEnhancer.js`) to any lesson
  without its own, and the rigor one talks about driving analytics. Each lesson therefore writes its own three,
  with the same titles.
- **Links:** in-app links in lesson prose (`#/lab/...`) open in the same tab (`MarkdownProse.jsx`).
- **Numbers in the text:** every numeric claim is computed by a cell or checked against MeshLab's tested code.
  The course test proves the cells print what the text says.

**Each lesson:**
- Run `node scripts/validate-lesson-schema.mjs`, `node scripts/check_js_cells.mjs --files` and
  `node scripts/check_latex.mjs --files`.
- Run `npx vitest run src/courses/modelling-geometry`.
- **Open it in a browser:** run every cell, and follow the MeshLab link.
- After adding lessons, run `npm run facts`.

**Files:** `src/courses/modelling-geometry/<N>-<chapter>/<NNN>-<slug>.js`. Lesson ids are unique across all
courses and never change once published.

## Progress

| Lesson | File | State |
|---|---|---|
| 1.1 A mesh is two lists | `src/courses/modelling-geometry/1-meshes-as-data/001-vertices-and-faces.js` | Built; checked in the browser. Gets a part 3 once lesson 1.2 fixes the pattern. **Open:** its `semantics` symbols are written `$…$`, but the semantics list passes the symbol straight to KaTeX, so 6 show as errors (`$v_i$`, `$n$`, `$f = …$`, `$|f|$`, `$\deg(v)$`, `$M = (V, F)$`); drop the dollars and put words in `\text{…}`. Left for the user, who reviews old lesson files |
| 1.2 Winding and normals | `src/courses/modelling-geometry/1-meshes-as-data/002-winding-and-normals.js` | Built; checked in the browser (cells, pictures, graded check, both MeshLab links). Notebook pictures use `notebookScene.js` (`withPicture`); notebook cell text does not render `$…$` maths, so cells use plain numbers |
| 1.3 Edges and neighbours | `src/courses/modelling-geometry/1-meshes-as-data/003-edges-and-neighbours.js` | Built; checked in the browser. MeshLab gained a traced edge-table build (`EditMesh.edgeTable`, `mesh.edgeTable()` in scripts), Edit › Select non-manifold (Shift+Ctrl+Alt+M) and edge counts in the status bar. Notebook checks share `faceList.js` (`readFaces`, `edgeTable`) |
| 1.4 Connected pieces | `src/courses/modelling-geometry/1-meshes-as-data/004-connected-pieces.js` | Built; checked in the browser. MeshLab gained `EditMesh.pieces` (traced breadth-first search; `mesh.pieces()` in scripts); Select linked in face select now follows shared edges (it used to follow shared vertices, as vertex and edge select still do). The notebook picture helper colours faces by piece (`groups`) |
| 1.5 Euler's formula | `src/courses/modelling-geometry/1-meshes-as-data/005-eulers-formula.js` | Built; checked in the browser. MeshLab gained `EditMesh.topology` (V, E, F, χ, pieces, boundary loops, genus; traced, with Predict questions on χ and genus; `mesh.topology()` in scripts). Projects must not name an object "Cube" (the project test uses that name to check the default cube is gone) |
| 1.6 Welding, cleaning and filling holes | `src/courses/modelling-geometry/1-meshes-as-data/006-welding-and-filling.js` | Built; checked in the browser. `EditMesh.weld(tol)` with tol > 0 is now a real spatial hash (own cell and the 26 round it, nearest within tol); it used to round to a grid and could miss points either side of a cell wall. tol 0 (used by import) is unchanged. Traced weld and fill; Mesh › Merge by distance (0.001, adjustable) |
| 1.7 Files: OBJ and glTF | `src/courses/modelling-geometry/1-meshes-as-data/007-obj-and-gltf.js` | Built; checked in the browser. `parseOBJ` is traced. Also fixed two older bugs in Mesh Engine Lab's project loader (shared engine): `editor.tracing` (should be `traceEnabled`, so trace projects never turned tracing on) and `runPython` called with its arguments swapped. **Chapter 1 complete** |
| 2.1 Vectors, dot and cross | `src/courses/modelling-geometry/2-vectors-and-transforms/001-vectors-dot-and-cross.js` | Built; checked in the browser. MeshLab gained Mesh › Measure angle (`EditMesh.measure`, traced, `mesh.measure(a, b, c)` in scripts). The notebook picture helper shades faces by computed values (`values`) |
| 2.2 Translate, rotate, scale | `src/courses/modelling-geometry/2-vectors-and-transforms/002-translate-rotate-scale.js` | Built; checked in the browser. MeshLab gained Object › Trace the transform (`core/transformTrace.ts`, `object.traceTransform()` in scripts) |
| 2.3 Order matters | `src/courses/modelling-geometry/2-vectors-and-transforms/003-order-matters.js` | Built; checked in the browser. MeshLab gained Object › Decompose the matrix (`traceDecompose` in `core/transformTrace.ts`, `object.decompose()` in scripts). The shear example is a child turned under an unevenly scaled parent |
| 2.4 The determinant | `src/courses/modelling-geometry/2-vectors-and-transforms/004-the-determinant.js` | Built; checked in the browser. MeshLab gained Object › Determinant of the matrix (`traceDeterminant`, `object.determinant()` in scripts) |
| 2.5 Hierarchies | `src/courses/modelling-geometry/2-vectors-and-transforms/005-hierarchies.js` | Built; checked in the browser (5 cells, picture, graded check, both MeshLab links). MeshLab gained Object › Trace the world matrix (parents) (`traceWorld` in `core/transformTrace.ts`, `object.traceWorld()` in scripts) |
| 2.6 Local and global axes | `src/courses/modelling-geometry/2-vectors-and-transforms/006-local-and-global-axes.js` | Built; checked in the browser (5 cells, picture, graded check, MeshLab link; Mesh Engine Lab opened too). MeshLab gained Object › Trace the local axes (`traceAxes` in `core/transformTrace.ts`, `object.traceAxes(point)` in scripts): columns, unit axes, right-angle check, a move, and a change of basis (by the inverse when the axes are sheared). Notebook axis sticks need a half-width of about 0.06, or their outlines hide their colour |
| 2.7 Euler angles and gimbal lock | `src/courses/modelling-geometry/2-vectors-and-transforms/007-euler-angles-and-gimbal-lock.js` | Built; checked in the browser (5 cells, gimbal picture, graded check, both MeshLab links). MeshLab gained Object › Trace the Euler angles (`traceEuler` in `core/transformTrace.ts`, `object.traceEuler()` in scripts: build Rx·Ry·Rz, decode, lock check) and the `gimbal-lock` project (three nested torus rings as a parent chain). MeshLab has no rotation-order setting: it is always XYZ, so the plan's "Rotation mode" became the Rotation fields plus the trace. Notebook console output collapses runs of spaces in the browser; join numbers with ", " |
| 2.8 Numbers you can type | `src/courses/modelling-geometry/2-vectors-and-transforms/008-numbers-you-can-type.js` | Built; checked in the browser (5 cells, parse-tree SVG, graded check, MeshLab link). `core/expr.ts` now has `traceExpr` (traced, with an error position) and `evalExpr` runs through it; scripts get `parse(text)`. Fixed: the parser deleted all spaces first, so "1 2" read as 12; spaces now separate tokens. Game Studio's fields use the same parser (tests pass, lab opened). The challenge is graded from the code alone: JSNotebook passes `check` the previous run's logs, not this run's. **Chapter 2 complete** |
| 3.1 Cameras | `src/courses/modelling-geometry/3-from-scene-to-screen/001-cameras.js` | Built; checked in the browser (5 cells, camera picture, graded check, MeshLab link). New chapter folder `3-from-scene-to-screen`. MeshLab gained Object › Trace the view matrix (camera) (`traceView` in `core/camera.ts`, `camera.traceView(point)` in scripts). The challenge check evaluates a whitelisted arithmetic expression (Math, lo, hi, fov only). Exported check names must be unique across the course: the test file imports them all |
| 3.2 Projection | `src/courses/modelling-geometry/3-from-scene-to-screen/002-projection.js` | Built; checked in the browser (5 cells, frustum-to-cube picture, graded check, MeshLab link). MeshLab gained Object › Trace the projection (camera) (`traceProjection` in `core/camera.ts`, `camera.traceProjection(point)`; `Editor.renderSize` follows the render size) and a real orthographic viewport: `Viewport.setOrthographic` swaps in an OrthographicCamera sized to match, View › Orthographic / perspective (5) in MeshLab and Mesh Engine Lab, and Front/Right/Top switch to it as in Blender (checked in the browser: picking, zoom, switching back). Before this, Front/Right/Top were perspective. `show()` in notebookScene.js takes an optional `zoom`. A bold heading with "$1$" in it left a stray $ on the page; "$+1$" renders |
| 3.3 Rasterization | `src/courses/modelling-geometry/3-from-scene-to-screen/003-rasterization.js` | Built; checked in the browser (6 cells including a 32 × 32 canvas rasterizer, graded check, MeshLab link). No MeshLab change, as planned: MeshLab leaves rasterizing to WebGL. Cells that draw on a canvas are tested with a stub `document` |
| 3.4 The depth buffer | `src/courses/modelling-geometry/3-from-scene-to-screen/004-the-depth-buffer.js` | Built; checked in the browser (6 cells including a z-fighting canvas, graded check, MeshLab link). MeshLab gained Object › Trace the depth buffer (camera) (`traceDepth` in `core/camera.ts`, `camera.traceDepth(a, b)`), Near and far fields for cameras in the Inspector (`Editor.setCameraClip`; `camera.near` / `camera.far` in scripts), and looking through a camera now applies its near and far (they were set without updating the projection). KaTeX via check_latex rejects `n_{\min}`; use `\text{min}`. Quiz tolerances on tiny numbers must be set explicitly (the default is 0.01 absolute) |
| 3.5 Flat and smooth shading | `src/courses/modelling-geometry/3-from-scene-to-screen/005-flat-and-smooth-shading.js` | Built; checked in the browser (6 cells, three-cylinder picture, graded check, MeshLab link; MeshLab's viewport checked too). MeshLab gained auto smooth: `core/normals.ts` (`cornerNormals`, `traceVertexNormal`), `SceneObject.autoSmooth` (degrees), the viewport draws split corner normals (`toGeometryUV` takes them, UVs optional), Object › Shade auto smooth (30°), Shade smooth clears it as in Blender, Mesh › Trace the vertex normal (one vertex); scripts: `object.autoSmooth`, `mesh.vertexNormal(v, { weight })`. `show()` takes `shading` (per-corner normals) for smooth pictures |
| 3.6 Lines, outlines and overlays | `src/courses/modelling-geometry/3-from-scene-to-screen/006-lines-outlines-and-overlays.js` | Built; checked in the browser (5 cells, side-by-side stencil picture, graded check, both MeshLab links). MeshLab gained `OUTLINE_THICKNESS` (shared by the viewport shader and the trace), `traceOutline` in `core/camera.ts` (`camera.traceOutline(point)`), Object › Trace the outline width (camera), and `ViewOptions.outlineStencil` with View › Outline stencil on / off. The crease artefact does not show on a plain L-shaped block; it does on a box with a recessed panel (prototyped in the browser first), so the project and the picture use that |
| 3.7 A camera you can place, and a still image | `src/courses/modelling-geometry/3-from-scene-to-screen/007-a-camera-and-a-still.js` | Built; checked in the browser (5 cells, two real stills, graded check, both MeshLab links). MeshLab gained `traceLookAt` in `core/camera.ts` (the same numbers as `lookAtRotation`, worked out; `object.traceLookAt(point)`) and Object › Trace look-at, which aims the selected camera at the first mesh. **Chapter 3 complete** |
| 4.1 Picking by ray | `src/courses/modelling-geometry/4-interacting-with-3d/001-picking-by-ray.js` | Built; checked in the browser (5 cells, ray picture, graded check, MeshLab link). New chapter folder `4-interacting-with-3d`. MeshLab gained `core/pickRay.ts` (`rayFromPixel`, `rayTriangle` (Möller–Trumbore), `tracePick`; tested against three.js's Raycaster), `Editor.pickables()`, Object › Trace picking, `camera.tracePick(px, py)` |
| 4.2 Picking in screen space | `src/courses/modelling-geometry/4-interacting-with-3d/002-picking-in-screen-space.js` | Built; checked in the browser (5 cells, canvas picture, graded check, MeshLab link). The viewport's vertex and edge picking moved into `core/screenPick.ts` (`nearestPoint`, `nearestSegment`, `pointSegment`, `traceScreenPick`), so the viewport and the trace share one code path; `Editor.screenPointsOf`, Mesh › Trace screen picking, `camera.tracePickNear(object, px, py, kind)`. The test file is plain JS: no TypeScript `!` |
| 4.3 Box and loop selection | `src/courses/modelling-geometry/4-interacting-with-3d/003-box-and-loop-selection.js` | Built; checked in the browser (5 cells, sphere-loops picture, graded check, MeshLab link). `EditMesh.edgeLoop(a, b, trace)` is now traced (each vertex reached, why it goes on or stops; quizzes on the next vertex and the length); Alt+click traces it with Record traces on; `mesh.loop(a, b)` in scripts. A misplaced doc comment above `edgeLoop` (it was `edgeRing`'s) moved to `edgeRing` |
| 4.4 Dragging with a gizmo | `src/courses/modelling-geometry/4-interacting-with-3d/004-dragging-with-a-gizmo.js` | Built; checked in the browser (6 cells, drag picture, graded check, MeshLab link). MeshLab gained `core/gizmoDrag.ts` (`closestOnAxis`, `traceAxisDrag`, `SNAP` shared with the viewport's gizmo), `Editor.snap` (follows the toolbar), Object › Trace a gizmo drag, `camera.traceDrag(object, axis, dx, dy, snap)`. MeshLab's G/R/S only switch the gizmo's mode; there are no Blender-style modal G X keys (noted in the lesson) |
| 4.5 The knife | `src/courses/modelling-geometry/4-interacting-with-3d/005-the-knife.js` | Built; checked in the browser (6 cells, cut-slab picture, graded check, MeshLab link). `core/knife.ts`'s trace was one summary step; it now has Plane, Crossings (a quiz on the first t) and Split (a quiz on faces cut) |
| 4.6 Undo and redo | `src/courses/modelling-geometry/4-interacting-with-3d/006-undo-and-redo.js` | Built; checked in the browser (6 cells, stacks picture, graded check, MeshLab link). MeshLab gained `Editor.traceUndo` and Edit › Trace the undo stack; project guide steps can read `StartState.undo` (the undo stack's length at open). A new `Editor()` has no mesh: tests add one. Re-setting a value an object already has is not a change and does not clear redo |
| 4.7 Every click is code | `src/courses/modelling-geometry/4-interacting-with-3d/007-every-click-is-code.js` | Built; checked in the browser (6 cells, two-scenes picture, graded check, MeshLab link). MeshLab gained `core/logReplay.ts` (`traceReplay`: replays the log on the scene from before the first logged step in a fresh Editor and compares `sceneHash`), Script › Trace the GUI → code log (replay it). A project's own script is logged as one entry. **Chapter 4 complete** |
| 5.1 Extrude | `src/courses/modelling-geometry/5-modelling-operations/001-extrude.js` | Built; checked in the browser (6 cells, grid/caps/walls picture with flat shading, graded check, MeshLab links). New Learning project `extrude` (grid, two faces extruded together, traced). The extrude trace's border-edge label now pluralises correctly. Notebook and engine build the same walls in the same order (lessons.test.js checks) |
| 5.2 Inset | `src/courses/modelling-geometry/5-modelling-operations/002-inset.js` | Built; checked in the browser (6 cells, L region and 2 × 1 face picture, graded check, MeshLab links). The region inset (`modelling.ts insetRegion`) now traces each outline vertex's mitre (φ, sin(φ/2), distance, capped at 5t) with a Predict question on the first bent corner. New Learning project `inset`. The challenge check evaluates only arithmetic and Math functions (it runs in the page, not the sandbox) |
| 5.3 Edge rings and loop cuts | `src/courses/modelling-geometry/5-modelling-operations/003-edge-rings-and-loop-cuts.js` | Built; checked in the browser (6 cells, two-cuts tube picture, graded check, MeshLab links). `EditMesh.edgeRing(a, b, trace?)` is now traced quad by quad (Predict: the exit edge) and says why it stopped; the loop cut passes its trace in and asks for one new vertex. New Learning project `loop-cuts` (8-sided tube). Mesh Engine Lab opened without errors after the engine changes |
| 5.4 Bevel | `src/courses/modelling-geometry/5-modelling-operations/004-bevel.js` | Built; checked in the browser (6 cells, N · L highlight picture, graded check, MeshLab links). `bevelEdges` is now traced: Width (and clamp), the first Slide (Predict), the first Profile point (Predict), Corners per end vertex (what replaces each face corner), Strips, Patches; the summary now counts strips and patch faces separately. New Learning project `bevel` (named Block: projects may not leave an object called Cube). Engine counts checked in lessons.test.js (one edge × 3 segments: 9 faces; all edges × 1: V 24, E 48, F 26) |
| 5.5 Dissolve and delete | `src/courses/modelling-geometry/5-modelling-operations/005-dissolve-and-delete.js` | Built; checked in the browser (6 cells, fan-versus-ear-clipping picture, graded check, MeshLab link). **New `core/triangulate.ts`** (`faceTriangles`: a fan for convex faces, ear clipping for concave ones, traced): drawing (`EditMesh.triangulate`, `toGeometryUV`), picking (`pickRay`) and contours (`geometry.triangles`) now use it, so concave n-gons from dissolves draw correctly. Mesh › Trace drawing the face (`Editor.traceTriangulateOf`). Dissolve traces the shared edges and the outline walk (Predict: the next vertex). New Learning project `dissolve` (5 × 5 grid). Mesh Engine Lab opened without errors |
| 5.6 Merge and smooth vertices | `src/courses/modelling-geometry/5-modelling-operations/006-merge-and-smooth-vertices.js` | Built; checked in the browser (6 cells, checkerboard-under-a-low-light picture, graded check, MeshLab links). `mergeVerts` asks where the centre is and counts faces that lost corners or collapsed; smoothing shows the vertex that moves most and asks where it goes. New Learning project `merge-smooth` (a checkerboard of bumps, one step: 0.15 → 0.0375). The merge guide step waits for the logged label "Merge at centre" |
| 5.7 Mirror and modifiers | `src/courses/modelling-geometry/5-modelling-operations/007-mirror-and-modifiers.js` | Built; checked in the browser (6 cells, reversed-versus-unreversed picture, graded check, MeshLab links). The mirror modifier is now traceable: Object › Trace the mirror modifier (`Editor.traceMirrorOf`), `obj.traceMirror()` in scripts, with a Predict question on a reflected vertex. New Learning project `mirror` (half box, clipped extrusion). Modifier order checked in lessons.test.js (seam top 1.089 mirror-first, 0.938 subdivide-first). check_latex treats `latex` fields as prose: write transposes as `n\,n^{\mathrm{T}}` |
| 5.8 Box modelling a character | `src/courses/modelling-geometry/5-modelling-operations/008-box-modelling-a-character.js` | Built; checked in the browser (6 cells, front-facing sphere picture, graded check, MeshLab links). **New `core/silhouette.ts`** (`traceSilhouette`: front-facing test with a Predict question, then silhouette edges); Object › Trace the silhouette (scene camera) (`Editor.traceSilhouetteOf`), `obj.traceSilhouette()` in scripts. New Learning project `box-character` (the character built step by step, cage counted after each operation; front camera). The cell-1 counting rules predict every step MeshLab logs |
| 5.9 Clean topology | `src/courses/modelling-geometry/5-modelling-operations/009-clean-topology.js` | Built; checked in the browser (6 cells, cube-sphere poles picture, graded check, MeshLab links). **New `core/valence.ts`** (`traceValence`: valence heat map with a Predict question, face kinds, the pole budget Σ(4 − valence) = 4χ); Object › Trace clean topology (valence, poles), `mesh.valence()` in scripts. New Learning project `clean-topology` (quad ball, UV sphere, torus). `notebookScene.show()` now outlines each face by its own edges instead of `EdgesGeometry`, so bent quads no longer show a diagonal. **Chapter 5 complete** |
| 6.1 Corner cutting | `src/courses/modelling-geometry/6-subdivision/001-corner-cutting.js` | Built; checked in the browser (5 cells, canvas picture of the square, one step and five, graded check, link ahead to predict-catmull-clark). Notebook-only as planned; lessons.test.js checks the cubic rule against the engine's Catmull–Clark border rule |
| 6.2 Catmull–Clark | `src/courses/modelling-geometry/6-subdivision/002-catmull-clark.js` | Built; checked in the browser (6 cells, cube at levels 0–3 picture, graded check, MeshLab links). No engine change: the existing traced `catmullClark` and project `predict-catmull-clark` cover it; lessons.test.js checks the cell's corner and the bump challenge against the engine |
| 6.3 Extraordinary vertices and limits | `src/courses/modelling-geometry/6-subdivision/003-extraordinary-vertices-and-limits.js` | Built; checked in the browser (6 cells, spinning top shaded by face size, graded check, MeshLab link). **New `core/limit.ts`** (`limitPosition`: the limit mask with a Predict question, then four more levels showing convergence and the ring ratio; `ccLambda(n)`); Mesh › Trace the limit position (one vertex), `mesh.limit(v)`. New Learning project `limits` (8-sided spinning top). Cell 3 measures λ(n) and matches the closed form |
| 6.4 Keeping edges sharp | `src/courses/modelling-geometry/6-subdivision/004-keeping-edges-sharp.js` | Built; checked in the browser (4 cells, three cubes picture, graded check, links to the support-loops project and the keep-it-a-box challenge). No engine change; lessons.test.js checks the notebook's volumes against the project's (35%, 93%) |
| 6.5 Subdividing UVs | `src/courses/modelling-geometry/6-subdivision/005-subdividing-uvs.js` | Built; checked in the browser (5 cells, canvas picture of smooth vs linear UVs, graded check, MeshLab link). `subdivideUV` takes a trace (UV vertices, borders kept, one inside point with a Predict question); `traceUVSubdivision` in uv.ts adds the distortion comparison; UV › Trace subdividing the UVs (`Editor.traceUVSubdivisionOf`), `obj.traceUVSubdivision(levels)`. New Learning project `subdivide-uvs` (12 × 8 ball, one seam: 1.49 → 1.32). Note: smooth UVs reproduce a projection exactly inside an island, not on its kept border where the surface's border moves. **Chapter 6 complete** |
| 7.1 Fields on a mesh and colour maps | `src/courses/modelling-geometry/7-geometry-on-a-surface/001-fields-and-colour-maps.js` | Built; checked in the browser (6 cells, turbo-coloured hill, graded check, MeshLab link). **`traceColourMap` in fields.ts** (range, Normalise with a Predict question on t, colour, blending between vertices); Heat map › Trace the colour mapping (`Editor.traceColourMapOf`), `mesh.traceColours()`. `notebookScene.show()` gained `colors` (per-vertex sRGB, blended by the GPU). New Learning project `fields` (hill coloured by height) |
| 7.2 The Laplacian | `src/courses/modelling-geometry/7-geometry-on-a-surface/002-the-laplacian.js` | Built; checked in the browser (6 cells, canvas of umbrella vs cotan on a flat fan, graded check, MeshLab links). **New `core/laplacianTrace.ts`** (`traceVertexLaplacian`: neighbours, umbrella, cotan weights with a Predict question, area, Δx and H); Mesh › Trace the Laplacian (one vertex), `mesh.laplacianAt(v)`. New Learning project `laplacian` (sphere of radius 2: H ≈ 0.4973). Challenge note: tan 60° + tan 30° = cot 60° + cot 30°, so a tangent slip is indistinguishable there |
| 7.3 Mean curvature | `src/courses/modelling-geometry/7-geometry-on-a-surface/003-mean-curvature.js` | Built; checked in the browser (6 cells, dented ball coloured by H, graded check, MeshLab links). `meanCurvature(mesh, trace?)` is traced (Laplacian of position, Sign with a Predict question, Range) when Heat map › Mean curvature is shown with Record traces on. New Learning project `mean-curvature` (dented ball: dent H ≈ −1). Notebook compares barycentric and mixed Voronoi areas (typical error 0.077 → 0.068). |
| 7.4 Gaussian curvature | `src/courses/modelling-geometry/7-geometry-on-a-surface/004-gaussian-curvature.js` | Built; checked in the browser (6 cells, torus coloured by K, graded check, MeshLab links). `gaussianCurvature(mesh, opts, trace?)` traced (angle sums, one vertex's defect with a Predict question, Gauss–Bonnet total vs 2πχ) when Heat map › Gaussian curvature is shown with Record traces on. New Learning project `gaussian-curvature` (torus: total 0). Guide text must not write "Add › Cube": the Add menu's items come from a list the menu test cannot read |
| 7.5 Sparse linear systems | `src/courses/modelling-geometry/7-geometry-on-a-surface/005-sparse-linear-systems.js` | Built; checked in the browser (6 cells, residual-vs-iteration plot, graded check, MeshLab links). **New `core/sparseTrace.ts`** (`traceHeatSolve`: the matrix with a Predict question on a row's non-zeros, SPD check, CG residuals, Jacobi for comparison); Heat map › Trace the heat solve (one vertex), `mesh.solveHeat(v)`. New Learning project `sparse-solve` (sphere: CG 45, Jacobi 310) |
| 7.6 Distance on a surface | `src/courses/modelling-geometry/7-geometry-on-a-surface/006-distance-on-a-surface.js` | Built; checked in the browser (6 cells, slotted sheet coloured by distance, graded check, links to two projects and the farthest-point challenge). heatGeodesic's Poisson-solve trace step gained a Predict question (a source neighbour's distance). New Learning project `geodesic-distance` (32 × 16 globe: equator 1.5645, south pole 3.1290). Note: the notebook sheet's diagonals all lean one way, so edge paths are exact towards (1, 1) and staircase (2 vs √2) towards (1, −1) |
| 7.7 Smoothing as heat flow | `src/courses/modelling-geometry/7-geometry-on-a-surface/007-smoothing-as-heat-flow.js` | Built; checked in the browser (6 cells, three smooth-shaded spheres: bumpy, explicit λ = 2 ×3, implicit, graded check, MeshLab links). **New `smoothImplicit` in geometry.ts** ((M + tC) x' = M x, t = strength·h², boundary and unselected vertices fixed; traced: the system with a Predict question on a diagonal entry, the solves, the shrinkage); Mesh › Smooth vertices (implicit) with strength and iterations in Adjust, `mesh.smoothImplicit({ strength })`. New Learning project `implicit-smoothing` (roughness 2.29% → explicit 0.81%, λ = 1.5 4.71%, implicit 0.82%). Note: one implicit step on a unit sphere gives exactly 1/(1 + 2t), not backward Euler on R; triangle neighbours damp more than quad neighbours, so the notebook picture needs λ = 2 |
| 7.8 Level sets and contours | `src/courses/modelling-geometry/7-geometry-on-a-surface/008-level-sets-and-contours.js` | Built; checked in the browser (6 cells, canvas contour map of two hills, graded check, MeshLab and Mesh Engine Lab links). **New `core/contourTrace.ts`** (`traceContour`: classify, one triangle with a Predict question on t, every crossed triangle, join into loops and open chains); trace steps gained `lines` (drawn in the viewport); Heat map › Trace the iso-line (middle of the range), `mesh.isoLine(values, level)`. New Learning project `level-sets` (two hills: 1 open, 1, 2, 1, 0 loops); the notebook's contour code gives identical counts and lengths. `StartState` gained `trace`, for steps that need a new trace. **Chapter 7 complete** |
| 8.1 What UVs are | `src/courses/modelling-geometry/8-uvs/001-what-uvs-are.js` | Built; checked in the browser (5 cells, two checker cubes: per-corner vs per-vertex UVs, graded check, MeshLab links). **New `core/uvLookup.ts`** (`traceUVLookup`: a face's corner UVs, the wedge count, the UV at its centre with a Predict question, the texel and checker square); UV › Trace a texture lookup (one face), `obj.traceUVLookup(face)`. New Learning project `what-uvs-are` (box: 8 vertices, 24 wedges; globe cut on one meridian: 114 → 121); lessons.test.js checks the challenge's 121 against the engine |
| 8.2 Seams and charts | `src/courses/modelling-geometry/8-uvs/002-seams-and-charts.js` | Built; checked in the browser (5 cells, the cube's cross net unfolded on a canvas with wedge labels, graded check, MeshLab links). **New `core/chartTrace.ts`** (`traceCharts`: the seams with a Predict question on the chart count, each chart's flood, the disc test χ = W − E + F = 1 with one rim, the wedges); UV › Trace the charts (seams → pieces), `mesh.charts()`. New Learning project `seams-and-charts` (a can cut at its rims: the tube has χ = 0 and two rims; a copy opened with one more seam). lessons.test.js checks the net's 14 wedges against the engine's `charts` |
| 8.3 Projection | `src/courses/modelling-geometry/8-uvs/003-projection.js` | Built; checked in the browser (5 cells, a sphere drawn pixel by pixel under three projections, graded check, MeshLab links). **New `core/projection.ts`** (`cylinderUV` with the wrap fix; `traceUVProjection`: axis and scale, one vertex's UV with a Predict question, the wrap-around faces, the stretch field); UV › Project around (cylinder); Project from above is now traced; `mesh.unwrap({ method: 'cylinder' })`. New Learning project `uv-projection` (a sigmoid cliff from above: worst 1.94; an open pillar around: 1.003). The name `traceProjection` was taken by the camera trace (lesson 3.2) |
| 8.4 Conformal maps and LSCM | `src/courses/modelling-geometry/8-uvs/004-conformal-maps-and-lscm.js` | Built; checked in the browser (6 cells, the dome's two UV layouts as rings and spokes, graded check, MeshLab links). `lscm` in uv.ts gained two traced steps: Pins (a Predict question on the second pin's u) and Angles kept (σ₁/σ₂ and the area-scale range). New Learning project `conformal-unwrap` (a dome: LSCM mean 1.079 against 3.261 projected). The notebook's own LSCM on the dome gives the engine's numbers exactly (mean 1.0735, worst 1.215); lessons.test.js checks it. A re-unwrap that gives identical UVs logs nothing, so guide steps must change something |
| 8.5 Measuring distortion | `src/courses/modelling-geometry/8-uvs/005-measuring-distortion.js` | Built; checked in the browser (6 cells, Tissot's indicatrix on a dome from above and stereographic, graded check, MeshLab links). **New `core/distortionTrace.ts`** (`triangleJacobian`, `singularValues`, used by uv.ts's `triangleDistortion` too; `traceDistortion`: local frame, J with a Predict question on its top-left entry, σ₁ and σ₂, the whole mesh's mean, worst, relative area spread and flips); UV › Trace the distortion (one face), `obj.traceDistortion(face)`. New Learning project `measuring-distortion` (globe on one meridian seam: equator 1.11, pole 1.33, area spread 31.6×) |
| 8.6 Straighten and pack | `src/courses/modelling-geometry/8-uvs/006-straighten-and-pack.js` | Built; checked in the browser (5 cells, 24 boxes on their shelves, graded check, MeshLab links). `pack` in uv.ts is traced (Straighten, True area with a Predict question on the scale, Shelves, Fit with fill and texel density); unwrap's last step is now called Result. New Learning project `pack-charts` (a 3 × 0.4 × 1.2 plank: 40.6% of the square used, 200.8 texels per unit on every face). **Chapter 8 complete** |
| 9.1 Light and the cosine law | `src/courses/modelling-geometry/9-shading-and-textures/001-light-and-the-cosine-law.js` | Built; checked in the browser (5 cells, two balls lit in linear light, encoded and not, graded check, MeshLab links). **New `core/shadingTrace.ts`** (`shadePoint`: the fragment shader's arithmetic for Lambert, Blinn–Phong, toon, normals and UV, exact up to the sRGB encoding; textbook Cook–Torrance for PBR; steps Vectors (N, L, V arrows), Ambient, the model's terms with a Predict question, Result); Mesh › Trace the shading (one vertex), `obj.traceShading(v, { eye })`; `editor.viewEye` set by the viewport each frame. New Learning projects `cosine-law` and `highlights` (for 9.2) |
| 9.2 Highlights | `src/courses/modelling-geometry/9-shading-and-textures/002-highlights.js` | Built; checked in the browser (5 cells, three Blinn–Phong balls, graded check, MeshLab links). Uses the shading trace (half vector, highlight with a Predict question on s); `traceShading` takes `{ eye }` so scripts are repeatable. Learning project `highlights` (peaks 0.99, 0.99, 0.87 at shininess 5, 40, 200: the narrow one falls between vertices) |
| 9.3 Physically based shading | `src/courses/modelling-geometry/9-shading-and-textures/003-physically-based-shading.js` | Built; checked in the browser (5 cells, six balls plastic/metal × roughness, graded check, MeshLab link). Shading trace's PBR branch (D, Fresnel with a Predict question, Smith, energy). Learning project `pbr-materials`. Notebook shows GGX normalised to 1 and single-scatter energy 1.00, 0.97, 0.56 for roughness 0.15, 0.4, 0.8. Don't run vitest while the probe runs: cells time out |
| 9.4 Stylised shading | `src/courses/modelling-geometry/9-shading-and-textures/004-stylised-shading.js` | Built; checked in the browser (5 cells, Lambert / toon / toon with outline, graded check, MeshLab links). Shading trace's toon branch (Bands with a Predict question, Rim). Learning project `toon-shading` (bands 1, ⅔, ⅓, 0 down the ball) |
| 9.5 Debug views | `src/courses/modelling-geometry/9-shading-and-textures/005-debug-views.js` | Built; checked in the browser (6 cells, a sphere in the Normals and UV views, graded check, MeshLab links). Shading trace's normals branch (Encode with a Predict question). Learning project `debug-views` (a box with face 0 flipped shows the front face's blue; a globe in the UV view). 8-bit normals: worst 0.38° |
| 9.6 Procedural textures | `src/courses/modelling-geometry/9-shading-and-textures/006-procedural-textures.js` | Built; checked in the browser (5 cells, every texture repeated ×2, graded check, MeshLab links). shading.ts: `texelColor(name, u, v)` (textureRGBA uses it, output identical); **grass now tiles** (integer turns, was sin(91.7u)) and **brick shades are periodic** (mod 4 / mod 8: the half brick split by a repeat had two shades); wood documented as not tiling. **New `core/textureTrace.ts`** (`traceTexture`: repeat, the formula with a Predict question on the cell/row/stripe, colour); UV › Trace the texture formula (one face), `obj.traceTexture(face)`. Learning project `procedural-textures` (six tiles). Notebook formulas checked equal to the engine's texels |
| 9.7 Write a shader | `src/courses/modelling-geometry/9-shading-and-textures/007-write-a-shader.js` | Built; checked in the browser (6 cells, clipped vs Reinhard highlight with an editable shade(), graded check, MeshLab links). **New `core/shaderTrace.ts`** (`lintShaderBody`: brackets, semicolons, int literals in float maths, a return; `traceShaderAssembly`: frame, where the body lands with a Predict question on the error-line mapping, main(), checks); Object › Trace assembling the shader, `obj.traceShader()`. New Learning project `write-a-shader` (a rim light with pow(…, 3)) and **new challenge `toon-shader`** (4 bands, outline at N·V < 0.3, passes the checks). **Chapter 9 complete** |
| 10.1 Keyframes | `src/courses/modelling-geometry/10-animation/001-keyframes.js` | Built; checked in the browser (5 cells, graph editor of x and y with key dots, graded check, MeshLab links). **New `core/animTrace.ts`** (`traceSample`: keys, t, ease with a Predict question on s, blend with a Predict question on the value (linear), or for quaternion rotation the slerp steps with a Predict question on the weight; `traceQuaternion`: per-axis half-angle quaternions with a Predict question on w, product, axis and angle); Object › Trace sampling the keys (this frame) and Object › Trace the quaternion; `obj.traceSample(channel, frame)`, `obj.traceQuaternion()`. New Learning projects `keyframes`, `easing`, `quaternions`, `slerp-turn` (for 10.1–10.4). Script rotation mode is `obj.rotationMode`, not `obj.animation.rotationMode` (that is a copy) |
| 10.2 Interpolation and easing | `src/courses/modelling-geometry/10-animation/002-interpolation-and-easing.js` | Built; checked in the browser (5 cells, the four s(t) curves and four drop strobes, graded check, MeshLab links incl. land-on-20). Learning project `easing` (four balls; ease-in matches free fall 2.813, 2.250). Probe markers must not rely on runs of spaces (the page collapses them) |
| 10.3 Quaternions | `src/courses/modelling-geometry/10-animation/003-quaternions.js` | Built; checked in the browser (5 cells, an arrow swept round the (1, 1, 1) axis, graded check, MeshLab links). Uses `traceQuaternion` (Object › Trace the quaternion). Learning project `quaternions` (y by 0/90/180/360°; an arrow at (60°, 30°, 0°)). Notebook helper names must not shadow the notebook's global `show` |
| 10.4 Slerp | `src/courses/modelling-geometry/10-animation/004-slerp.js` | Built; checked in the browser (5 cells, an arrow tip's path by Euler and by slerp, graded check, MeshLab links). Slerp branch of `traceSample`; Learning project `slerp-turn` (two boxes; slerp steady 41.3° per 6 frames). Finding: for these keys the Euler blend turns evenly (47.7° a step) but 191° in all for a 165° change; lerp is the uneven one (35°, 47°, 47°, 35°) |
| 10.5 Motion through a hierarchy | `src/courses/modelling-geometry/10-animation/005-motion-through-a-hierarchy.js` | Built; checked in the browser (5 cells, arm ghosts with the pen's path and its baking, graded check, MeshLab links). **`worldAt` and `traceBake` in animTrace.ts** (world matrix at any frame from each link's keys; bake samples with a Predict question on the key count, and the worst gap); Object › Trace baking world motion (every 3 frames), `obj.traceBake(n)`. Learning project `hierarchy-motion` (gaps 0.0067, 0.0302, 0.1197 for 3, 6, 12 frames, matching the notebook). Gotcha: the script `parent` setter keeps the world position, so set local positions after parenting |
| 10.6 A walk cycle | `src/courses/modelling-geometry/10-animation/006-a-walk-cycle.js` | Built; checked in the browser (5 cells: four poses with exact straight-leg stance keys, the loop, sliding for three sweeps, a strobe of one leg, graded check; MeshLab links). **`traceFootSlide` in animTrace.ts** (Path, Contact, Slide, Loop; the loop step quizzes the frame that must match the first); Object › Trace foot sliding (active bone, 24-frame cycle), `rig.traceFootSlide(bone, cycle, ground)`. Learning project `walk-sliding` reuses the walk-cycle keys (`walkKeys`): planted frames 4–7, 28–31, …, worst slide 0.1744, loop error 0 |
| 10.7 Animation in files | `src/courses/modelling-geometry/10-animation/007-animation-in-files.js` | Built; checked in the browser (5 cells: channels, sampler bytes, baking error for keys every 24/4/1 frames, the fall curve with baked keys, graded check; MeshLab link). **`traceClip` in animTrace.ts** (Channels, Times, Values, Interpolation, Bytes; quizzes a key time and the bytes); File › Trace the glTF clip, `scene.traceClip()`. io.test.ts checks the trace against the exported GLB's own JSON (channels, paths, per-sampler time accessors, float bytes, duration). Learning project `gltf-clip` (3 channels, 49 keys, 2548 bytes, matching the notebook). **Chapter 10 complete** |
| 11.1 Bones | `src/courses/modelling-geometry/11-rigging-and-skinning/001-bones.js` | Built; checked in the browser (6 cells: direction, shortest turn, roll, B and B⁻¹, bones drawn with their axes, graded check; MeshLab link). **New `boneTrace.ts`**: `traceRestMatrix` (Direction, Turn, Roll, Matrix; quizzes length and angle) and `tracePose` (Chain, Pose per bone, Skin matrix; for 11.2); Object › Trace the rest matrix / Trace posing the bone, `rig.bone(n).traceRest()` / `.tracePose()`. Learning project `bone-frames` (the notebook's axes are tested against `restMatrix`) |
| 11.2 Posing | `src/courses/modelling-geometry/11-rigging-and-skinning/002-posing.js` | Built; checked in the browser (6 cells: one bone posed, the chain, parents first vs children first, the skin matrix S = P · B⁻¹, rest and pose drawn with one vertex, graded check; MeshLab links). Learning project `pose-chain` (Arm rig bound to an arm tube; Trace posing the bone, Hand's tail (0, 1.2543, 1.9489)). The notebook's posed ends and skin matrix are tested against `posedEnds` and `boneMatrices` |

## Size

About 70 lessons, which is **12–18 agent sessions** at 4–6 lessons a session. Before that come about 2–3
sessions of MeshLab work.

The bottleneck is verification, not writing. Every cell has to be run, every number tested, and every lesson
opened in a browser. The notebook-only software rasterizer (3.3) and the knife (4.5) are the largest single
pieces.

## Open questions for review

1. **Name.** The scope is now wider than modelling. Working title: "3D Modelling, Geometry & Graphics". The
   folder and id stay `modelling-geometry`, because lesson 1.1's id already uses it. Only the label shown to
   learners changes.
2. **Order.** Chapter 3 (rendering) and chapter 4 (interaction) could come before chapter 2 for someone who
   wants to see the screen side first. As written, the maths of transforms comes first, because both depend
   on it.
3. **Python.** Notebooks are in JavaScript, because three.js runs natively. Should some lessons also offer a
   Python version (MeshLab runs both)?
4. **Depth of proofs.** Give short proofs in full (Euler's formula, Gauss–Bonnet on a polyhedron). For long
   ones (the heat method's convergence, LSCM's optimality), state them and check them with numbers.
