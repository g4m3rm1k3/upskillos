"""CodeLens tracer for compiled languages, run inside GDB (desktop app only).

Usage (see ../codelens.cjs):
    gdb -batch -nx -x gdb_tracer.py --args program.exe
with environment variables:
    CODELENS_SOURCE  the learner's source file name (only frames in it are traced)
    CODELENS_OUT     where to write the result: one JSON line per event ({"event": ...}),
                     written as it happens, then a last line {"result": {status, error, limit}}.
                     A program stuck on one line (`while (true) { n++; }`) never returns from
                     GDB's `step`, so the desktop app kills GDB at its time limit and builds
                     the result from the events written so far.
    CODELENS_LANG    'c' or 'cpp' (tags events for the explanations)
    CODELENS_LIMITS  JSON: maxSteps, maxRuntimeMs, maxRecursionDepth, maxHeapObjects, maxSnapshotItems

It steps through the program one source line at a time and writes a CodeLens
ExecutionResult (src/labs/codelens/codelens/types.ts) in the same shape as the Python
tracer (src/labs/codelens/codelens/interpreter/python/codelens_tracer.py):
  - statement_enter for each line about to run, with the call stack and each frame's
    variables (only those already declared at that line);
  - function_call / function_return when a frame of the learner's code starts or ends;
  - heapDelta: create / mutate / delete / free for the objects reachable from those
    variables: structs and classes, arrays, pointees (what a pointer points at) and
    standard containers (std::vector, std::map, ... via GDB's pretty printers).
Pointers become {"$ref": n} arrows to the object they point at, so the Structures view
draws linked lists and trees the way they are laid out in memory.
"""

import itertools
import json
import os
import re
import time

import gdb

SOURCE = os.environ.get('CODELENS_SOURCE', 'main.cpp')
OUT = os.environ['CODELENS_OUT']
LANG = os.environ.get('CODELENS_LANG', 'cpp')
LIMITS = {
    'maxSteps': 3000,
    'maxRuntimeMs': 15000,
    'maxRecursionDepth': 60,
    'maxHeapObjects': 200,
    'maxSnapshotItems': 40,
    **json.loads(os.environ.get('CODELENS_LIMITS', '{}')),
}

SCALAR_CODES = (gdb.TYPE_CODE_INT, gdb.TYPE_CODE_FLT, gdb.TYPE_CODE_BOOL,
                gdb.TYPE_CODE_CHAR, gdb.TYPE_CODE_ENUM)


PROGRAM_OUTPUT = 'program_output.txt'   # the program's stdout, kept apart from GDB's messages
PROGRAM_INPUT = 'program_input.txt'     # the program's stdin: the CodeLens Input box


def run_quietly(command):
    return gdb.execute(command, to_string=True)


def load_libstdcxx_printers():
    """Load libstdc++'s pretty printers, so std::vector, std::string and std::map read as
    lists and text instead of their internals. Running with -nx skips the startup file
    that normally does this. GCC installs them beside GDB's own Python directory, as
    <prefix>/share/gcc-<version>/python."""
    import glob
    import sys
    share = os.path.dirname(os.path.dirname(gdb.PYTHONDIR))
    for directory in sorted(glob.glob(os.path.join(share, 'gcc-*', 'python')), reverse=True):
        if directory not in sys.path:
            sys.path.insert(0, directory)
        try:
            from libstdcxx.v6.printers import register_libstdcxx_printers
            register_libstdcxx_printers(None)
            return True
        except Exception:
            continue
    return False


# ── What kind of statement each line is ─────────────────────────────────────
# The explanation panel says what each line does (src/labs/codelens/codelens/explainTrace.ts).
# Python's tracer reads that from the syntax tree; C and C++ have none available here, so
# lines are read as text: `if (...)`, loops, `return`, output, assignments, calls. Block
# extents come from matching braces, skipping strings, characters and comments.


