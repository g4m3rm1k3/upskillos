# Bridge

Some designs vary along two independent dimensions at once. A drawing program has **shapes** (lines, rectangles, circles, polygons) and **outputs** (an SVG file for the web, G-code for a pen plotter, a text preview). Every shape must be drawable on every output. A subclass per combination, `SvgCircle`, `PlotterCircle`, `TextCircle`, `SvgRectangle`, ..., grows as shapes × outputs, and every new shape needs one class per output.

The **bridge** pattern splits the two dimensions into two separate class hierarchies joined by a reference. On one side is the **abstraction** (the shapes, which know **what** to draw). On the other is the **implementation** (the canvases, which know **how** to put a line or a circle on a particular output). Each shape holds a canvas and draws itself using a small set of primitive canvas operations. Shapes and canvases then vary independently: n shapes and m outputs need n + m classes.

This lesson covers:

- the problem: a class per combination of two independent dimensions;
- the bridge: abstraction and implementation as two hierarchies, connected by a narrow interface;
- extending each side without touching the other;
- how bridge differs from adapter and strategy, which look similar.

## Two dimensions, one hierarchy

The composition lesson met this explosion with robots (tools × drives). Bridge is the same remedy aimed at a particular shape of problem: a high-level abstraction whose operations are built from a set of low-level primitives, where the primitives have several implementations. Here the primitives are "draw a line" and "draw a circle", and every shape can be expressed with them.

## The implementation side: canvases

A canvas offers the primitives, `line(x1, y1, x2, y2)` and `circle(cx, cy, r)`, and a `result()` with the finished output. Three canvases produce three completely different outputs from the same calls. Predict before running: what does a pen plotter need that SVG does not?

```python type
import math

class SvgCanvas:
    def __init__(self):
        self.parts = []
    def line(self, x1, y1, x2, y2):
        self.parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>')
    def circle(self, cx, cy, r):
        self.parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r}"/>')
    def result(self):
        return "<svg>" + "".join(self.parts) + "</svg>"

class PlotterCanvas:
    def __init__(self):
        self.lines = []
    def _travel(self, x, y):
        self.lines += ["PU", f"G0 X{x} Y{y}", "PD"]
    def line(self, x1, y1, x2, y2):
        self._travel(x1, y1)
        self.lines.append(f"G1 X{x2} Y{y2}")
    def circle(self, cx, cy, r):
        self._travel(cx + r, cy)
        self.lines.append(f"G2 X{cx + r} Y{cy} I{-r} J0")
    def result(self):
        return "\n".join(self.lines + ["PU"])

class CountingCanvas:
    def __init__(self):
        self.ink = 0.0
    def line(self, x1, y1, x2, y2):
        self.ink += math.dist((x1, y1), (x2, y2))
    def circle(self, cx, cy, r):
        self.ink += 2 * math.pi * r
    def result(self):
        return f"{self.ink:.1f} mm of pen travel"

for canvas in [SvgCanvas(), PlotterCanvas(), CountingCanvas()]:
    canvas.line(0, 0, 30, 0)
    canvas.circle(15, 10, 5)
    print(type(canvas).__name__, "->", canvas.result().replace("\n", " | "))
```

```output
SvgCanvas -> <svg><line x1="0" y1="0" x2="30" y2="0"/><circle cx="15" cy="10" r="5"/></svg>
PlotterCanvas -> PU | G0 X0 Y0 | PD | G1 X30 Y0 | PU | G0 X20 Y10 | PD | G2 X20 Y10 I-5 J0 | PU
CountingCanvas -> 61.4 mm of pen travel
```

`PU` and `PD` lift and lower the plotter's pen. `G2 ... I J` is a full circle drawn clockwise around a centre given relative to the start point.

A plotter must lift the pen, travel to the start of each stroke, and put it down again: a detail SVG never needs. The `CountingCanvas` does not draw at all. It measures how much ink a drawing will use, which shows that an "implementation" can be anything that honours the primitive interface.

## The abstraction side: shapes

Each shape is constructed with the canvas it will draw on, the **bridge** between the two sides, and draws itself only through `line` and `circle`. A rectangle is four lines, a circle is one circle, and a gear outline is a circle with lines for teeth. No shape knows which canvas it has. Predict before running: how many classes would the same result need with one subclass per combination?

