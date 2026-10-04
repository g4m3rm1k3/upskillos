"""CodeLens Python tracer.

Runs a learner's program under sys.settrace and records, at every line it executes:
the call stack with each frame's variables, and the objects reachable from those
variables (lists, tuples, dicts, sets, deques and instances of the learner's own
classes) as heap events. The result has the same shape the JavaScript interpreter
produces (src/labs/codelens/codelens/types.ts ExecutionResult), so every CodeLens view
works for Python too.

The same file runs in two places:
  - the browser, inside Pyodide in a Web Worker (interpreter/pythonExecution.worker.ts);
  - the desktop app, on the learner's own CPython (interpreter/pythonExecutionClient.ts).

Values
  A variable or property holds a plain JSON value for None/bool/int/float/str, or
  {"$ref": n} for a tracked object, where n is a small id that stays the same for the
  object's whole life. Two variables pointing at the same list therefore show the same
  id, which is how the heap view draws shared references.

Heap events
  At each step the tracer walks the objects reachable from the learner's frames and
  diffs them against the previous step: a new object becomes "create", a changed
  property "mutate", a removed one "delete", and an object no longer reachable "free".

What each line does
  Every statement_enter event (a line about to run) carries `statement`: what kind of
  statement the line is, read from the program's syntax tree (an assignment, an `if`, a
  `for` loop, a `return`, a call...), with its code. What running the line actually did
  (its `outcome`) is worked out afterwards from the events that follow it, by
  src/labs/codelens/codelens/traceOutcomes.ts, shared with the C/C++ tracer; the
  explanation panel turns both into a sentence per line (explainTrace.ts).
"""

import ast
import collections
import io
import reprlib
import json
import re
import sys
import time
import types

USER_FILE = '<codelens>'

DEFAULT_LIMITS = {
    'maxRuntimeMs': 5000,
    'maxSteps': 20000,
    'maxEvents': 20000,
    'maxOutputLines': 500,
    'maxOutputChars': 100000,
    'maxRecursionDepth': 200,
    'maxHeapObjects': 400,
    'maxSnapshotItems': 60,
    'maxSnapshotChars': 200,
    'maxExpressions': 30000,         # expression values recorded in the whole run
    'maxExpressionsPerStep': 120,    # ...and between two events (a long comprehension)
}

_CONTAINERS = (list, tuple, dict, set, frozenset, collections.deque)
_NOT_DATA = (types.FunctionType, types.BuiltinFunctionType, types.MethodType,
             types.ModuleType, type, types.GeneratorType, types.CodeType, types.FrameType)


# How previews of objects are written: a few items of each container, short strings.
_PREVIEW = reprlib.Repr()
_PREVIEW.maxlist = _PREVIEW.maxtuple = _PREVIEW.maxset = _PREVIEW.maxfrozenset = _PREVIEW.maxdeque = 10
_PREVIEW.maxdict = 6
_PREVIEW.maxstring = 40
_PREVIEW.maxother = 60
_PREVIEW.maxlevel = 3


class _LimitReached(BaseException):
    """Stops the learner's program. BaseException so `except Exception:` can't swallow it."""

    def __init__(self, kind, message):
        super().__init__(message)
        self.kind = kind
        self.message = message


class _Output(io.TextIOBase):
    """Captures print() output, bounded by the output limits."""

    def __init__(self, tracer):
        self.tracer = tracer
        self.parts = []
        self.chars = 0
        self.line_count = 0

    def writable(self):
        return True

    def write(self, text):
        limits = self.tracer.limits
        self.chars += len(text)
        self.line_count += text.count('\n')
        if self.chars > limits['maxOutputChars']:
            raise _LimitReached('output', f"Output limit ({limits['maxOutputChars']:,} characters) reached")
        self.parts.append(text)
        if self.line_count > limits['maxOutputLines']:
            raise _LimitReached('output', f"Output limit ({limits['maxOutputLines']} lines) reached")
        return len(text)

    def lines(self):
        text = ''.join(self.parts)
        if text.endswith('\n'):
            text = text[:-1]
        return text.split('\n') if text else []