def _skip_literal(source, index):
    """If source[index] starts a string, character literal or comment, the index just
    after it; otherwise None."""
    char = source[index]
    if char in '"\'':
        end = index + 1
        while end < len(source) and source[end] != char:
            end += 2 if source[end] == '\\' else 1
        return end + 1
    if source.startswith('//', index):
        end = source.find('\n', index)
        return len(source) if end < 0 else end
    if source.startswith('/*', index):
        end = source.find('*/', index + 2)
        return len(source) if end < 0 else end + 2
    return None


def _matching(source, open_index):
    """Index of the bracket that closes the one at open_index, or -1."""
    pairs = {'(': ')', '{': '}', '[': ']'}
    opener = source[open_index]
    closer = pairs[opener]
    depth = 0
    index = open_index
    while index < len(source):
        skipped = _skip_literal(source, index)
        if skipped is not None:
            index = skipped
            continue
        char = source[index]
        if char == opener:
            depth += 1
        elif char == closer:
            depth -= 1
            if depth == 0:
                return index
        index += 1
    return -1


def _top_level(text, separator):
    """Positions of `separator` in text outside brackets and literals."""
    positions = []
    depth = 0
    index = 0
    while index < len(text):
        skipped = _skip_literal(text, index)
        if skipped is not None:
            index = skipped
            continue
        char = text[index]
        if char in '([{':
            depth += 1
        elif char in ')]}':
            depth -= 1
        elif depth == 0 and text.startswith(separator, index):
            positions.append(index)
        index += 1
    return positions


COMPOUND_OPERATORS = {'+': 'Add', '-': 'Sub', '*': 'Mult', '/': 'Div', '%': 'Mod', '|': 'BitOr', '&': 'BitAnd', '^': 'BitXor'}


def _assignment(text):
    """(kind, target, operator) for `x = ...;`, `int x = ...;`, `x += ...;`, `x++;`, else None."""
    increment = re.match(r'^(?:\+\+|--)\s*([A-Za-z_][\w.\->\[\]]*)\s*;|^([A-Za-z_][\w.\->\[\]]*)\s*(?:\+\+|--)\s*;', text)
    if increment:
        target = increment.group(1) or increment.group(2)
        return ('AugAssign', target, 'Increment' if '++' in text else 'Decrement')
    for position in _top_level(text, '='):
        before = text[position - 1] if position else ''
        after = text[position + 1] if position + 1 < len(text) else ''
        if after == '=' or before in '=!<>':
            continue   # ==, !=, <=, >=
        left = text[:position]
        operator = None
        if before in COMPOUND_OPERATORS:
            operator = COMPOUND_OPERATORS[before]
            left = left[:-1]
        names = re.findall(r'[A-Za-z_][\w]*(?:\s*(?:\.|->)\s*[A-Za-z_]\w*|\s*\[[^\]]*\])*\s*$', left.strip())
        if not names:
            return None
        target = re.sub(r'\s+', '', names[-1])
        return ('AugAssign' if operator else 'Assign', target, operator)
    return None