```python type
class Shape:
    def __init__(self, canvas):
        self.canvas = canvas
    def draw(self):
        raise NotImplementedError

class Rectangle(Shape):
    def __init__(self, canvas, x, y, w, h):
        super().__init__(canvas)
        self.x, self.y, self.w, self.h = x, y, w, h
    def draw(self):
        x, y, w, h = self.x, self.y, self.w, self.h
        for a, b in [((x, y), (x + w, y)), ((x + w, y), (x + w, y + h)), ((x + w, y + h), (x, y + h)), ((x, y + h), (x, y))]:
            self.canvas.line(*a, *b)

class Circle(Shape):
    def __init__(self, canvas, cx, cy, r):
        super().__init__(canvas)
        self.cx, self.cy, self.r = cx, cy, r
    def draw(self):
        self.canvas.circle(self.cx, self.cy, self.r)

class Gear(Circle):
    def __init__(self, canvas, cx, cy, r, teeth):
        super().__init__(canvas, cx, cy, r)
        self.teeth = teeth
    def draw(self):
        super().draw()
        for k in range(self.teeth):
            angle = 2 * math.pi * k / self.teeth
            x1, y1 = self.cx + self.r * math.cos(angle), self.cy + self.r * math.sin(angle)
            x2, y2 = self.cx + 1.2 * self.r * math.cos(angle), self.cy + 1.2 * self.r * math.sin(angle)
            self.canvas.line(round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2))

def draw_part(canvas):
    for shape in [Rectangle(canvas, 0, 0, 40, 20), Circle(canvas, 10, 10, 4), Gear(canvas, 30, 10, 5, teeth=6)]:
        shape.draw()
    return canvas.result()

print(draw_part(SvgCanvas())[:120], "...")
print(draw_part(PlotterCanvas()).splitlines()[:7], "...")
print(draw_part(CountingCanvas()))
print("classes with a bridge:", 3 + 3, "  with one subclass per combination:", 3 * 3)
```

```output
<svg><line x1="0" y1="0" x2="40" y2="0"/><line x1="40" y1="0" x2="40" y2="20"/><line x1="40" y1="20" x2="0" y2="20"/><li ...
['PU', 'G0 X0 Y0', 'PD', 'G1 X40 Y0', 'PU', 'G0 X40 Y0', 'PD'] ...
182.6 mm of pen travel
classes with a bridge: 6   with one subclass per combination: 9
```

`Gear` refines `Circle` on the abstraction side: it is a circle plus teeth, drawn using the same two primitives. It works on every canvas without any canvas knowing gears exist.

The same three shapes come out as SVG, plotter commands and an ink estimate. Three shapes and three canvases need six classes; one subclass per combination would need nine, and the gap widens with every addition. Ten shapes and five outputs would be 15 classes against 50.

## Extending each side independently

The point of the split is that each side grows on its own:

- a **new canvas** (say, a laser cutter or a PDF writer) is one class implementing `line` and `circle`, and every shape, including `Gear`, can draw on it at once;
- a **new shape** (a slot, a polygon) is one class drawn from the primitives, and every canvas can show it at once.

The price is the narrowness of the bridge. Everything a shape draws must be expressible with the primitives. If the shapes need curves the canvases cannot draw, the primitive interface must grow, and every canvas must implement the new primitive. So choose the primitives carefully: small enough that each canvas is easy to write, rich enough that shapes can express themselves.

How is this different from patterns that look the same?

- An **adapter** fixes a mismatch after the fact, between interfaces that were designed separately. A bridge is designed up front, so that two sides can vary.
- A **strategy** swaps one algorithm inside an object. In a bridge, the abstraction side is a whole hierarchy of its own that is extended with new subclasses, and it is built on the implementation's primitives.

In practice the code shapes are similar: an object holding another object and calling it. The pattern names describe the reason for the structure.

::: challenge A recording canvas [easy]
Add a new canvas, without touching any shape. Write `RecordingCanvas`, whose `line` and `circle` append tuples to a list `self.calls`: `("line", x1, y1, x2, y2)` and `("circle", cx, cy, r)`. Its `result()` returns the number of calls recorded. The lesson's `Rectangle`, `Circle`, `Gear` and `draw_part` are available, and must work with it unchanged.

```python starter
class RecordingCanvas:
    def __init__(self):
        self.calls = []

print("write line, circle and result")
```

```python solution
class RecordingCanvas:
    def __init__(self):
        self.calls = []
    def line(self, x1, y1, x2, y2):
        self.calls.append(("line", x1, y1, x2, y2))
    def circle(self, cx, cy, r):
        self.calls.append(("circle", cx, cy, r))
    def result(self):
        return len(self.calls)

print(draw_part(RecordingCanvas()))
```

