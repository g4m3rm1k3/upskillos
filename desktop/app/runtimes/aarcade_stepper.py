"""A-Arcade Python's stepper: runs a learner's Python program one line at a time.

The app sends one JSON command per line on stdin and gets one JSON reply per line on stdout.
The program runs in a worker thread with a trace function (sys.settrace) that pauses it before
each line of the program's own files; library code (NumPy, Gymnasium, PyTorch) runs at full
speed and is never stepped into. While paused, the program is really suspended: its variables,
its Q-table or its network are the live Python objects.

Commands:
  {"cmd": "load", "files": {name: source}, "entry": {"module", "function", "kwargs"},
   "watch": {name: [expressions]}, "actions": [calls]}   start the program, paused before its first line
  {"cmd": "step", "mode": "into" | "over" | "out" | "action" | "line" | "lines", "file", "line",
   "targets": [[file, line], ...], "limit"}
  {"cmd": "set", "target": "agent.epsilon", "value": 0.0}   change a value while paused
  {"cmd": "stop"}
Every reply to load/step/set is a "pause" (or "finished" / "error") with the program's state.
"""
import io
import json
import linecache
import math
import os
import sys
import threading
import traceback

PROGRAM_DIR = os.environ.get("AARCADE_PROGRAM_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "program")


class Stopped(Exception):
    """Raised inside the program's thread to end it (a new load, or stop)."""


def send(message):
    sys.__stdout__.write(json.dumps(message, allow_nan=False, default=str) + "\n")
    sys.__stdout__.flush()


# ── Turning live values into JSON ────────────────────────────────────────────────────────────
def number(x):
    x = float(x)
    return x if math.isfinite(x) else str(x)


def summarise(value, depth=0, full=False):
    """A JSON description of a value. Arrays and tensors keep their numbers (all of them when
    `full`, else up to 1024); objects show their attributes one level down. Never raises: looking
    at a value must not break the program (an object half-way through __init__, say)."""
    try:
        return describe(value, depth, full)
    except Exception as error:
        return {"t": "object", "cls": type(value).__name__, "note": f"can't be shown yet ({type(error).__name__})"}


def describe(value, depth=0, full=False):
    limit = 100_000 if full else 1024
    try:
        import numpy as np
    except ImportError:
        np = None
    torch = sys.modules.get("torch")
    if value is None or isinstance(value, bool):
        return {"t": "bool" if isinstance(value, bool) else "none", "v": value}
    if isinstance(value, int):
        return {"t": "int", "v": value}
    if isinstance(value, float):
        return {"t": "float", "v": number(value)}
    if isinstance(value, str):
        return {"t": "str", "v": value[:200]}
    if np is not None and isinstance(value, np.generic):
        return summarise(value.item(), depth)
    if np is not None and isinstance(value, np.ndarray):
        flat = value.ravel()
        out = {"t": "ndarray", "shape": list(value.shape), "dtype": str(value.dtype), "size": int(value.size)}
        if value.dtype.kind in "biuf":
            out["v"] = [number(x) if value.dtype.kind == "f" else int(x) for x in flat[:limit]]
        else:
            out["v"] = [str(x) for x in flat[:limit]]
        return out
    if torch is not None and isinstance(value, torch.Tensor):
        t = value.detach().cpu()
        out = {"t": "tensor", "shape": list(t.shape), "dtype": str(t.dtype).replace("torch.", ""), "size": t.numel(), "requires_grad": bool(value.requires_grad)}
        flat = t.reshape(-1)
        out["v"] = [number(x) if t.is_floating_point() else int(x) for x in flat[:limit].tolist()]
        if value.grad is not None:
            out["grad"] = [number(x) for x in value.grad.detach().cpu().reshape(-1)[:limit].tolist()]
        return out
    if torch is not None and isinstance(value, torch.nn.Module):
        params = {name: summarise(p, depth + 1, full) for name, p in value.named_parameters()}
        return {"t": "module", "cls": type(value).__name__, "text": repr(value)[:400], "params": params}
    if isinstance(value, (list, tuple)):
        if depth > 2:
            return {"t": type(value).__name__, "len": len(value)}
        return {"t": type(value).__name__, "len": len(value), "items": [summarise(x, depth + 1) for x in value[:32]]}
    if isinstance(value, dict):
        if depth > 2:
            return {"t": "dict", "len": len(value)}
        return {"t": "dict", "len": len(value), "items": {str(k): summarise(v, depth + 1) for k, v in list(value.items())[:32]}}
    if callable(value) and not hasattr(value, "__dict__"):
        return {"t": "function", "v": getattr(value, "__name__", "function")}
    cls = type(value).__name__
    if depth > 1 or not hasattr(value, "__dict__"):
        return {"t": "object", "cls": cls}
    attrs = {k: summarise(v, depth + 1) for k, v in list(vars(value).items())[:24] if not k.startswith("_")}
    return {"t": "object", "cls": cls, "attrs": attrs}


# ── The stepper ──────────────────────────────────────────────────────────────────────────────
class Stepper:
    def __init__(self):
        self.lock = threading.Condition()
        self.thread = None
        self.files = {}          # absolute path -> short name
        self.watch = {}
        self.actions = ("env.step(",)   # the calls after which the world has answered
        self.command = None      # what the paused program should do next
        self.reply = None        # what the program's thread reports back
        self.stopping = False
        self.output = io.StringIO()
        self.lines_run = 0
        self.last_line = {}      # frame -> the line it ran before this one
        self.returned = None     # the last function return since the last pause

    # Called in the program's thread for every new frame; traces only the program's own files.
    def trace_call(self, frame, event, arg):
        if self.stopping:
            raise Stopped()
        if frame.f_code.co_filename in self.files:
            return self.trace_line
        return None

    def trace_line(self, frame, event, arg):
        if self.stopping:
            raise Stopped()
        if event != "line":
            if event == "return":
                self.last_line.pop(frame, None)
                # Remember what the function gave back, for the next pause to report.
                self.returned = {"file": self.files[frame.f_code.co_filename], "function": frame.f_code.co_name,
                                 "line": frame.f_lineno, "value": summarise(arg)}
            return self.trace_line
        self.lines_run += 1
        previous = self.last_line.get(frame)
        self.last_line[frame] = frame.f_lineno
        # A line reported again straight after itself is a loop inside that one line (a list
        # comprehension, run inline since Python 3.12): still the same step, so don't pause.
        if previous == frame.f_lineno:
            return self.trace_line
        if self.should_pause(frame, previous):
            self.pause(frame)
        return self.trace_line

    def depth(self, frame):
        d = 0
        while frame is not None:
            if frame.f_code.co_filename in self.files:
                d += 1
            frame = frame.f_back
        return d

    def should_pause(self, frame, previous):
        c = self.command
        if c is None:
            return True
        c["count"] += 1
        if c["count"] > c["limit"]:
            c["hit_limit"] = True
            return True
        mode = c["mode"]
        if mode == "into":
            return True
        if mode == "over":
            return self.depth(frame) <= c["depth"]
        if mode == "out":
            return self.depth(frame) < c["depth"]
        if mode == "line":
            return self.files[frame.f_code.co_filename] == c["file"] and frame.f_lineno == c["line"]
        if mode == "lines":
            return (self.files[frame.f_code.co_filename], frame.f_lineno) in c["targets"]
        if mode == "action":
            # The line after an env.step(...) call has finished: the world has just answered.
            if previous is None:
                return False
            text = linecache.getline(frame.f_code.co_filename, previous)
            return any(call in text for call in self.actions)
        return True

    def pause(self, frame):
        try:
            state = self.capture(frame)
        except Exception as error:   # never let looking at the program break it
            state = {"type": "pause", "stack": [], "watch": {}, "output": "", "linesRun": self.lines_run,
                     "hitLimit": False, "returned": None, "captureError": f"{type(error).__name__}: {error}"}
        with self.lock:
            self.reply = state
            self.command = "waiting"
            self.lock.notify_all()
            while self.command == "waiting" and not self.stopping:
                self.lock.wait()
        if self.stopping:
            raise Stopped()

    def capture(self, frame, kind="pause"):
        frames = []
        f = frame
        while f is not None:
            if f.f_code.co_filename in self.files:
                frames.append(f)
            f = f.f_back
        frames.reverse()
        stack = [{
            "file": self.files[f.f_code.co_filename], "function": f.f_code.co_name, "line": f.f_lineno,
            "locals": {k: summarise(v) for k, v in list(f.f_locals.items())[:40] if not k.startswith("__")},
            # The file's CONSTANTS (GAMMA, STATES …): the program reads them too.
            "consts": {k: summarise(v) for k, v in f.f_globals.items() if k.isupper() and isinstance(v, (int, float, str, list, tuple, dict))},
        } for f in frames]
        watches = {}
        for name, expressions in self.watch.items():
            for f in reversed(frames):
                found = False
                for expression in expressions:
                    try:
                        value = eval(expression, f.f_globals, f.f_locals)
                    except Exception:
                        continue
                    watches[name] = {"from": expression, "function": f.f_code.co_name, "value": summarise(value, full=True)}
                    found = True
                    break
                if found:
                    break
        output = self.output.getvalue()
        self.output.seek(0)
        self.output.truncate()
        hit_limit = isinstance(self.command, dict) and self.command.get("hit_limit", False)
        returned, self.returned = self.returned, None
        return {"type": kind, "stack": stack, "watch": watches, "output": output, "linesRun": self.lines_run, "hitLimit": hit_limit, "returned": returned}

    def run_program(self, entry):
        try:
            import importlib
            # Importing runs each file's top level (imports, definitions) untraced: stepping
            # starts at the entry function's first line.
            module = importlib.import_module(entry["module"])
            function = getattr(module, entry["function"])
            if "torch" in sys.modules:
                sys.modules["torch"].set_num_threads(1)   # one core: training must never freeze the PC
            sys.settrace(self.trace_call)
            result = function(**entry.get("kwargs", {}))
            final = {"type": "finished", "result": summarise(result), "linesRun": self.lines_run, "output": self.output.getvalue()}
        except Stopped:
            final = {"type": "stopped"}
        except BaseException as error:  # the learner's program failed: report where, in their files
            tb = traceback.extract_tb(error.__traceback__)
            mine = [t for t in tb if os.path.abspath(t.filename) in self.files]
            where = mine[-1] if mine else (tb[-1] if tb else None)
            final = {"type": "error", "error": f"{type(error).__name__}: {error}",
                     "file": self.files.get(os.path.abspath(where.filename)) if where else None,
                     "line": where.lineno if where else None, "output": self.output.getvalue(),
                     "traceback": "".join(traceback.format_exception(type(error), error, error.__traceback__))[-3000:]}
        finally:
            sys.settrace(None)
        with self.lock:
            self.reply = final
            self.command = "done"
            self.lock.notify_all()

    def stop(self):
        if self.thread and self.thread.is_alive():
            with self.lock:
                self.stopping = True
                self.lock.notify_all()
            self.thread.join(timeout=10)
        self.thread = None
        self.stopping = False

    def load(self, files, entry, watch, actions=None):
        self.stop()
        os.makedirs(PROGRAM_DIR, exist_ok=True)
        for name in os.listdir(PROGRAM_DIR):
            if name.endswith(".py"):
                os.remove(os.path.join(PROGRAM_DIR, name))
        self.files = {}
        for name, source in files.items():
            path = os.path.abspath(os.path.join(PROGRAM_DIR, name))
            with open(path, "w", encoding="utf-8", newline="\n") as handle:
                handle.write(source)
            self.files[path] = name
            sys.modules.pop(name[:-3], None)
        linecache.clearcache()
        if PROGRAM_DIR not in sys.path:
            sys.path.insert(0, PROGRAM_DIR)
        self.watch = watch or {}
        self.actions = tuple(actions or ("env.step(",))
        self.lines_run = 0
        self.last_line = {}
        self.returned = None
        self.output = io.StringIO()
        self.command = None   # pause before the very first line
        self.reply = None
        sys.stdout = self.output
        self.thread = threading.Thread(target=self.run_program, args=(entry,), daemon=True)
        self.thread.start()
        return self.wait()

    def wait(self):
        with self.lock:
            while self.reply is None:
                self.lock.wait()
            reply, self.reply = self.reply, None
        return reply

    def step(self, mode, file=None, line=None, limit=2_000_000, targets=None):
        if not (self.thread and self.thread.is_alive()):
            return {"type": "error", "error": "The program isn't running. Load it again."}
        frame_depth = self.paused_depth()
        with self.lock:
            self.command = {"mode": mode, "file": file, "line": line, "limit": limit, "count": 0, "depth": frame_depth,
                            "targets": {(t[0], t[1]) for t in (targets or [])}}
            self.lock.notify_all()
        return self.wait()

    def paused_depth(self):
        frame = sys._current_frames().get(self.thread.ident)
        while frame is not None and frame.f_code.co_filename not in self.files:
            frame = frame.f_back
        return self.depth(frame)

    def set_value(self, target, value):
        """Change a value in the paused program, e.g. agent.epsilon = 0.0, in the innermost frame
        that can see the name."""
        frame = sys._current_frames().get(self.thread.ident) if self.thread else None
        frames = []
        while frame is not None:
            if frame.f_code.co_filename in self.files:
                frames.append(frame)
            frame = frame.f_back
        root = target.split(".")[0].split("[")[0]
        for f in frames:
            if target == root and root in f.f_locals:
                f.f_locals[root] = value   # Python 3.13+: writes through to the paused function
                return self.capture(frames[0])
            if root in f.f_locals or root in f.f_globals:
                scope = dict(f.f_globals)
                scope.update(f.f_locals)
                scope["__value__"] = value
                exec(f"{target} = __value__", scope)
                return self.capture(frames[0])
        return {"type": "error", "error": f"No running function can see {root}."}


def main():
    stepper = Stepper()
    send({"type": "ready", "version": sys.version.split()[0], "executable": sys.executable})
    for raw in sys.stdin:
        if not raw.strip():
            continue
        message = json.loads(raw)
        try:
            cmd = message["cmd"]
            if cmd == "load":
                reply = stepper.load(message["files"], message["entry"], message.get("watch"), message.get("actions"))
            elif cmd == "step":
                reply = stepper.step(message.get("mode", "into"), message.get("file"), message.get("line"), message.get("limit", 2_000_000), message.get("targets"))
            elif cmd == "set":
                reply = stepper.set_value(message["target"], message["value"])
            elif cmd == "stop":
                stepper.stop()
                reply = {"type": "stopped"}
            else:
                reply = {"type": "error", "error": f"Unknown command {cmd}"}
        except Exception as error:
            reply = {"type": "error", "error": f"{type(error).__name__}: {error}", "traceback": traceback.format_exc()[-2000:]}
        reply["id"] = message.get("id")
        send(reply)


if __name__ == "__main__":
    main()