def c_statement_info(source):
    """line -> {kind, code, ...}, with the same kinds and fields as the Python tracer."""
    lines = source.split('\n')
    starts = []
    offset = 0
    for line in lines:
        starts.append(offset)
        offset += len(line) + 1

    def line_of(index):
        low, high = 0, len(starts) - 1
        while low < high:
            middle = (low + high + 1) // 2
            if starts[middle] <= index:
                low = middle
            else:
                high = middle - 1
        return low + 1

    def block_after(index):
        """Lines of the block or single statement starting at `index`; (span, end index)."""
        while index < len(source) and source[index] in ' \t\r\n':
            index += 1
        if index < len(source) and source[index] == '{':
            close = _matching(source, index)
            if close < 0:
                return None, index
            first = line_of(index)
            # A '{' ending its line: the block's statements start on the next line.
            if source[index + 1:source.find('\n', index) if source.find('\n', index) >= 0 else len(source)].strip() == '':
                first += 1
            return [first, line_of(close)], close + 1
        end = source.find(';', index)
        return ([line_of(index), line_of(index)], end + 1) if end >= 0 else (None, index)

    info = {}
    for number, raw in enumerate(lines, 1):
        text = raw.strip()
        if not text or text.startswith(('//', '#', '/*', '*')):
            continue
        if text in ('}', '};'):
            info[number] = {'kind': 'BlockEnd', 'code': text}   # GDB stops on a function's closing brace
            continue
        code = text if len(text) <= 120 else text[:119] + '…'
        header = re.match(r'^\}?\s*(else\s+if|if|while|for)\s*\(', text)
        if header:
            keyword = header.group(1)
            open_index = starts[number - 1] + raw.index('(', raw.index(keyword.split()[-1]))
            close = _matching(source, open_index)
            if close < 0:
                continue
            inside = source[open_index + 1:close].strip()
            body, after = block_after(close + 1)
            entry = {'code': code, 'body': body}
            if keyword == 'for':
                if _top_level(inside, ';'):
                    parts = [part.strip() for part in re.split(r';', inside)]
                    entry.update(kind='CFor', init=parts[0], condition=parts[1] if len(parts) > 1 else '', update=parts[2] if len(parts) > 2 else '')
                else:
                    colons = [p for p in _top_level(inside, ':') if inside[p - 1:p] != ':' and inside[p + 1:p + 2] != ':']
                    declaration, iterable = (inside[:colons[0]], inside[colons[0] + 1:]) if colons else (inside, '')
                    names = re.findall(r'[A-Za-z_]\w*', declaration)
                    entry.update(kind='For', targets=names[-1:], iterable=iterable.strip())
            else:
                entry.update(kind='While' if keyword == 'while' else 'If', condition=inside)
                if keyword != 'while':
                    entry['isElif'] = keyword.startswith('else')
                    rest = source[after:].lstrip()
                    if rest.startswith('else'):
                        else_index = len(source) - len(rest)
                        else_body, _ = block_after(else_index + 4)
                        if else_body:
                            entry['orelse'] = [line_of(else_index), else_body[1]]
            info[number] = entry
            continue
        returned = re.match(r'^return\b\s*(.*?)\s*;\s*$', text)
        if returned:
            entry = {'kind': 'Return', 'code': code}
            if returned.group(1):
                entry['expression'] = returned.group(1)
            info[number] = entry
            continue
        if 'std::cout' in text or 'cout <<' in text or re.match(r'^(?:std::)?(printf|puts|putchar)\s*\(', text):
            info[number] = {'kind': 'Expr', 'code': code, 'call': 'std::cout' if 'cout' in text else re.match(r'^(?:std::)?(\w+)', text).group(1), 'prints': True}
            continue
        assignment = _assignment(text) if text.endswith(';') else None
        if assignment:
            kind, target, operator = assignment
            entry = {'kind': kind, 'code': code, 'targets': [target]}
            if operator:
                entry['operator'] = operator
            info[number] = entry
            continue
        call = re.match(r'^([A-Za-z_][\w:.\->]*)\s*\(.*\)\s*;$', text)
        if call:
            info[number] = {'kind': 'Expr', 'code': code, 'call': call.group(1)}
    return info


class ReturnWatch(gdb.FinishBreakpoint):
    """Catches a call's return value as it returns: GDB stops at the return address in the
    caller, where the value is still in the return register. It never actually stops the
    program (stop() returns False), so stepping carries on as if it weren't there."""

    def __init__(self, frame, tracer, depth):
        super().__init__(frame, internal=True)
        self.silent = True
        self.tracer = tracer
        self.depth = depth

    def stop(self):
        try:
            if self.return_value is not None:
                self.tracer.return_values[self.depth] = self.tracer.value(self.return_value)
        except Exception:
            pass
        return False

    def out_of_scope(self):
        pass


class LimitReached(Exception):
    def __init__(self, kind, message):
        super().__init__(message)
        self.kind = kind
        self.message = message