```python test
assert "RecordingCanvas" in dir(), "Keep the class name RecordingCanvas."
_c = RecordingCanvas()
Rectangle(_c, 0, 0, 10, 5).draw()
assert _c.calls == [("line", 0, 0, 10, 0), ("line", 10, 0, 10, 5), ("line", 10, 5, 0, 5), ("line", 0, 5, 0, 0)], f"A rectangle is four lines; got {_c.calls}."
_c = RecordingCanvas()
Circle(_c, 1, 2, 3).draw()
assert _c.calls == [("circle", 1, 2, 3)] and _c.result() == 1, "A circle is one circle call."
assert draw_part(RecordingCanvas()) == 4 + 1 + 1 + 6, "draw_part's three shapes make 12 primitive calls on any canvas."
_g = RecordingCanvas()
Gear(_g, 0, 0, 10, teeth=4).draw()
assert _g.calls[0] == ("circle", 0, 0, 10) and len(_g.calls) == 5 and all(_k[0] == "line" for _k in _g.calls[1:]), "A gear is a circle and a line per tooth."
"SUCCESS: One new canvas class, and every existing shape, including the gear, draws on it with no changes."
```

Hint: `line` and `circle` each append one tuple with a name and the arguments; `result` returns `len(self.calls)`.
:::

::: challenge New shapes from primitives [medium]
Add shapes, without touching any canvas. Write `Polygon(canvas, points)`, which draws a line from each point to the next and from the last point back to the first (a list of fewer than 2 points draws nothing), and `Slot(canvas, x1, y1, x2, y2, r)`, a slot of width 2r between two centre points, drawn as two circles of radius r at the centres plus the two straight lines joining them, offset r to each side of the centre line. For a horizontal slot (`y1 == y2`) the lines run from `(x1, y1 - r)` to `(x2, y2 - r)` and from `(x1, y1 + r)` to `(x2, y2 + r)`. In general, the offset is r along the direction perpendicular to the centre line. Both must subclass the lesson's `Shape` and draw only through `self.canvas.line` and `self.canvas.circle`. Round computed coordinates to 3 decimal places.

```python starter
class Polygon(Shape):
    def __init__(self, canvas, points):
        super().__init__(canvas)
        self.points = points

print("write Polygon.draw and Slot")
```

```python solution
class Polygon(Shape):
    def __init__(self, canvas, points):
        super().__init__(canvas)
        self.points = points
    def draw(self):
        if len(self.points) < 2:
            return
        for (xa, ya), (xb, yb) in zip(self.points, self.points[1:] + self.points[:1]):
            self.canvas.line(xa, ya, xb, yb)

class Slot(Shape):
    def __init__(self, canvas, x1, y1, x2, y2, r):
        super().__init__(canvas)
        self.x1, self.y1, self.x2, self.y2, self.r = x1, y1, x2, y2, r
    def draw(self):
        length = math.dist((self.x1, self.y1), (self.x2, self.y2))
        nx, ny = -(self.y2 - self.y1) / length, (self.x2 - self.x1) / length
        self.canvas.circle(self.x1, self.y1, self.r)
        self.canvas.circle(self.x2, self.y2, self.r)
        for side in (-1, 1):
            ox, oy = side * self.r * nx, side * self.r * ny
            self.canvas.line(round(self.x1 + ox, 3), round(self.y1 + oy, 3), round(self.x2 + ox, 3), round(self.y2 + oy, 3))

print(draw_part(SvgCanvas())[:40])
```

