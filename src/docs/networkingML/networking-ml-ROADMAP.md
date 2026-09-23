# Networking + Machine Learning Curriculum

Same philosophy as [[frontend-curriculum]]: type every piece yourself,
predict before running, mechanical explanation of every construct — no
black boxes. Python for the networking/ML internals (you already know some
FastAPI), your frontend skills used throughout for real visualization —
watching a model actually learn, a request actually travel, a loss curve
actually drop — rather than only reading printed numbers in a terminal.

Descriptive variable names throughout, per your standing preference.

---

## Phase A — Networking From Scratch

- **Lesson 1 — Raw Sockets: Sending Bytes By Hand**
  Python's `socket` module directly — before `requests`, before `fetch`,
  what a "connection" actually is.
- **Lesson 2 — HTTP From Scratch**
  Parsing a raw HTTP request/response by hand over a raw socket — what
  `fetch` (Lesson 6) was always doing underneath.
- **Lesson 3 — DNS & the Path a Request Takes**
  Resolving a domain to an IP, and everything that happens before your
  first byte even leaves your machine.
- **Lesson 4 — A Tiny Web Server, No Framework**
  Build the thing FastAPI (Lesson 18) abstracts away — then re-read
  FastAPI's source-level behavior with new eyes.
- **Lesson 5 — WebSockets: Persistent, Bidirectional Connections**
  A live chat server — first frontend tie-in: a real-time connection
  status/message visualizer.

## Phase B — Machine Learning From Scratch

- **Lesson 6 — Linear Regression From Scratch**
  Gradient descent, reusing Lesson 25's derivative concept directly —
  visualized live in the browser as the fit line updates.
- **Lesson 7 — The Loss Landscape, Visualized**
  What gradient descent is actually descending — a 3D loss surface,
  rendered with Three.js (from [[mesh-viewer-curriculum]]/frontend Phase F).
- **Lesson 8 — Logistic Regression & Classification**
  A decision boundary, drawn and updated live as the model trains.
- **Lesson 9 — A Tiny Neural Network From Scratch**
  Forward pass and backpropagation, no framework — network activations
  visualized in the browser as data flows through.
- **Lesson 10 — Backpropagation via the Chain Rule**
  The calculus (Lesson 25) made fully explicit, one layer at a time.
- **Lesson 11 — Training Loops & Loss Curves, Live**
  Streaming loss/accuracy over a WebSocket (Lesson 5) to a live-updating
  frontend chart, instead of watching numbers scroll in a terminal.
- **Lesson 12 — A Real Framework (PyTorch), Now That You Know the Internals**
  What a framework actually saves you from writing, having written it by hand first.
- **Lesson 13 — Capstone: Serving a Trained Model via FastAPI**
  Connects directly to [[frontend-curriculum]]'s Lessons 18-19 — a real
  model behind a real endpoint, called from a real frontend UI.

---

### Status
- [ ] Lesson 1
- [ ] Lesson 2
- [ ] Lesson 3
- [ ] Lesson 4
- [ ] Lesson 5
- [ ] Lesson 6
- [ ] Lesson 7
- [ ] Lesson 8
- [ ] Lesson 9
- [ ] Lesson 10
- [ ] Lesson 11
- [ ] Lesson 12
- [ ] Lesson 13