class _ScriptedStdin(io.TextIOBase):
    """Standard input from the Input box (scriptedInput.ts), read one line at a time.

    input() reads through sys.stdin.readline() whenever sys.stdin isn't a terminal, so
    replacing sys.stdin is enough for input(), sys.stdin.readline() and `for line in
    sys.stdin`. Each line read is echoed into the output, the way a terminal shows what
    was typed, and reported on the next trace event as `inputRead`."""

    def __init__(self, tracer, lines):
        self.tracer = tracer
        self.lines = list(lines)

    def readable(self):
        return True

    def readline(self, size=-1):
        if not self.lines:
            return ''   # end of input: input() raises EOFError, as at a real end of file
        line = self.lines.pop(0)
        self.tracer.input_read.append(line)
        if self.tracer.output is not None:
            self.tracer.output.write(line + '\n')
        return line + '\n'

    def read(self, size=-1):
        text = ''
        while self.lines and (size < 0 or len(text) < size):
            text += self.readline()
        return text


class Tracer:
    def __init__(self, limits):
        self.limits = {**DEFAULT_LIMITS, **(limits or {})}
        self.events = []
        self.ids = {}          # id(obj) -> stable small id
        self.alive = []        # keeps tracked objects alive so CPython can't reuse their id()
        self.previous = {}     # small id -> (type name, properties) at the last step
        self.started = time.monotonic()
        self.steps = 0
        self.depth = 0
        self.frame_values = {}  # id(frame) -> its variables at its previous event (for 'changes')
        self.statements = {}    # line -> what the statement starting on it is (statement_info)
        self.output = None      # the _Output capturing print(), for 'printed'
        self.printed_parts = 0  # how many output parts earlier events have already reported
        self.input_read = []    # standard-input lines read since the previous event
        self.previews = {}      # object id -> (preview, type name), last seen (with_preview)
        self.screen = None      # the pygame stand-in (codelens_pygame.Screen), if the program uses one
        self.expressions = []   # (expression id, depth, value) recorded since the previous event
        self.expression_count = 0

    def record_expression(self, ident, value):
        """The rewritten program calls this with each sub-expression's value (see
        _ExpressionRecorder); it returns the value unchanged."""
        if self.expression_count < self.limits['maxExpressions'] and len(self.expressions) < self.limits['maxExpressionsPerStep'] \
                and not isinstance(value, _NOT_DATA):   # a function or module named in the code isn't a result
            self.expression_count += 1
            self.expressions.append([ident, self.depth, self.expression_value(value)])
        return value

    def expression_value(self, value):
        """Like value(), but never numbers a new object: a temporary list in an expression
        would otherwise shift the numbers of the program's own objects, and be kept alive
        (see object_id) for the rest of the run. An object already numbered shows as itself."""
        if self.is_tracked(value):
            small = self.ids.get(id(value))
            if small is not None:
                return self.with_preview({'$ref': small}, value)
            text = repr(value)
            return text if len(text) <= 60 else text[:59] + '…'
        return self.value(value)

    # ── values ──────────────────────────────────────────────────────────────

    def is_tracked(self, value):
        if isinstance(value, _CONTAINERS):
            return True
        if isinstance(value, _NOT_DATA):
            return False
        # Instances of the learner's own classes (defined in the program, so in __main__).
        return getattr(type(value), '__module__', None) == '__main__'

    def preview(self, obj):
        """A short text of what an object holds, such as (0, 1) or [-1, -1, -5, -7], for
        explanations: "Returns (0, 1)" says more than "Returns object #4". Instances of the
        learner's classes without their own __repr__ show their fields: Point(x=1, y=2)."""
        try:
            if not isinstance(obj, _CONTAINERS) and type(obj).__repr__ is object.__repr__:
                fields = [(k, v) for k, v in vars(obj).items() if not k.startswith('__')][:6]
                text = f"{type(obj).__name__}({', '.join(f'{k}={_PREVIEW.repr(v)}' for k, v in fields)})"
            else:
                text = _PREVIEW.repr(obj)
        except Exception:
            return None
        return text if len(text) <= 80 else text[:79] + '…'

    def with_preview(self, shown, obj):
        """{"$ref": n} plus the object's preview and type, for values an explanation names."""
        text = self.preview(obj)
        if not text:
            return shown
        # Remembered, so a later "x: (3, 1) → (3, 2)" can show the old object too, after it is gone.
        self.previews[shown['$ref']] = (text, type(obj).__name__)
        return {**shown, 'preview': text, 'objectType': type(obj).__name__}

    def shown(self, obj):
        """value(), with a preview when it is a numbered object."""
        out = self.value(obj)
        return self.with_preview(out, obj) if isinstance(out, dict) and '$ref' in out else out

    def preview_changes(self, frame, changes):
        """Copies of the changes, with a preview for a variable that now holds an object. (The
        stack snapshot keeps the bare {"$ref": n}, which the heap view compares.)"""
        out = []
        for change in changes:
            value = change['newValue']
            if isinstance(value, dict) and '$ref' in value and change['name'] in frame.f_locals:
                change = {**change, 'newValue': self.with_preview(value, frame.f_locals[change['name']])}
            old = change.get('oldValue')
            if isinstance(old, dict) and '$ref' in old and old['$ref'] in self.previews:
                text, type_name = self.previews[old['$ref']]
                change = {**change, 'oldValue': {**old, 'preview': text, 'objectType': type_name}}
            out.append(change)
        return out

    def object_id(self, value):
        key = id(value)
        small = self.ids.get(key)
        if small is None:
            small = len(self.ids) + 1
            self.ids[key] = small
            self.alive.append(value)
        return small

    def value(self, value):
        if value is None or isinstance(value, bool):
            return value
        if isinstance(value, int):
            return value if abs(value) < 2 ** 53 else str(value)
        if isinstance(value, float):
            return value if value == value and value not in (float('inf'), float('-inf')) else str(value)
        if isinstance(value, str):
            limit = self.limits['maxSnapshotChars']
            return value if len(value) <= limit else value[:limit - 1] + '…'
        if self.is_tracked(value):
            return {'$ref': self.object_id(value)}
        if isinstance(value, (types.FunctionType, types.BuiltinFunctionType, types.MethodType)):
            return f'[Function: {getattr(value, "__name__", "?")}]'   # same form as the JavaScript interpreter
        if isinstance(value, type):
            return f'[Class: {value.__name__}]'
        if isinstance(value, types.ModuleType):
            return f'[Module: {value.__name__}]'
        text = repr(value)
        return text if len(text) <= 80 else text[:79] + '…'

    def type_name(self, obj):
        return type(obj).__name__

    def properties(self, obj):
        """The object's contents as {name: value}, bounded by maxSnapshotItems."""
        limit = self.limits['maxSnapshotItems']
        props = {}
        if isinstance(obj, (list, tuple, collections.deque)):
            for index, item in enumerate(obj):
                if index >= limit:
                    props['…'] = f'{len(obj) - limit} more'
                    break
                props[str(index)] = self.value(item)
        elif isinstance(obj, dict):
            for index, (key, item) in enumerate(obj.items()):
                if index >= limit:
                    props['…'] = f'{len(obj) - limit} more'
                    break
                props[key if isinstance(key, str) else repr(key)] = self.value(item)
        elif isinstance(obj, (set, frozenset)):
            # Sets have no order of their own; sort by repr so a set that hasn't changed
            # doesn't look changed between steps.
            for index, item in enumerate(sorted(obj, key=repr)):
                if index >= limit:
                    props['…'] = f'{len(obj) - limit} more'
                    break
                props[str(index)] = self.value(item)
        else:
            fields = dict(getattr(obj, '__dict__', {}))
            for slot in getattr(type(obj), '__slots__', ()):
                if hasattr(obj, slot):
                    fields[slot] = getattr(obj, slot)
            for index, (name, item) in enumerate(fields.items()):
                if name.startswith('__'):
                    continue
                if index >= limit:
                    props['…'] = f'{len(fields) - limit} more'
                    break
                props[name] = self.value(item)
        return props

    # ── frames ──────────────────────────────────────────────────────────────

    @staticmethod
    def is_user_frame(frame):
        return frame.f_code.co_filename == USER_FILE

    @staticmethod
    def frame_name(frame):
        name = frame.f_code.co_name
        return '(global)' if name == '<module>' else name

    @staticmethod
    def visible_locals(frame):
        """The learner's own variables: no dunders (__builtins__, __name__, ...) and, at
        module level, no imported modules."""
        at_module_level = frame.f_code.co_name == '<module>'
        return [(name, item) for name, item in frame.f_locals.items()
                if not name.startswith('__') and not (at_module_level and isinstance(item, types.ModuleType))]

    @staticmethod
    def is_class_body(frame):
        # Python runs a class statement's body as a frame of its own. Tracing it as a call
        # would read as if the class were being called. Every function (and lambda) is
        # compiled with the CO_OPTIMIZED flag; a class body never is, and neither is the
        # module, which is told apart by its name. (Checking for __qualname__ in the frame's
        # variables doesn't work: they aren't set yet when the 'call' event fires.)
        CO_OPTIMIZED = 0x1
        code = frame.f_code
        return code.co_name != '<module>' and not (code.co_flags & CO_OPTIMIZED)

    def frame_locals(self, frame):
        return {name: self.value(item) for name, item in self.visible_locals(frame)}

    def stack(self, frame):
        frames = []
        current = frame
        while current is not None:
            if self.is_user_frame(current) and not self.is_class_body(current):
                frames.append({'name': self.frame_name(current), 'line': current.f_lineno, 'locals': self.frame_locals(current)})
            current = current.f_back
        frames.reverse()   # outermost first, like the JavaScript interpreter
        return frames

    # ── heap diff ───────────────────────────────────────────────────────────

    def heap_delta(self, frame):
        """Walk every object reachable from the learner's frames; diff against last step."""
        roots = []
        current = frame
        while current is not None:
            if self.is_user_frame(current) and not self.is_class_body(current):
                roots.extend(item for _, item in self.visible_locals(current))
            current = current.f_back

        current_state = {}
        queue = [v for v in roots if self.is_tracked(v)]
        seen = set()
        while queue and len(current_state) < self.limits['maxHeapObjects']:
            obj = queue.pop(0)
            if id(obj) in seen:
                continue
            seen.add(id(obj))
            small = self.object_id(obj)
            props = self.properties(obj)
            current_state[small] = (self.type_name(obj), props)
            children = obj.values() if isinstance(obj, dict) else (obj if isinstance(obj, _CONTAINERS) else props_source(obj))
            for child in list(children)[: self.limits['maxSnapshotItems']]:
                if self.is_tracked(child) and id(child) not in seen:
                    queue.append(child)

        delta = []
        for small, (type_name, props) in current_state.items():
            before = self.previous.get(small)
            if before is None:
                delta.append({'op': 'create', 'objectId': small, 'objectType': type_name, 'properties': props})
                continue
            old_props = before[1]
            for name, new_value in props.items():
                if name not in old_props:
                    # A new property: no oldValue, which is different from an old value of None.
                    delta.append({'op': 'mutate', 'objectId': small, 'objectType': type_name, 'property': name, 'newValue': new_value})
                elif old_props[name] != new_value:
                    delta.append({'op': 'mutate', 'objectId': small, 'objectType': type_name, 'property': name,
                                  'oldValue': old_props[name], 'newValue': new_value})
            for name in old_props:
                if name not in props:
                    delta.append({'op': 'delete', 'objectId': small, 'objectType': type_name, 'property': name})
        for small in self.previous:
            if small not in current_state:
                delta.append({'op': 'free', 'objectId': small})
        self.previous = current_state
        return delta

    # ── events ──────────────────────────────────────────────────────────────

    def check_limits(self):
        limits = self.limits
        elapsed_ms = (time.monotonic() - self.started) * 1000
        if elapsed_ms > limits['maxRuntimeMs']:
            raise _LimitReached('timeout', f"Runtime limit ({limits['maxRuntimeMs']:,} ms) reached")
        if self.steps > limits['maxSteps']:
            raise _LimitReached('steps', f"Step limit ({limits['maxSteps']:,} lines executed) reached")
        if len(self.events) >= limits['maxEvents']:
            raise _LimitReached('events', f"Trace limit ({limits['maxEvents']:,} events) reached")

    def changes(self, frame, current_locals):
        """Variables of this frame that are new or changed since its previous event, as
        [{name, oldValue, newValue, isNew}], for the step-by-step explanation."""
        key = id(frame)
        before = self.frame_values.get(key)
        self.frame_values[key] = current_locals
        if before is None:
            return []
        out = []
        for name, value in current_locals.items():
            if name not in before:
                out.append({'name': name, 'newValue': value, 'isNew': True})
            elif before[name] != value:
                out.append({'name': name, 'oldValue': before[name], 'newValue': value, 'isNew': False})
        return out

    def emit(self, event_type, frame, **payload):
        line = frame.f_lineno
        stack = self.stack(frame)
        current_locals = stack[-1]['locals'] if stack else {}
        printed = ''
        if self.output is not None and len(self.output.parts) > self.printed_parts:
            printed = ''.join(self.output.parts[self.printed_parts:])
            self.printed_parts = len(self.output.parts)
        event = {
            'stepId': len(self.events),
            'type': event_type,
            'language': 'python',
            'line': line,
            'sourceLocation': {'line': line},
            'stackSnapshot': stack,
            'heapDelta': self.heap_delta(frame),
            'changes': self.preview_changes(frame, self.changes(frame, current_locals)),
            **payload,
        }
        if printed:
            event['printed'] = printed   # what print() wrote since the previous event
        if self.input_read:
            event['inputRead'] = self.input_read   # standard-input lines read since the previous event
            self.input_read = []
        if self.screen is not None:
            self.screen.annotate(event)
        if self.expressions:
            # [[expression id, depth, value], ...] in evaluation order; the ids index the
            # result's `expressions` table. depth tells a line's own expressions apart from
            # those of functions it called.
            event['expressions'] = self.expressions
            self.expressions = []
        if event_type == 'statement_enter' and line in self.statements:
            event['statement'] = self.statements[line]
        self.events.append(event)

    def trace(self, frame, event, arg):
        if not self.is_user_frame(frame) or (event == 'call' and self.is_class_body(frame)):
            return None   # library code: don't trace inside it (calls back into user code still are)
        if event == 'call':
            self.depth += 1
            if self.depth > self.limits['maxRecursionDepth']:
                raise _LimitReached('recursion', f"Recursion limit ({self.limits['maxRecursionDepth']} nested calls) reached")
            if frame.f_code.co_name != '<module>':
                args = [self.shown(frame.f_locals.get(name)) for name in frame.f_code.co_varnames[: frame.f_code.co_argcount]]
                arg_names = list(frame.f_code.co_varnames[: frame.f_code.co_argcount])
                self.emit('function_call', frame, functionName=self.frame_name(frame), args=args, argNames=arg_names)
            return self.trace
        if event == 'line':
            self.steps += 1
            self.check_limits()
            self.emit('statement_enter', frame)
        elif event == 'return':
            self.depth -= 1
            if frame.f_code.co_name != '<module>':
                self.emit('function_return', frame, functionName=self.frame_name(frame), returnValue=self.shown(arg))
            else:
                # A 'line' event fires before its line runs, so without this the effect of
                # the program's last line would never be shown.
                self.emit('program_end', frame)
            # Python reuses a finished frame's id() for later frames; forget this one so a
            # new call isn't compared with a dead call's variables.
            self.frame_values.pop(id(frame), None)
        return self.trace


