"""Bounded real-Python trace capture for programs, functions, and methods.

CLI: python tracer.py program.py trace.json
Only the supplied file is traced; installed library internals remain library calls.
"""
import ast
import contextlib
import inspect
import io
import json
import math
import sys
import time
import traceback
import types


def source_metadata(source):
    """Syntax facts, not guesses about what a learner's variables mean."""
    result = {}
    for node in ast.walk(ast.parse(source)):
        if not isinstance(node, ast.stmt):
            continue
        # Compound statements own their header, not all names in their bodies.
        expressions = [node]
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            expressions = []
        elif isinstance(node, (ast.For, ast.AsyncFor)):
            expressions = [node.iter, node.target]
        elif isinstance(node, (ast.If, ast.While)):
            expressions = [node.test]
        elif isinstance(node, (ast.With, ast.AsyncWith)):
            expressions = [item.context_expr for item in node.items]
        children = [child for expression in expressions for child in ast.walk(expression)]
        reads = sorted({child.id for child in children if isinstance(child, ast.Name) and isinstance(child.ctx, ast.Load)})
        writes = sorted({child.id for child in children if isinstance(child, ast.Name) and isinstance(child.ctx, ast.Store)})
        calls = list(dict.fromkeys(ast.unparse(child.func) for child in children if isinstance(child, ast.Call)))
        expression = getattr(node, 'value', None)
        result[str(node.lineno)] = {"kind": type(node).__name__, "reads": reads, "writes": writes, "calls": calls,
                                   "expression": ast.unparse(expression) if isinstance(expression, ast.expr) else None}
    return result