```python test
import math as _math
for _n in ["Polygon", "Slot"]:
    assert _n in dir(), f"Define {_n}."
assert issubclass(Polygon, Shape) and issubclass(Slot, Shape), "Both should be Shapes."
class _Rec:
    def __init__(self): self.calls = []
    def line(self, *a): self.calls.append(("line",) + a)
    def circle(self, *a): self.calls.append(("circle",) + a)
_c = _Rec()
Polygon(_c, [(0, 0), (4, 0), (0, 3)]).draw()
assert _c.calls == [("line", 0, 0, 4, 0), ("line", 4, 0, 0, 3), ("line", 0, 3, 0, 0)], f"A triangle is three lines, closing back to the start; got {_c.calls}."
for _pts in [[], [(1, 1)]]:
    _e = _Rec(); Polygon(_e, _pts).draw()
    assert _e.calls == [], "Fewer than 2 points draws nothing."
_s = _Rec()
Slot(_s, 10, 20, 50, 20, 5).draw()
_circles = [_k for _k in _s.calls if _k[0] == "circle"]
_lines = sorted(_k for _k in _s.calls if _k[0] == "line")
assert sorted(_circles) == [("circle", 10, 20, 5), ("circle", 50, 20, 5)], f"Two end circles; got {_circles}."
assert _lines == [("line", 10, 15, 50, 15), ("line", 10, 25, 50, 25)], f"Two side lines offset by r; got {_lines}."
_d = _Rec()
Slot(_d, 0, 0, 0, 30, 2).draw()
assert sorted(_k for _k in _d.calls if _k[0] == "line") == [("line", -2, 0, -2, 30), ("line", 2, 0, 2, 30)], "A vertical slot's lines are offset sideways in x."
_g = _Rec()
Slot(_g, 0, 0, 30, 40, 5).draw()
_gl = [_k for _k in _g.calls if _k[0] == "line"]
assert len(_gl) == 2 and all(abs(_math.dist((_k[1], _k[2]), (_k[3], _k[4])) - 50) < 1e-6 for _k in _gl), "Diagonal slot lines run parallel to the centre line, 50 long."
assert all(abs(_math.dist((_k[1], _k[2]), (0, 0)) - 5) < 1e-6 for _k in _gl), "Each line starts r away from the first centre."
_ink = CountingCanvas()
Slot(_ink, 0, 0, 10, 0, 1).draw()
assert _ink.result() == f"{2 * 10 + 2 * 2 * _math.pi:.1f} mm of pen travel", "New shapes draw on the lesson's canvases with no change to them."
"SUCCESS: Two new shapes built only from line and circle, and every canvas, including ones written before them, can draw them."
```

Hint: `zip(points, points[1:] + points[:1])` pairs each point with the next, wrapping round. For the slot, the unit vector along the centre line is `((x2 - x1) / L, (y2 - y1) / L)`; a perpendicular one is `(-(y2 - y1) / L, (x2 - x1) / L)`. Offset both ends by `±r` times that perpendicular.
:::

::: challenge Messages across transports [hard]
An alert system sends messages over different transports, and messages come in different kinds: a bridge. Write the **implementation** side: transports with a `max_length` attribute (`None` for unlimited) and a method `deliver(to, text)` that appends `(to, text)` to a list `self.sent`. These are `SmsTransport` (`max_length` 160), `EmailTransport` (`None`) and `PagerTransport` (`max_length` 40).

Then the **abstraction** side, each built with a transport and using only `deliver` and `max_length`:

- `Message(transport)` with `send(to, text)`: delivers the text once; if it is longer than `max_length`, it is cut to `max_length - 1` characters plus `"…"`;
- `ChunkedMessage(transport)`: instead of cutting, splits a long text into parts of at most `max_length` characters **including** a prefix `"(i/n) "`, so each chunk holds `max_length - len(prefix)` characters of text, numbered from 1; an unlimited or short-enough text is sent once without a prefix (the prefix length depends on n, so find n first);
- `UrgentMessage(transport)`: a `Message` that puts `"URGENT: "` in front of the text, then sends as `Message` does.

```python starter
class SmsTransport:
    max_length = 160
    def __init__(self):
        self.sent = []

print("write the transports and the message classes")
```

```python solution
class Transport:
    max_length = None
    def __init__(self):
        self.sent = []
    def deliver(self, to, text):
        self.sent.append((to, text))

class SmsTransport(Transport):
    max_length = 160

class EmailTransport(Transport):
    max_length = None

class PagerTransport(Transport):
    max_length = 40

class Message:
    def __init__(self, transport):
        self.transport = transport
    def send(self, to, text):
        limit = self.transport.max_length
        if limit is not None and len(text) > limit:
            text = text[:limit - 1] + "…"
        self.transport.deliver(to, text)

class ChunkedMessage(Message):
    def send(self, to, text):
        limit = self.transport.max_length
        if limit is None or len(text) <= limit:
            self.transport.deliver(to, text)
            return
        n = 1
        while True:
            room = limit - len(f"({n}/{n}) ")
            needed = -(-len(text) // room)
            if needed <= n:
                break
            n = needed
        room = limit - len(f"({n}/{n}) ")
        chunks = [text[i:i + room] for i in range(0, len(text), room)]
        for i, chunk in enumerate(chunks, start=1):
            self.transport.deliver(to, f"({i}/{len(chunks)}) {chunk}")

class UrgentMessage(Message):
    def send(self, to, text):
        super().send(to, "URGENT: " + text)

pager = PagerTransport()
ChunkedMessage(pager).send("on-call", "Freezer 3 at -9 C and rising; door sensor reports open since 02:14")
print(pager.sent)
```