def props_source(obj):
    """Values held by a learner-class instance, for walking the object graph."""
    values = list(getattr(obj, '__dict__', {}).values())
    for slot in getattr(type(obj), '__slots__', ()):
        if hasattr(obj, slot):
            values.append(getattr(obj, slot))
    return values


def _user_line(error):
    tb = error.__traceback__
    line = None
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == USER_FILE:
            line = tb.tb_lineno
        tb = tb.tb_next
    return line


def _line_span(nodes):
    """[first line, last line] covered by a list of statements, or None."""
    if not nodes:
        return None
    return [nodes[0].lineno, getattr(nodes[-1], 'end_lineno', nodes[-1].lineno)]


def _names(target):
    """Variable names a target assigns: `a`, `a, b`, `self.x` (as "self.x"), `items[0]`."""
    if isinstance(target, ast.Name):
        return [target.id]
    if isinstance(target, (ast.Tuple, ast.List)):
        return [name for element in target.elts for name in _names(element)]
    try:
        return [ast.unparse(target)]
    except Exception:
        return []


def _call_name(node):
    try:
        return ast.unparse(node.func)
    except Exception:
        return None


def statement_info(source):
    """line -> {kind, code, ...} for the statement that starts on each line.

    `code` is the line's own text (for an `if` or a loop, just its header). Compound
    statements add where their parts are, so the outcome can tell which way they went:
    `body` and `orelse` as [first line, last line]."""
    lines = source.split('\n')
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return {}
    info = {}
    for node in ast.walk(tree):
        if not isinstance(node, ast.stmt) or node.lineno in info:
            continue   # ast.walk visits outer statements first; keep the outermost per line
        text = lines[node.lineno - 1].strip() if node.lineno - 1 < len(lines) else ''
        entry = {'kind': type(node).__name__, 'code': text if len(text) <= 120 else text[:119] + '\u2026'}
        if isinstance(node, (ast.If, ast.While, ast.For, ast.AsyncFor)):
            entry['body'] = _line_span(node.body)
            if node.orelse:
                entry['orelse'] = _line_span(node.orelse)
            if isinstance(node, ast.If):
                entry['isElif'] = text.startswith('elif')
        if isinstance(node, (ast.For, ast.AsyncFor)):
            entry['targets'] = _names(node.target)
            try:
                entry['iterable'] = ast.unparse(node.iter)
            except Exception:
                pass
        if isinstance(node, (ast.If, ast.While)):
            try:
                entry['condition'] = ast.unparse(node.test)
            except Exception:
                pass
        if isinstance(node, ast.Assign):
            entry['targets'] = [name for target in node.targets for name in _names(target)]
        if isinstance(node, (ast.AugAssign, ast.AnnAssign)):
            entry['targets'] = _names(node.target)
        if isinstance(node, ast.AugAssign):
            entry['operator'] = type(node.op).__name__
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            entry['name'] = node.name
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call):
            entry['call'] = _call_name(node.value)
        if isinstance(node, ast.Return) and node.value is not None:
            try:
                entry['expression'] = ast.unparse(node.value)
            except Exception:
                pass
        info[node.lineno] = entry
    return info