def trace_program(source):
    def safe_numbers(value):
        if isinstance(value, list):
            return [safe_numbers(item) for item in value]
        if isinstance(value, float) and not math.isfinite(value):
            return str(value)
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        return str(type(value).__name__)

    def pack(value, depth=0):
        # Optional adapters activate only when the program imports the library.
        np, torch = sys.modules.get('numpy'), sys.modules.get('torch')
        if value is None or isinstance(value, (bool, int, str)):
            return {"type": type(value).__name__, "value": value[:1000] if isinstance(value, str) else value}
        if isinstance(value, float):
            return {"type": "float", "value": safe_numbers(value)}
        if depth > 5:
            return {"type": type(value).__name__, "value": "Preview depth limit reached", "truncated": True}
        if np is not None and isinstance(value, np.generic):
            return {"type": str(value.dtype), "value": safe_numbers(value.item())}
        tensor = torch is not None and isinstance(value, torch.Tensor)
        if (np is not None and isinstance(value, np.ndarray)) or tensor:
            shape = list(value.shape)
            size = value.numel() if tensor else value.size
            preview = size > 256
            # Bound returned data; a noncontiguous reshape may still allocate inside the library.
            data = value.detach() if tensor else value
            if tensor and data.layout != torch.strided:
                return {"type": "Tensor", "shape": shape, "dtype": str(value.dtype), "value": "Sparse tensor: values not expanded", "truncated": True}
            if preview:
                data = data.reshape(-1)[:256]
            if tensor:
                data = data.cpu()
            return {"type": "Tensor" if tensor else "ndarray", "shape": shape, "dtype": str(value.dtype),
                    "requires_grad": bool(value.requires_grad) if tensor else False,
                    "value": safe_numbers(data.tolist()), "preview": "flat first 256 elements" if preview else None}
        if isinstance(value, (tuple, list)):
            return {"type": type(value).__name__, "items": [pack(v, depth + 1) for v in value[:32]], "length": len(value), "truncated": len(value) > 32}
        if isinstance(value, dict):
            return {"type": "dict", "items": {str(k): pack(v, depth + 1) for k, v in list(value.items())[:32]}, "length": len(value), "truncated": len(value) > 32}
        if torch is not None and isinstance(value, torch.nn.Module):
            parameters = list(value.named_parameters())
            return {"type": type(value).__name__, "adapter": "torch.nn.Module", "items": {name: {"type": "parameter", "items": {"weights": pack(p, depth + 1), "gradient": pack(p.grad, depth + 1)}} for name, p in parameters[:16]}, "truncated": len(parameters) > 16}
        if torch is not None and isinstance(value, torch.optim.Optimizer):
            return {"type": type(value).__name__, "adapter": "torch.optim.Optimizer", "items": {"settings": pack(value.defaults, depth + 1)}}
        if torch is not None and isinstance(value, torch.distributions.Categorical):
            return {"type": "Categorical", "items": {"probs": pack(value.probs, depth + 1), "logits": pack(value.logits, depth + 1)}}
        if inspect.isfunction(value) or inspect.ismethod(value):
            return {"type": "function", "value": value.__qualname__}
        if isinstance(value, type):
            return {"type": "class", "value": value.__qualname__}
        # Do not call arbitrary __repr__ or properties while inspecting user objects.
        if type(value).__module__ == '__pycade__':
            try:
                fields = object.__getattribute__(value, '__dict__')
                return {"type": type(value).__name__, "items": {str(k): pack(v, depth + 1) for k, v in list(fields.items())[:32]}}
            except AttributeError:
                pass
        return {"type": type(value).__name__, "value": "Opaque object · internal state not expanded"}

    events, previous, pending, scopes = [], {}, {}, {}
    started = time.monotonic()
    namespace = {"__name__": "__pycade__"}
    metadata, error = {}, None
    class Output(io.StringIO):
        def write(self, text):
            remaining = max(0, 8000 - self.tell())
            super().write(text[:remaining])
            return len(text)
    output = Output()

    def user_frame(frame):
        return frame.f_code.co_filename == "pycade_program.py" and frame.f_code.co_name not in ('<listcomp>', '<dictcomp>', '<setcomp>', '<genexpr>')

    def capture(frame, line, returned=False, result=None):
        changes, current = {}, {}
        visible = {**frame.f_globals, **frame.f_locals}
        if returned and frame.f_code.co_name != '<module>':
            visible['return value'] = result
        for name, value in visible.items():
            if name.startswith('__') or isinstance(value, types.ModuleType):
                continue
            try:
                packed = pack(value)
                encoded = json.dumps(packed, allow_nan=False)
            except Exception as exc:
                packed = {"type": type(value).__name__, "value": f"Preview unavailable ({type(exc).__name__})"}
                encoded = json.dumps(packed)
            current[name] = encoded
            if previous.get(name) != encoded:
                changes[name] = packed
        removed = [name for name in previous if name not in current]
        previous.clear()
        previous.update(current)
        stack, ancestor = [], frame
        while ancestor:
            if user_frame(ancestor):
                stack.insert(0, ancestor.f_code.co_name)
            ancestor = ancestor.f_back
        events.append({"line": line, "changes": changes, "removed": removed, "scope": scopes[id(frame)],
                       "function": frame.f_code.co_name, "stack": stack, "returned": returned and frame.f_code.co_name != '<module>'})

    def trace(frame, event, arg):
        if not user_frame(frame):
            return None
        key = id(frame)
        if event == 'call':
            scopes[key] = len(scopes) + 1
        if event == 'exception':
            pending.pop(key, None)
        if event in ('line', 'return'):
            if key in pending:
                capture(frame, pending.pop(key), returned=event == 'return', result=arg)
            if event == 'line':
                pending[key] = frame.f_lineno
            if len(events) >= 2500 or time.monotonic() - started > 30:
                raise RuntimeError('Trace limit reached. Keep experiments below 2500 statements and 30 seconds.')
        return trace

    old_trace = sys.gettrace()
    try:
        metadata = source_metadata(source)
        program = compile(source, 'pycade_program.py', 'exec')
        sys.settrace(trace)
        with contextlib.redirect_stdout(output):
            exec(program, namespace)
    except BaseException:
        error = traceback.format_exc()
    finally:
        sys.settrace(old_trace)
        # Close only actual Gymnasium environments, never an arbitrary variable named env.
        gym = sys.modules.get('gymnasium')
        if gym is not None:
            candidates = [v for value in namespace.values() for v in (value[:32] if isinstance(value, (list, tuple)) else [value])]
            for value in candidates:
                if isinstance(value, gym.Env):
                    try:
                        value.close()
                    except Exception:
                        pass
    versions = {"python": sys.version.split()[0]}
    for name in ('numpy', 'gymnasium', 'torch', 'sklearn', 'pandas'):
        module = sys.modules.get(name)
        if module is not None:
            versions[name] = getattr(module, '__version__', 'unknown')
    return {"source": source, "events": events, "error": error, "versions": versions, "metadata": metadata, "stdout": output.getvalue()}


if __name__ == '__main__':
    from pathlib import Path
    result = trace_program(Path(sys.argv[1]).read_text())
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(',', ':'), allow_nan=False))
    print(f"{len(result['events'])} executed statements; error={result['error']}")
    if result['error']:
        sys.exit(1)