class Tracer:
    def __init__(self):
        self.events = []
        self.ids = {}            # (address, type name) -> small id
        self.previous = {}       # small id -> (type name, props) at the last step
        self.frame_values = {}   # frame identity -> its variables at its previous event
        self.started = time.monotonic()
        self.steps = 0
        self.stack_names = []    # function names of the learner's frames, outermost first
        self.tracked = {}        # small id -> gdb.Value, rebuilt each step
        self.completed_lines = {}  # frame depth -> lines that frame has run and moved on from
        self.last_line = {}        # frame depth -> the line that frame last stopped at
        self.out = open(OUT, 'w', encoding='utf-8')
        self.last_stack = []   # the stack of the last event, for returns (emit_return)
        self.return_values = {}  # frame depth -> the value its call just returned (ReturnWatch)
        self.output_offset = 0   # how much of the program's output earlier steps have shown
        try:
            with open(SOURCE, encoding='utf-8') as handle:
                self.statements = c_statement_info(handle.read())
        except Exception:
            self.statements = {}

    # ── values ──────────────────────────────────────────────────────────────

    def object_id(self, address, type_name):
        key = (int(address), type_name)
        small = self.ids.get(key)
        if small is None:
            small = len(self.ids) + 1
            self.ids[key] = small
        return small

    @staticmethod
    def visualizer(value):
        try:
            return gdb.default_visualizer(value)
        except Exception:
            return None

    def track(self, value):
        """A {"$ref": n} for an object (struct, array, container) at a known address."""
        address = value.address
        if address is None:
            return None
        type_name = str(value.type.strip_typedefs())
        small = self.object_id(address, type_name)
        self.tracked[small] = value
        return {'$ref': small}

    def value(self, value, depth=0):
        """A JSON value for a variable or field: scalars as themselves, everything with
        structure as a {"$ref": n} to an object."""
        try:
            kind = value.type.strip_typedefs()
            code = kind.code
            if code == gdb.TYPE_CODE_REF or code == getattr(gdb, 'TYPE_CODE_RVALUE_REF', -1):
                return self.value(value.referenced_value(), depth)
            printer = self.visualizer(value)
            if printer is not None:
                # std::string and friends print as text; containers have children.
                if not hasattr(printer, 'children'):
                    text = printer.to_string()
                    text = text.string() if isinstance(text, gdb.Value) else str(text)
                    return text.strip('"') if text.startswith('"') else text
                return self.track(value) or printer.to_string()
            if code == gdb.TYPE_CODE_BOOL:
                return bool(value)
            if code in (gdb.TYPE_CODE_INT, gdb.TYPE_CODE_ENUM):
                if code == gdb.TYPE_CODE_INT and kind.sizeof == 1 and 'char' in str(kind):
                    number = int(value)
                    return chr(number) if 32 <= number < 127 else number
                return int(value) if code == gdb.TYPE_CODE_INT else str(value)
            if code == gdb.TYPE_CODE_CHAR:
                number = int(value)
                return chr(number) if 32 <= number < 127 else number
            if code == gdb.TYPE_CODE_FLT:
                number = float(value)
                return number if number == number and abs(number) != float('inf') else str(number)
            if code == gdb.TYPE_CODE_PTR:
                address = int(value)
                if address == 0:
                    return None
                target = kind.target().strip_typedefs()
                if target.code == gdb.TYPE_CODE_FUNC:
                    return f'[Function: {str(value).split("<")[-1].rstrip(">")}]'
                if target.code == gdb.TYPE_CODE_INT and target.sizeof == 1:
                    try:
                        return value.string(length=200)
                    except Exception:
                        return hex(address)
                if target.code == gdb.TYPE_CODE_VOID:
                    return hex(address)
                try:
                    return self.track(value.dereference())
                except gdb.MemoryError:
                    return f'invalid pointer {hex(address)}'
            if code in (gdb.TYPE_CODE_STRUCT, gdb.TYPE_CODE_UNION, gdb.TYPE_CODE_ARRAY):
                return self.track(value)
            return str(value)
        except gdb.MemoryError:
            return '<unreadable>'
        except Exception as error:
            return f'<{type(error).__name__}>'

    def properties(self, value):
        limit = LIMITS['maxSnapshotItems']
        props = {}
        kind = value.type.strip_typedefs()
        printer = self.visualizer(value)
        try:
            if printer is not None and hasattr(printer, 'children'):
                # Never more than the display limit: a container read before it is
                # constructed has a garbage size, possibly billions of elements.
                children = list(itertools.islice(printer.children(), 2 * limit + 2))
                hint = printer.display_hint() if hasattr(printer, 'display_hint') else None
                if hint == 'map':
                    # Map printers yield key, value, key, value, ...
                    pairs = zip(children[0::2], children[1::2])
                    for index, ((_, key), (_, item)) in enumerate(pairs):
                        if index >= limit:
                            props['…'] = 'more'
                            break
                        shown = self.value(key) if isinstance(key, gdb.Value) else key
                        props[json.dumps(shown) if not isinstance(shown, str) else shown] = self.value(item) if isinstance(item, gdb.Value) else item
                else:
                    for index, (name, item) in enumerate(children):
                        if index >= limit:
                            props['…'] = 'more'
                            break
                        key = str(index) if name.startswith('[') or hint == 'array' else name
                        props[key] = self.value(item) if isinstance(item, gdb.Value) else item
            elif kind.code == gdb.TYPE_CODE_ARRAY:
                low, high = kind.range()
                for index in range(low, min(high, low + limit - 1) + 1):
                    props[str(index - low)] = self.value(value[index])
                if high - low + 1 > limit:
                    props['…'] = f'{high - low + 1 - limit} more'
            elif kind.code in (gdb.TYPE_CODE_STRUCT, gdb.TYPE_CODE_UNION):
                for field in kind.fields():
                    if field.artificial or field.name is None or field.name.startswith('_vptr'):
                        continue
                    if field.is_base_class:
                        props[f'({field.name})'] = self.value(value[field])
                    else:
                        try:
                            props[field.name] = self.value(value[field.name])
                        except gdb.error:
                            continue   # static members have no storage in the object
            else:
                props['value'] = self.value(value)
        except gdb.MemoryError:
            props['<unreadable>'] = True
        return props

    @staticmethod
    def type_label(value):
        kind = value.type.strip_typedefs()
        name = kind.name or str(kind)
        # Template arguments make labels unreadable: std::vector<int, std::allocator<int> > -> std::vector<int>
        if '<' in name:
            head, _, rest = name.partition('<')
            first = rest.split(',')[0].rstrip('> ')
            name = f'{head}<{first}>'
        return name

    # ── frames ──────────────────────────────────────────────────────────────

    @staticmethod
    def in_source(frame):
        try:
            sal = frame.find_sal()
            return sal.symtab is not None and os.path.basename(sal.symtab.filename) == SOURCE
        except Exception:
            return False

    def user_frames(self):
        frames = []
        frame = gdb.newest_frame()
        while frame is not None:
            if self.in_source(frame):
                frames.append(frame)
            frame = frame.older()
        frames.reverse()   # outermost first, like the other tracers
        return frames

    def frame_locals(self, frame, depth):
        """Arguments and the local variables that exist at the frame's current line.

        A variable declared further down doesn't exist yet. One declared on the line about
        to run doesn't either until that line has finished: its memory holds whatever was
        there before (`int result = f();` would show garbage). A line can stop more than
        once before it finishes (`std::vector<int> v = {3, 1, 4};` stops before and after
        building its initializer list, before the vector itself is constructed), so the
        test is whether the frame has run the line and moved on, not whether it stopped
        there before. A loop coming back to `for (int i = 0; ...)` has, so `i` shows."""
        out = {}
        try:
            line = frame.find_sal().line
            block = frame.block()
        except RuntimeError:
            return out
        line_finished = line in self.completed_lines.get(depth, set())
        seen = set()
        while block is not None:
            for symbol in block:
                if not (symbol.is_variable or symbol.is_argument) or symbol.name in seen:
                    continue
                # Compiler-generated variables (a range-for's __for_range, __for_begin, ...)
                # aren't the learner's, and hold garbage until the compiler sets them up.
                if symbol.name.startswith('__'):
                    continue
                if not symbol.is_argument and (symbol.line > line or (symbol.line == line and not line_finished)):
                    continue
                seen.add(symbol.name)
                try:
                    out[symbol.name] = self.value(symbol.value(frame))
                except Exception:
                    out[symbol.name] = '<unavailable>'
            if block.function is not None:
                break
            block = block.superblock
        return out

    def stack(self, frames):
        return [{'name': self.function_name(f), 'line': f.find_sal().line, 'locals': self.frame_locals(f, depth)}
                for depth, f in enumerate(frames)]

    @staticmethod
    def function_name(frame):
        name = frame.name() or '??'
        return name.split('(')[0]

    # ── heap diff ───────────────────────────────────────────────────────────

    def heap_delta(self):
        current = {}
        queue = list(self.tracked.items())
        visited = set()
        while queue and len(current) < LIMITS['maxHeapObjects']:
            small, value = queue.pop(0)
            if small in visited:
                continue
            visited.add(small)
            before = set(self.tracked)
            props = self.properties(value)
            current[small] = (self.type_label(value), props)
            for new_id in set(self.tracked) - before:
                queue.append((new_id, self.tracked[new_id]))
        delta = []
        for small, (type_name, props) in current.items():
            old = self.previous.get(small)
            if old is None:
                delta.append({'op': 'create', 'objectId': small, 'objectType': type_name, 'properties': props})
                continue
            for name, item in props.items():
                if name not in old[1]:
                    delta.append({'op': 'mutate', 'objectId': small, 'objectType': type_name, 'property': name, 'newValue': item})
                elif old[1][name] != item:
                    delta.append({'op': 'mutate', 'objectId': small, 'objectType': type_name, 'property': name, 'oldValue': old[1][name], 'newValue': item})
            for name in old[1]:
                if name not in props:
                    delta.append({'op': 'delete', 'objectId': small, 'objectType': type_name, 'property': name})
        for small in self.previous:
            if small not in current:
                delta.append({'op': 'free', 'objectId': small})
        self.previous = current
        return delta

    # ── events ──────────────────────────────────────────────────────────────

    def changes(self, key, current_locals):
        before = self.frame_values.get(key)
        self.frame_values[key] = current_locals
        if before is None:
            return []
        out = []
        for name, item in current_locals.items():
            if name not in before:
                out.append({'name': name, 'newValue': item, 'isNew': True})
            elif before[name] != item:
                out.append({'name': name, 'oldValue': before[name], 'newValue': item, 'isNew': False})
        return out

    def emit(self, event_type, frames, **payload):
        self.tracked = {}
        stack = self.stack(frames)
        line = stack[-1]['line'] if stack else None
        key = (len(stack), stack[-1]['name']) if stack else None
        event = {
            'stepId': len(self.events),
            'type': event_type,
            'language': LANG,
            'line': line,
            'sourceLocation': {'line': line} if line else None,
            'stackSnapshot': stack,
            'heapDelta': self.heap_delta(),
            'changes': self.changes(key, stack[-1]['locals']) if stack else [],
            **payload,
        }
        if event_type == 'statement_enter' and line in self.statements:
            event['statement'] = self.statements[line]
        printed = self.new_output()
        if printed:
            event['printed'] = printed
        self.last_stack = stack
        self.record(event)

    def new_output(self):
        """What the program printed since the last step. Its stdout is unbuffered (the
        desktop app compiles it with codelens_unbuffered.h), so text reaches the file as it
        is printed."""
        try:
            with open(PROGRAM_OUTPUT, 'rb') as handle:
                handle.seek(self.output_offset)
                data = handle.read(20000)
        except OSError:
            return ''
        self.output_offset += len(data)
        return data.decode('utf-8', errors='replace').replace('\r\n', '\n')

    def emit_return(self, depth, name):
        """A function_return for a frame that has already gone. GDB only shows a return once
        execution is back in the caller, so the event is built from the stack as it was last
        seen, ending with the returning frame, like the Python tracer's returns."""
        stack = [dict(frame) for frame in (self.last_stack or [])[: depth + 1]]
        line = stack[-1]['line'] if stack else None
        event = {
            'stepId': len(self.events), 'type': 'function_return', 'language': LANG,
            'functionName': name, 'line': line, 'sourceLocation': {'line': line} if line else None,
            'stackSnapshot': stack, 'heapDelta': [], 'changes': [],
        }
        if depth in self.return_values:
            event['returnValue'] = self.return_values.pop(depth)
        self.record(event)

    def record(self, event):
        self.events.append(event)
        self.out.write(json.dumps({'event': event}, ensure_ascii=False, default=str) + '\n')
        self.out.flush()

    def check_limits(self):
        if (time.monotonic() - self.started) * 1000 > LIMITS['maxRuntimeMs']:
            raise LimitReached('timeout', f"Runtime limit ({LIMITS['maxRuntimeMs']:,} ms) reached")
        if self.steps > LIMITS['maxSteps']:
            raise LimitReached('steps', f"Step limit ({LIMITS['maxSteps']:,} lines) reached")

    def on_stop(self, frames):
        """Called at each stop inside the learner's file: emit call/return events for frames
        that appeared or disappeared since the last stop, then the line about to run."""
        names = [self.function_name(f) for f in frames]
        common = 0
        while common < min(len(names), len(self.stack_names)) and names[common] == self.stack_names[common]:
            common += 1
        # Frames are matched by position, so a recursive call (same name as its caller)
        # still counts as a new frame.
        for depth in range(common, max(len(self.stack_names), len(names))):
            self.completed_lines.pop(depth, None)   # a new frame at this depth starts fresh
            self.last_line.pop(depth, None)
        for depth in reversed(range(common, len(self.stack_names))):
            gone = self.stack_names[depth]
            self.frame_values.pop((depth + 1, gone), None)
            self.emit_return(depth, gone)
        for depth in range(common, len(names)):
            frame = frames[depth]
            if depth == 0:
                continue   # main is the program itself, not a call worth announcing
            args = []
            arg_names = []
            try:
                for symbol in frame.block():
                    if symbol.is_argument:
                        arg_names.append(symbol.name)
                        args.append(self.value(symbol.value(frame)))
            except RuntimeError:
                pass
            self.emit('function_call', frames[: depth + 1], functionName=names[depth], args=args, argNames=arg_names)
            self.return_values.pop(depth, None)
            try:
                ReturnWatch(frame, self, depth)
            except Exception:
                pass   # no caller frame to return to (or GDB can't watch this one)
        if len(names) > LIMITS['maxRecursionDepth']:
            raise LimitReached('recursion', f"Recursion limit ({LIMITS['maxRecursionDepth']} nested calls) reached")
        self.stack_names = names
        self.emit('statement_enter', frames)
        if frames:
            depth = len(frames) - 1
            line = frames[-1].find_sal().line
            previous = self.last_line.get(depth)
            if previous is not None and previous != line:
                self.completed_lines.setdefault(depth, set()).add(previous)
            self.last_line[depth] = line