# ── expressions ──────────────────────────────────────────────────────────────
#
# A line event only says which line is about to run, so `total += price * qty - discount`
# would show only its end result. To show its steps, the program's syntax tree is rewritten
# before it runs: each sub-expression `e` becomes `__codelens_expr__(n, e)`, a call that
# records expression n's value and returns it unchanged. Python evaluates the arguments
# before the call, so the inner parts are recorded first: the log is the evaluation order.
# `a and b` still skips b when a is false, since b's wrapper sits inside the `and`.
#
# Left alone, because rewriting them would change what the program means or is allowed:
# assignment and `del` targets, the function part of a call (`super()` only works called
# directly), patterns in `match`, annotations, decorators, `yield`, `await`, `*args`,
# slices (`a[1:2]`), and constants (their value is in the code already).

EXPR_HOOK = '__codelens_expr__'


class _ExpressionRecorder(ast.NodeTransformer):
    def __init__(self, source):
        self.source = source
        self.lines = source.split('\n')
        self.spans = []   # expression id -> {line, col, endLine, endCol, code}; columns count characters from 0

    def column(self, line, byte_offset):
        """The syntax tree counts columns in UTF-8 bytes; an editor counts characters."""
        text = self.lines[line - 1] if 0 < line <= len(self.lines) else ''
        return len(text.encode('utf-8')[:byte_offset].decode('utf-8', 'replace'))

    def wrap(self, node):
        if node is None:
            return None
        negative_literal = isinstance(node, ast.UnaryOp) and isinstance(node.operand, ast.Constant)   # -1 is a constant too
        if negative_literal or isinstance(node, (ast.Constant, ast.Starred, ast.Slice, ast.Yield, ast.YieldFrom, ast.Await, ast.Lambda)) \
                or not isinstance(getattr(node, 'ctx', ast.Load()), ast.Load):
            return self.visit(node)
        inner = self.visit(node)
        code = ast.get_source_segment(self.source, node) or ''
        if not code:
            return inner
        ident = len(self.spans)
        self.spans.append({'line': node.lineno, 'col': self.column(node.lineno, node.col_offset),
                           'endLine': node.end_lineno, 'endCol': self.column(node.end_lineno, node.end_col_offset),
                           'code': code if len(code) <= 80 else code[:79] + '…'})
        call = ast.Call(func=ast.Name(id=EXPR_HOOK, ctx=ast.Load()), args=[ast.Constant(ident), inner], keywords=[])
        return ast.copy_location(call, node)

    # Expressions: wrap each child expression, then the parent wraps this node.
    def generic_visit(self, node):
        for field, value in ast.iter_fields(node):
            if isinstance(value, list):
                setattr(node, field, [self.wrap(item) if isinstance(item, ast.expr) else self.visit(item) if isinstance(item, ast.AST) else item for item in value])
            elif isinstance(value, ast.expr):
                setattr(node, field, self.wrap(value))
            elif isinstance(value, ast.AST):
                setattr(node, field, self.visit(value))
        return node

    def visit_Call(self, node):
        # The function itself isn't wrapped (see above), but what it is looked up on is:
        # in `rows[i].append(x)`, `rows[i]` is recorded.
        if isinstance(node.func, ast.Attribute):
            node.func.value = self.wrap(node.func.value)
        elif not isinstance(node.func, ast.Name):
            node.func = self.visit(node.func)
        node.args = [self.wrap(arg) for arg in node.args]
        for keyword in node.keywords:
            keyword.value = self.wrap(keyword.value)
        return node

    def visit_Subscript(self, node):
        node.value = self.wrap(node.value)
        index = node.slice
        if isinstance(index, ast.Slice):
            node.slice = self.visit(index)
        elif isinstance(index, ast.Tuple) and any(isinstance(e, ast.Slice) for e in index.elts):
            index.elts = [self.visit(e) if isinstance(e, ast.Slice) else self.wrap(e) for e in index.elts]
        else:
            node.slice = self.wrap(index)
        return node

    def visit_Attribute(self, node):
        node.value = self.wrap(node.value)
        return node

    def visit_Lambda(self, node):
        node.body = self.wrap(node.body)
        return node

    def visit_JoinedStr(self, node):
        for part in node.values:
            if isinstance(part, ast.FormattedValue):
                part.value = self.wrap(part.value)
        return node

    def visit_Dict(self, node):
        node.keys = [self.wrap(key) if key is not None else None for key in node.keys]
        node.values = [self.wrap(value) for value in node.values]
        return node

    # Statements: only the parts that are evaluated as values.
    def visit_FunctionDef(self, node):
        node.body = [self.visit(statement) for statement in node.body]
        return node

    visit_AsyncFunctionDef = visit_FunctionDef

    def visit_ClassDef(self, node):
        node.body = [self.visit(statement) for statement in node.body]
        return node

    def visit_AnnAssign(self, node):
        if node.value is not None:
            node.value = self.wrap(node.value)
        node.target = self.visit(node.target)
        return node

    def visit_Match(self, node):
        node.subject = self.wrap(node.subject)
        for case in node.cases:
            if case.guard is not None:
                case.guard = self.wrap(case.guard)
            case.body = [self.visit(statement) for statement in case.body]
        return node

    def visit_arguments(self, node):
        return node   # defaults are evaluated once, at the def; not worth the noise

    def visit_ExceptHandler(self, node):
        if node.type is not None:
            node.type = self.wrap(node.type)
        node.body = [self.visit(statement) for statement in node.body]
        return node