```python test
for _n in ["SmsTransport", "EmailTransport", "PagerTransport", "Message", "ChunkedMessage", "UrgentMessage"]:
    assert _n in dir(), f"Define {_n}."
assert SmsTransport.max_length == 160 and EmailTransport.max_length is None and PagerTransport.max_length == 40, "Check the limits."
_p = PagerTransport()
Message(_p).send("ops", "short")
Message(_p).send("ops", "x" * 50)
assert _p.sent == [("ops", "short"), ("ops", "x" * 39 + "…")], f"Long texts are cut to max_length with an ellipsis; got {_p.sent}."
_e = EmailTransport()
Message(_e).send("a@b", "y" * 500)
assert _e.sent == [("a@b", "y" * 500)], "Email has no limit."
_p = PagerTransport()
UrgentMessage(_p).send("ops", "boiler")
assert _p.sent == [("ops", "URGENT: boiler")], "Urgent adds the prefix."
_p = PagerTransport()
UrgentMessage(_p).send("ops", "z" * 40)
assert len(_p.sent[0][1]) == 40 and _p.sent[0][1].startswith("URGENT: ") and _p.sent[0][1].endswith("…"), "The prefix counts towards the limit."
_p = PagerTransport()
_text = "Freezer 3 at -9 C and rising; door sensor reports open since 02:14"
ChunkedMessage(_p).send("on-call", _text)
_parts = [_t for _, _t in _p.sent]
assert all(len(_t) <= 40 for _t in _parts) and len(_parts) == 2, f"Chunks fit the pager; got {_parts}."
assert _parts[0].startswith("(1/2) ") and _parts[1].startswith("(2/2) ") and "".join(_t[6:] for _t in _parts) == _text, "Numbered chunks that rebuild the text exactly."
_s = SmsTransport()
_long = "".join(chr(97 + _i % 26) for _i in range(1600))
ChunkedMessage(_s).send("x", _long)
_parts = [_t for _, _t in _s.sent]
assert all(len(_t) <= 160 for _t in _parts) and _parts[0].startswith("(1/11) ") and _parts[-1].startswith("(11/11) "), f"1,600 characters need 11 SMS chunks with '(i/11) ' prefixes; got {len(_parts)} chunks."
assert "".join(_t[_t.index(") ") + 2:] for _t in _parts) == _long, "The chunks rebuild the whole text."
_q = PagerTransport()
ChunkedMessage(_q).send("x", "fits")
assert _q.sent == [("x", "fits")], "A short text is sent once, with no prefix."
class _Fax:
    max_length = 20
    def __init__(self): self.sent = []
    def deliver(self, to, text): self.sent.append((to, text))
_f = _Fax()
UrgentMessage(_f).send("hq", "pump 2 tripped")
assert _f.sent == [("hq", "URGENT: pump 2 trip…")], "Any transport with deliver and max_length works with every message kind."
"SUCCESS: Three transports and three kinds of message give nine combinations from six classes, and a new transport such as a fax works with all of them."
```

Hint: Give the transports a small base class with `deliver`. In `ChunkedMessage`, the prefix `"(i/n) "` is longest for the largest i, which is n, so compute how many chunks `n` you need with `room = limit - len(f"({n}/{n}) ")`, and repeat until n stops growing (the prefix grows when n gains a digit). Then slice the text into pieces of `room` characters.
:::

## What you learned

- When a design varies along two independent dimensions, one class per combination grows as n × m.
- Bridge splits the dimensions into two hierarchies: the abstraction (what to do) holds a reference to an implementation (how to do it on a particular platform), and is written only in terms of a small set of primitive operations.
- Each side grows independently: a new implementation works with every abstraction, and a new abstraction works with every implementation. n + m classes cover every combination.
- Choose the primitives carefully. The bridge is only as capable as the interface across it.
- Adapter, strategy and bridge share a shape (an object holding another). The names describe the reason: fixing a mismatch, swapping an algorithm, or letting two hierarchies vary independently.

The next lesson saves memory when a program needs huge numbers of similar small objects: the flyweight pattern.