def step_line(frame):
    """Run to the next line, like GDB's `step`, but also stop when a loop jumps back into
    the line being left.

    `step` only stops once the line number changes, so a loop whose body is a single line
    (`while (true) { n++; }`, or `for (...) total += x;`) would run every iteration, or
    forever, inside one `step`. Temporary breakpoints on each address where this line's
    code starts make re-entering the line a stop too, so each iteration is a step and the
    step limit can end a loop that never would."""
    breakpoints = []
    try:
        sal = frame.find_sal()
        entries = sal.symtab.linetable().line(sal.line) or ()
        # Including the address we're stopped at: a loop body that is one line jumps
        # straight back to it. GDB steps past a breakpoint where it is stopped, so the
        # breakpoint only fires when the jump comes back.
        for address in sorted({entry.pc for entry in entries}):
            breakpoints.append(gdb.Breakpoint(f'*{address:#x}', internal=True, temporary=True))
    except Exception:
        pass   # without line information, fall back to a plain step
    try:
        run_quietly('step')
    finally:
        for breakpoint in breakpoints:
            if breakpoint.is_valid():
                breakpoint.delete()


def program_running():
    inferior = gdb.selected_inferior()
    return inferior is not None and inferior.pid != 0 and inferior.is_valid()


def main():
    tracer = Tracer()
    result = {'events': tracer.events, 'output': [], 'error': None, 'status': 'completed'}
    for setting in ('pagination off', 'confirm off', 'print thread-events off',
                    'print inferior-events off', 'step-mode off', 'width 0'):
        run_quietly(f'set {setting}')
    # Step over the standard library instead of into its headers.
    for skip in ('skip -rfu ^std::', 'skip -rfu ^__gnu_cxx::', 'skip -gfi */include/*', 'skip -gfi */include/c++/*'):
        try:
            run_quietly(skip)
        except gdb.error:
            pass

    load_libstdcxx_printers()

    signal = {}

    def on_signal(event):
        if isinstance(event, gdb.SignalEvent):
            signal['name'] = event.stop_signal
    gdb.events.stop.connect(on_signal)

    try:
        # The program's own output goes to a file, so GDB's messages can't mix into it. Its
        # standard input is the Input box (program_input.txt, written by codelens.cjs).
        run_quietly(f'start > {PROGRAM_OUTPUT} < {PROGRAM_INPUT}')
        while program_running():
            frame = gdb.newest_frame()
            if signal.get('name'):
                frames = tracer.user_frames()
                line = frames[-1].find_sal().line if frames else None
                names = {'SIGSEGV': 'Segmentation fault: the program read or wrote memory it does not own (a null or dangling pointer, or an index out of range)',
                         'SIGFPE': 'Arithmetic error: usually an integer division by zero',
                         'SIGABRT': 'The program aborted (a failed assertion, or an uncaught C++ exception)'}
                message = names.get(signal['name'], signal['name'])
                result['status'] = 'runtime-error'
                result['error'] = {'type': signal['name'], 'message': message}
                tracer.record({
                    'stepId': len(tracer.events), 'type': 'error_thrown', 'language': LANG,
                    'errorType': signal['name'], 'message': message, 'line': line,
                    'sourceLocation': {'line': line} if line else None,
                    'stackSnapshot': tracer.stack(frames), 'heapDelta': [],
                })
                break
            if tracer.in_source(frame):
                tracer.steps += 1
                tracer.check_limits()
                tracer.on_stop(tracer.user_frames())
                step_line(frame)
            else:
                # Outside the learner's file (library code the skips didn't cover): run until
                # it returns to the caller.
                try:
                    run_quietly('finish')
                except gdb.error:
                    run_quietly('step')
        else:
            if tracer.events:
                last = tracer.events[-1]
                end = {**last, 'stepId': len(tracer.events), 'type': 'program_end', 'heapDelta': [], 'changes': []}
                end.pop('printed', None)
                printed = tracer.new_output()
                if printed:
                    end['printed'] = printed
                tracer.record(end)
    except LimitReached as limit:
        result['status'] = 'limit'
        result['limit'] = {'kind': limit.kind, 'message': limit.message}
    except gdb.error as error:
        if program_running():
            result['status'] = 'runtime-error'
            result['error'] = {'type': 'DebuggerError', 'message': str(error)}
    finally:
        if program_running():
            try:
                run_quietly('kill')
            except gdb.error:
                pass
    # The program's output (PROGRAM_OUTPUT) is read by the desktop app, which also has to
    # read it when it had to kill GDB.
    summary = {key: value for key, value in result.items() if key not in ('events', 'output')}
    tracer.out.write(json.dumps({'result': summary}, ensure_ascii=False, default=str) + '\n')
    tracer.out.close()


main()
