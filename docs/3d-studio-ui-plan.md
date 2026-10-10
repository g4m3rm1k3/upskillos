# UI design through the C# 3D studio

Status: native layout, interaction and dark/light theme lessons authored, 2026-10-10. UI quality is a continuing teaching strand, tied to concrete editor and game tasks.

## Placement and current capability

The first redesign follows saved per-object box dimensions. A learner now has an actual select/inspect/resize/undo/reopen workflow and can observe the scattered controls it creates. That supplies the reason to reorganize the UI before adding more authoring tools.

- [Layout and visual hierarchy](../src/labs/project-studio/tracks/games3d-foundations/10-ui-layout.md): task observation, a spacing grid, named color roles, grouped property readouts, shared draw/hit geometry and clipped world drawing.
- [Interaction states](../src/labs/project-studio/tracks/games3d-foundations/10a-ui-interactions.md): measured text with ellipses, enabled/hovered/unavailable states, contextual explanations, mouse/keyboard presets sharing editor commands and typed file-failure feedback.

- [Coherent dark/light modes](../src/labs/project-studio/tracks/games3d-foundations/10b-ui-themes.md): complete semantic palettes for panels, viewport, grid and objects; one mouse/F6 preference operation; preserve scene, selection and undo/redo. Dark is the startup default; preference persistence remains later work.

The result remains a fixed-size native Raylib UI with the supplied bitmap font, global keyboard shortcuts and read-only value cards. It is not yet a general GUI toolkit, numeric-entry inspector, resizable viewport, font system or accessible desktop application. World drawing is cropped from the existing projection; a dedicated correctly proportioned viewport/render target needs a later resource-lifetime lesson.

## Repeated UI milestones

| Place in the series | Concrete need | Concepts and evidence |
| --- | --- | --- |
| Current box editor | Find an object and understand how to change it | Grouping, alignment, spacing, hierarchy, contrast, coherent dark/light modes, text measurement and control states; compare the same task before/after and protect data/history |
| Numeric property editing | Enter an exact position, size or name | Text editing, parse-versus-domain validation, focus, commit/cancel, keyboard navigation, validation messages and one undo entry per committed edit |
| Fonts and resizable views | Read labels comfortably at different sizes and fit a real scene viewport | Font assets/glyph coverage, loading and unloading, typography styles, DPI/text scaling, minimum sizes, responsive layout and camera aspect ratio; preserve content and input regions at tested sizes |
| First playable game | Understand goals, consequences and restart | HUD hierarchy, health/goal/progress feedback, menus, pause, win/loss/restart and equivalent non-color/non-audio signals |
| Reusable props and asset library | Browse, search and preview assets | Content density, thumbnails, clear missing-asset states, search/filter feedback and consistency between preview and authored instances |
| Q-learning tools | Distinguish training, frozen evaluation and policy decisions | Readable tables/charts, labels and scales, progress/stop/failure states, Q-value inspection and reproducible experiments; do not confuse decorative animation with learning evidence |
| Genre games | Support different interaction demands | Racing readability at speed, puzzle affordances, strategy selection and RPG inventory/transactions; keep the task and game camera central |
| Delivery and usability | Make the tool usable beyond its author's machine | Observed beginner tasks, keyboard/focus access, screen-reader/platform accessibility strategy, touch/controller needs, localization, font licensing/export and tested platform behavior |

Feature suggestions are placed by prerequisites and the task that makes them useful. Do not interrupt core game progress with an unrelated complete UI framework. Keep visual critique and interaction behavior together; a button must look, hit, execute and report coherently.

## Design review and teaching evidence

For each UI task, specify what the learner should find and do. Compare the same content and window size. Inspect normal, selected, hovered, unavailable, empty and failure states. Record mistakes and search behavior rather than inventing success times or claiming learner testing that did not occur.

Use the W3C [contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) as a design reference, checking actual text/background pairs. A palette check is not full accessibility validation; native bitmap pixels are not CSS points. Do not rely on color alone to communicate selection or failure. Hover hints supplement always-visible labels and shortcuts; hover is not keyboard focus.

Every lesson includes a prediction, a deliberate visible or behavioral defect and repair, an independent design/control change with hints, and evidence limits. Validate domain behavior separately from graphics and native input. The [verification record](3d-studio-opening-verification.md) distinguishes author checks, bounded screenshots, actual human input and pending learner evidence.
