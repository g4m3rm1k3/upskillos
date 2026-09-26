<div align="center">

# UpSkillOS

### The technical ladder is open to everyone. UpSkillOS is the climb.

**A free, open-source interactive learning OS — built around active, visual, intuition-first learning.**

[**▶ Open the App**](https://upskillos.io) · [**Download for Windows**](https://github.com/g4m3rm1k3/upskillos/releases/latest) · [**Contribute**](CONTRIBUTING.md) · [**Discussions**](https://github.com/g4m3rm1k3/upskillos/discussions)

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://reactjs.org)
[![D3](https://img.shields.io/badge/D3.js-7-f9a03c?logo=d3.js&logoColor=white)](https://d3js.org)
[![Three.js](https://img.shields.io/badge/Three.js-0.168-black?logo=three.js)](https://threejs.org)
[![Pyodide](https://img.shields.io/badge/Pyodide-0.26-37763b?logo=python&logoColor=white)](https://pyodide.org)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/g4m3rm1k3/upskillos?style=social)](https://github.com/g4m3rm1k3/upskillos)

</div>

---

## What It Is

UpSkillOS is a complete STEM learning environment that runs entirely in the browser — no account, no subscription, no install required. It is the only open-source platform that combines university-level curriculum, real interactive coding environments, physics and CNC simulations, a built-in AI tutor, and a WYSIWYG lesson authoring system in a single free application.

<!-- facts:headline -->
**1213 lessons. 41 courses. 49 interactive labs and simulators. 15 games built on real math and physics. All free. All open source.**
<!-- /facts:headline -->

---

## Why This Exists

Learning math, science, and engineering is hard. The tools that make it work — interactive platforms, tutoring, simulation software, MATLAB — are expensive. The students who need them most are the ones least able to afford them.

The result is a compounding disadvantage. Students at well-resourced institutions get interactive labs, tutoring, and software licenses. Everyone else gets PDFs and YouTube. That gap is not about ability. It is about access.

At the same time, the economy is moving fast up the technical stack. CNC programmers, data scientists, electronics technicians, embedded systems engineers — these roles are in high demand, pay well, and are genuinely reachable from a standing start. The barrier is not aptitude. It is the cost and friction of getting from zero to employable.

UpSkillOS exists to close that gap. Not with watered-down content, but with the same depth a strong university course would cover — delivered through an environment that actually works for how people learn.

---

## What Makes It Different

| | UpSkillOS | Khan Academy | Coursera | MATLAB |
|---|---|---|---|---|
| Runs fully offline | ✅ | ❌ | ❌ | ❌ |
| Live Python in browser | ✅ | ❌ | ❌ | ❌ |
| CNC / G-Code simulator | ✅ | ❌ | ❌ | ❌ |
| Open source + self-host | ✅ | ❌ | ❌ | ❌ |
| WYSIWYG lesson builder | ✅ | ❌ | ❌ | N/A |
| University-level depth | ✅ | Partial | ✅ | N/A |
| Free forever | ✅ | ✅ | ❌ | ❌ |
| No account required | ✅ | ❌ | ❌ | ❌ |

---

## The Learning Model

Every lesson follows the same contract — **Hook → Intuition → Math → Rigor → Practice → Verify**:

1. **Hook** — a real-world question that makes the concept feel necessary before defining it
2. **Intuition** — visual, concrete, example-driven understanding first
3. **Math** — precise formal treatment once the intuition is solid
4. **Rigor** — proof or derivation for learners who need to know *why*
5. **Examples** — worked problems with full step-by-step solutions
6. **Challenges** — practice problems to test active recall
7. **Checkpoints** — progress tracking so nothing gets skipped
8. **Quiz** — spaced retrieval at the end of every lesson

This structure is not cosmetic. It is the architecture of the lesson files in the codebase.

---

## Current Scale

| | Count |
|---|---|
<!-- facts:scale -->
| Lessons | **1213** |
| Courses | **41** |
| Interactive labs & simulators | **49** |
| Games built on real math & physics | **15** |
<!-- /facts:scale -->
| Code environments (Python, JS, C++, SQL, React) | **5** |
| Lesson-aware AI tutor interactions | Unlimited |

---

## What's Inside

<!-- facts:courses-heading -->
### 41 Courses
<!-- /facts:courses-heading -->

<details>
<summary>View course highlights</summary>

The generated [project inventory](docs/generated/project-inventory.md#courses) contains the complete current list.

| Course | Depth | Environments |
|---|---|---|
| Pre-Calculus | Functions, trig, transformations | Graphing, solver |
| Geometry | Proofs, constructions, similarity | Synchronized visualizations |
| Calculus | Limits, derivatives, integration, series | Step-by-step solver, graphing |
| Physics | Mechanics, kinematics, waves, energy | Physics lab, simulations |
| Chemistry | Elements, reactions, molecular structure | Periodic table lab |
| Discrete Math | Logic, sets, induction, graph theory | Proof visualizations |
| Linear Algebra | Vectors, matrices, transformations, eigenvalues | OpenMAT, 3D lab |
| Computer Science | Logic, circuits, algorithms | Digital electronics lab |
| Digital Fundamentals | Signals, binary, logic gates | Logic simulator |
| CNC Macro Systems | G-Code, kinematics, macro programming | CNC simulator |
| G-Code Interpreter | Build a parser from first principles | Live coding |
| Python Programming | Core language, data structures, algorithms | Pyodide notebooks |
| Data Science | NumPy, Pandas, ML foundations | Pyodide notebooks |
| AI Engineering | LLMs, agents, production AI systems | Live Python |
| JavaScript Core | Language and runtime fundamentals | Live JS environment |
| Web Systems | DOM, reactivity, APIs | Live React environment |
| Data Structures & Algorithms | Memory, structures, algorithmic thinking | Live coding + visualizations |
| Dynamic Programming | Classic patterns, overlapping subproblems | Live coding |
| 3D Graphics & Three.js | GPU pipeline, WebGL, Three.js | Live 3D environment |
| Three.js Part 2 | Advanced Three.js from first principles | Live 3D environment |
| HTML Canvas | 2D graphics, animation | Canvas lab |
| Interface Design | Visual hierarchy, spacing, design systems | Live design lab |
| Git Systems | Content-addressable storage, branching | Live terminal |
| Build Tetris | Complete guided project — empty file to shipped game | Live coding |
| SQL Fundamentals | Queries, joins, aggregation | SQL environment |
| Python + SQL | Relational model + Python | Pyodide + SQL |
| NoSQL Databases | Document stores, CAP theorem | Live coding |
| Applied Statistics | Inference, regression, probability | Pyodide notebooks |
| Command Line | Terminal, filesystem, shell | Live terminal |
| C++ Programming | Zero to software engineer | Live C++ environment |
| Electronics | Circuits, components, signal analysis | Lab simulations |
| Programmable Logic Controllers | PLC fundamentals, ladder logic | PLC simulator |
| Simulation | Physics-based simulation and modeling | Simulation lab |

</details>

<!-- facts:labs-heading -->
### 49 Interactive Labs and Simulators
<!-- /facts:labs-heading -->

- **Python Notebook** — Pyodide-powered, fully offline, runs numpy/scipy/matplotlib in the browser
- **CNC Simulator** — write G-Code, watch real toolpaths, verify programs before touching a machine
- **PLC Ladder Logic Simulator** — learn industrial automation without hardware
- **OpenMAT** — MATLAB-style matrix workspace: eigenvalues, decompositions, linear systems
- **Physics Lab** — manipulate real physics simulations with live parameter controls
- **Digital Electronics Lab** — build and test logic circuits
- **Five-Axis CNC Simulation** — advanced manufacturing kinematics in the browser
- **3D Matrix Lab** — visualize linear transformations in three dimensions
- **Logic Simulator** — build and test combinational and sequential circuits
- **CAD Pro** — precision drafting and design
- **Robot Arm Simulator** — STEM robotics with real inverse kinematics
- **Decomposition Lab**, **DSA Arrays/Linked Lists**, **Music Lab**, **CMM Lab**, **Drone Lab** — and more

### 15 Games Built on Real Math and Physics

These are not "gamified rewards." The game *is* the lesson:

- **Pool / Billiards** — collision physics, momentum, coefficient of restitution
- **3D Basketball** — projectile motion in 3D space
- **Mini Golf** — geometry, trajectories, angle relationships
- **Football Calculus** — real calculus applied to real throws
- **Arkanoid** — vectors, collision detection, game loops
- **Asteroids (Linear Algebra)** — matrix transformations drive every movement
- **Vector Command** — vector arithmetic as the game mechanic
- **Card Academy / Card Quest** — spaced repetition through play
- **Build Tetris** — complete guided project: from empty file to shipped game
- **STEM Quest**, **Reality Runner**, **Open Craft**, **Matrix Game** — and more

---

## The Lesson Builder

UpSkillOS ships with a full **WYSIWYG lesson authoring system** built directly into the platform. This is what makes community-scale content creation possible.

**From any lesson:** click **🔨 Lesson Builder** in the top nav, or use the "Edit in Builder" button on any lesson page.

### What the Builder Does

- **Click-to-edit** — every field is inline-editable; no JSON, no file system required
- **Component palette** — drag sections onto the canvas: Intuition, Math, Rigor, Examples, Challenges, Checkpoints, Quiz, Python Notebook
- **Nested blocks** — visualizations (including full Python notebooks with Pyodide) live *inside* sections; nest and unnest with one click
- **Live Python notebook editing** — add, remove, and edit cells directly; each cell has prose, code, title, and instructions
- **Zero data loss** — the serializer overlays edits onto the original lesson object; every field not touched by the editor passes through unchanged
- **Export** — generates ready-to-paste `.js` lesson file content with the correct file path shown
- **Load any existing lesson** — navigate from a lesson page and the builder loads the full content, including all four Python notebook format variants used across the codebase

### Why This Matters

A lesson builder inside the platform means educators can create and iterate on content without touching code. Subject matter experts who know Python, physics, or CNC but not React can author complete interactive lessons — with real running Python notebooks, quizzes, proofs, and examples — and export a single file.

This is the infrastructure layer that makes a community-authored curriculum realistic at scale.

---

## For Educators

**Use UpSkillOS alongside your course** — same material, built for active learning. No LMS integration required.

**Export annotated math solver sessions** — walk through a problem in the step-by-step solver, add your own notes, export the session as a file. Students load it and get your annotations inside their solver. No platform account, no LMS, no server.

**Author new content** — use the Lesson Builder to create lessons. The full lesson schema supports prose, LaTeX equations, synchronized proofs, worked examples, quizzes, Python notebooks, and interactive visualizations. Export the `.js` file and submit it as a pull request.

**Self-host** — run the full platform on your institution's network with one command. Students get the full experience with no external dependencies.

---

## Technical Architecture

### The Lesson Format

Every lesson is a self-contained JavaScript object:

```js
export default {
  id: 'stat4-003',
  slug: 'conditional-probability',
  title: 'Conditional Probability',
  hook: { question: '...', realWorldContext: '...' },
  intuition: {
    prose: ['...'],
    callouts: [{ type: 'insight', title: '...', body: '...' }],
    visualizations: [{ id: 'PythonNotebook', props: { initialCells: [...] } }]
  },
  math: { prose: ['...'], equations: [{ label: '...', tex: '...' }] },
  examples: [{ title: '...', problem: '...', steps: [...], answer: '...' }],
  quiz: [{ type: 'choice', text: '...', options: [...], answer: '...' }],
  python: { cells: [{ cellTitle: '...', prose: '...', code: '...' }] },
  // ...
}
```

This format is what makes the Lesson Builder work — and what makes the lessons parseable, searchable, and exportable without a database.

### Stack

| Layer | Technology |
|---|---|
| UI framework | React 18 + Vite 5 |
| 2D visualizations | D3.js 7 |
| 3D visualizations | Three.js |
| Math rendering | KaTeX |
| Python runtime | Pyodide (WebAssembly) |
| Styling | Tailwind CSS + full dark mode |
| Discovery search | Client-side keyword search across every course, lab, and game (Explore section) |
| P2P study chat | Trystero + WebRTC (no server) |
| Desktop app | Electron |
| Code editor | Monaco Editor |

### How It Runs Offline

Python runs via Pyodide — the CPython interpreter compiled to WebAssembly. NumPy, SciPy, Pandas, Matplotlib, scikit-learn are all available in the browser with no server. Lesson titles are extracted from every lesson file at compile time into a static JSON map, so the app can show real titles without eager-loading lesson content. P2P chat uses WebRTC negotiated over Nostr/BitTorrent DHT — no signaling server required.

### Self-Hosting

```bash
git clone https://github.com/g4m3rm1k3/upskillos.git
cd upskillos
npm install
npm run build       # builds everything including search index
npm run preview     # serve locally
# or serve dist/ with any static host
```

```bash
npm run backend:lan  # optional LAN server for institutional deployments
```

---

## Getting Started (Developers)

**Requirements:** Node.js 24 and the npm version bundled with it

```bash
git clone https://github.com/g4m3rm1k3/upskillos.git
cd upskillos
npm install
npm run dev        # http://localhost:5173
```

### Desktop App

```bash
npm run desktop:build    # Windows .exe / macOS .dmg
```

---

## Project Structure

```
src/
  courses/               # course packages
    {courseId}/
      {N}-{chapter}/     # chapter folders
        {NNN}-{slug}.js  # one lesson file per lesson
      viz/               # course-specific visualizations
      meta.json          # course metadata
  components/
    lesson/              # lesson layout, math solver, checkpoints
    lesson-builder/      # WYSIWYG authoring system
      blocks/            # IdentityBlock, HookBlock, PythonBlock, VisualizationBlock, ...
      BuilderCanvas.jsx
      ComponentPalette.jsx
      ExportPanel.jsx
      builderReducer.js
      builderUtils.js
      lessonSerializer.js
    layout/              # AppShell, TopBar, MobileBottomNav
    math/                # KaTeX wrappers, MarkdownProse
    viz/                 # VizFrame registry (maps string IDs to components)
  labs/                  # standalone labs and simulators
  games/                 # 15 math and physics games
  pages/                 # top-level route components
  context/               # progress, theme, pins
  data/
    lessonTitles.json    # real lesson titles, generated at build time
desktop/
  app/                   # Electron main process
```

---

## Roadmap

### Near-Term
- [ ] Screenshots and demo GIFs in README
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] macOS desktop app
- [ ] Lesson Builder: drag-to-nest between sections
- [ ] Lesson Builder: preview mode (render the lesson as it appears to learners)

### With Funding
- [ ] Multilingual content — Spanish first, covering the 10 highest-enrollment courses
- [ ] Expanded manufacturing and trades tracks (welding, electrical, HVAC fundamentals)
- [ ] Adaptive learning paths — prerequisite-aware course sequencing
- [ ] Educator dashboard — track cohort progress without a central server
- [ ] Mobile-first responsive pass — full experience on phones and tablets
- [ ] Accessibility (WCAG 2.1 AA) — screen reader support, keyboard navigation, contrast audit
- [ ] Community authoring portal — submit lessons without a GitHub account
- [ ] Assessment export — generate printable problem sets from any lesson's examples and challenges

---

## For Grant Funders and Foundations

UpSkillOS is seeking support for full-time development. Here is the case clearly:

### The Problem

Access to high-quality, interactive STEM education is not equally distributed. The tools that make learning actually work — interactive simulations, live coding environments, AI tutoring, real lab software — cost money that disadvantaged students don't have and institutions in underserved communities can't afford. The result is a persistent skills gap that compounds over time: students who needed the tools to get in the door can't get the tools without being in the door.

### What We've Already Built

Without institutional funding, one developer has shipped:
<!-- facts:built -->
- **1213 lessons** across **41 courses** covering the full STEM-to-employability pipeline
<!-- /facts:built -->
- A **live Python execution environment** (Pyodide) that runs numpy, scipy, pandas, matplotlib, and scikit-learn with no server
- A **CNC programming simulator** — one of the most in-demand industrial skills in the country, fully learnable without access to a physical machine
- A **PLC ladder logic simulator** for industrial automation training
- A **WYSIWYG lesson builder** that lets subject matter experts author full interactive lessons — including live Python notebooks — without writing code
- A **desktop app** for offline use
- **Full offline capability** — no server, no account, no dependency on internet access

This is a proof of concept at real scale. The curriculum depth, the lesson format, the authoring system, and the simulator infrastructure are all in place. What is needed is time and resources to finish it properly.

### What a Grant Would Fund

| Priority | Description |
|---|---|
| **Full-time development** | The platform is maintained by one developer part-time. Full-time would 3× the pace of new content and features. |
| **Spanish localization** | The 10 highest-enrollment courses translated and localized — reaching the largest underserved student population in the US. |
| **Accessibility (WCAG 2.1 AA)** | Screen reader support, keyboard navigation, color contrast audit — making the platform usable for learners with disabilities. |
| **Trades and manufacturing curriculum** | Welding, electrical, HVAC, industrial maintenance — skills in high demand, rarely taught well online. |
| **Mobile optimization** | A full responsive pass so the platform works on phones — the primary computing device for many low-income learners. |
| **Community authoring infrastructure** | A portal for educators and subject matter experts to submit lessons without GitHub access. |
| **Educator tools** | Cohort progress tracking, custom lesson assignment, annotation export — making the platform usable in formal instruction. |

### Grant Fit

UpSkillOS is a strong match for organizations funding:

- **Open education / OER** — GPL-3.0 licensed, permanently free, no paywall possible by design
- **STEM access and equity** — serves learners who cannot afford commercial alternatives
- **Workforce development** — covers the full pipeline from math fundamentals to CNC, data science, AI engineering, and electronics
- **Digital equity** — runs offline, no account required, works on low-bandwidth connections
- **Open source infrastructure** — the lesson format, authoring tools, and simulator components are reusable by any educational project

**Contact:** Open a [Discussion](https://github.com/g4m3rm1k3/upskillos/discussions) or reach out via the repository. The full source code, architecture, and build pipeline are public.

---

## Contributing

**Lesson writing** — the Lesson Builder (🔨 in the top nav) provides a full WYSIWYG authoring environment. No codebase knowledge required to write a lesson. Export the `.js` file and submit a pull request.

**Visualization creation** — add a D3, Three.js, or React visualization to an existing lesson. The VizFrame registry makes this a two-step process: write the component, register the string ID.

**Accessibility** — WCAG 2.1 AA compliance is a priority. Screen reader support, keyboard navigation, and color contrast are all areas where help is welcome.

**Translation** — Spanish localization is the first target. Lesson prose is in standard JavaScript strings — mechanical to translate once the workflow is established.

**Subject matter review** — accuracy review from domain experts (statistics, physics, CNC, electronics) is always welcome.

**Bug fixes** — check open issues.

Full technical reference: [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Contributors

Thanks to everyone who has sent a pull request:

<a href="https://github.com/natural-mess"><img src="https://github.com/natural-mess.png" width="56" height="56" alt="natural-mess" style="border-radius:50%; vertical-align:middle"></a> **[natural-mess](https://github.com/natural-mess)**
&nbsp;&nbsp;&nbsp;
<a href="https://github.com/John-Swindell"><img src="https://github.com/John-Swindell.png" width="56" height="56" alt="John-Swindell" style="border-radius:50%; vertical-align:middle"></a> **[John-Swindell](https://github.com/John-Swindell)**

---

## License

GPL-3.0 — free to use, modify, and distribute. Derivative works must remain open source. No proprietary fork possible by design.

---

<div align="center">

*The gap between the people who can afford the tools that make learning work*
*and the people who need them most is not a technical problem. It is a resource problem.*

*UpSkillOS is an attempt to make the tools free.*

*The technical ladder is open to everyone. UpSkillOS is the climb.*

</div>