def _compile_with_expressions(source):
    """(code object, expression spans), or (plain code object, []) if rewriting fails."""
    try:
        tree = ast.parse(source, USER_FILE)
        recorder = _ExpressionRecorder(source)
        tree = ast.fix_missing_locations(recorder.visit(tree))
        return compile(tree, USER_FILE, 'exec'), recorder.spans
    except SyntaxError:
        raise
    except Exception:
        return compile(source, USER_FILE, 'exec'), []


def run(source, limits=None, inputs=None):
    """Trace `source`; return a CodeLens ExecutionResult as a dict.

    `inputs` is the parsed Input box (scriptedInput.ts): {"stdin": [lines], "events":
    [scripted pygame events]}."""
    inputs = inputs or {}
    tracer = Tracer(limits)
    output = _Output(tracer)
    tracer.output = output
    tracer.statements = statement_info(source)
    result = {'events': tracer.events, 'output': [], 'error': None, 'status': 'completed'}

    try:
        code, spans = _compile_with_expressions(source)
    except SyntaxError as error:
        result['error'] = {'type': 'SyntaxError', 'message': error.msg, 'line': error.lineno}
        result['status'] = 'syntax-error'
        return result

    saved_stdout, saved_stdin = sys.stdout, sys.stdin
    sys.stdout = output
    sys.stdin = _ScriptedStdin(tracer, inputs.get('stdin') or [])
    try:
        _install_pygame_stand_in(source, tracer, inputs.get('events') or [])
    except ValueError as error:   # a key name pygame doesn't know, in the Input box
        sys.stdout, sys.stdin = saved_stdout, saved_stdin
        result['status'] = 'runtime-error'
        result['error'] = {'type': 'InputError', 'message': str(error)}
        return result
    sys.settrace(tracer.trace)
    try:
        exec(code, {'__name__': '__main__', '__builtins__': __builtins__, EXPR_HOOK: tracer.record_expression})
    except _LimitReached as limit:
        result['status'] = 'limit'
        result['limit'] = {'kind': limit.kind, 'message': limit.message}
    except SystemExit:
        pass
    except RecursionError as error:
        result['status'] = 'limit'
        result['limit'] = {'kind': 'recursion', 'message': f'RecursionError: {error}'}
    except BaseException as error:   # the learner's own uncaught exception
        line = _user_line(error)
        message = str(error)
        if isinstance(error, EOFError) and isinstance(sys.stdin, _ScriptedStdin) and not sys.stdin.lines:
            message += ': the program asked for more input than the Input box has'
        result['status'] = 'runtime-error'
        result['error'] = {'type': type(error).__name__, 'message': message}
        tracer.events.append({
            'stepId': len(tracer.events),
            'type': 'error_thrown',
            'language': 'python',
            'errorType': type(error).__name__,
            'message': message,
            'line': line,
            'sourceLocation': {'line': line} if line else None,
            'stackSnapshot': tracer.events[-1]['stackSnapshot'] if tracer.events else [],
            'heapDelta': [],
        })
    finally:
        sys.settrace(None)
        sys.stdout, sys.stdin = saved_stdout, saved_stdin
        _uninstall_pygame_stand_in()
    result['output'] = output.lines()
    if tracer.screen is not None:
        result['frames'] = tracer.screen.frames
    if spans:
        result['expressions'] = spans
    return result


def _install_pygame_stand_in(source, tracer, events):
    """If the program imports pygame, it gets the real library with its window, clock and
    input replaced (codelens_pygame.py), so a game runs without a window, at a fixed frame
    rate, on the scripted events, and every picture it draws is recorded. The stand-in is
    installed only for a program that imports pygame; one that doesn't pays nothing. If
    pygame isn't installed, nothing is installed, and the program's own import fails with
    the usual ModuleNotFoundError."""
    if not re.search(r'^\s*(?:import|from)\s+pygame\b', source, re.M):
        return
    try:
        import codelens_pygame
    except ImportError:
        return
    codelens_pygame.prepare()
    try:
        import pygame  # noqa: F401  (only to find out whether it's installed)
    except ImportError:
        return
    codelens_pygame.install(tracer, events)


def _uninstall_pygame_stand_in():
    stand_in = sys.modules.get('codelens_pygame')
    if stand_in is not None:
        stand_in.uninstall()


def run_to_json(source, limits=None, inputs=None):
    """run() as a JSON string; what both hosts call."""
    return json.dumps(run(source, limits, inputs), ensure_ascii=False, default=str)
