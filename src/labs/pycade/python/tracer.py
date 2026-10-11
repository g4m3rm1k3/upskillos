"""Capture real Python statements after execution; no simulated learner values.

CLI: python tracer.py q_learning.py trace.json
The same trace_program function is sent to the existing desktop Python kernel.
"""
import json
import sys
import time
import traceback


def trace_program(source):
    import numpy as np
    import torch
    import gymnasium

    def pack(value, depth=0):
        if value is None or isinstance(value, (bool, int, str)):
            return {"type": type(value).__name__, "value": value}
        if isinstance(value, (float, np.floating)):
            return {"type": "float", "value": float(value) if np.isfinite(value) else str(value)}
        if isinstance(value, np.integer):
            return {"type": str(value.dtype), "value": int(value)}
        if isinstance(value, (np.ndarray, torch.Tensor)):
            tensor = isinstance(value, torch.Tensor)
            array = value.detach().cpu().numpy() if tensor else value
            return {"type": "Tensor" if tensor else "ndarray", "shape": list(array.shape), "dtype": str(array.dtype), "requires_grad": bool(value.requires_grad) if tensor else False, "value": array.tolist()}
        if depth > 5:
            return {"type": type(value).__name__, "value": "Nested object"}
        if isinstance(value, (tuple, list)):
            return {"type": type(value).__name__, "items": [pack(v, depth + 1) for v in value[:64]], "length": len(value)}
        if isinstance(value, dict):
            return {"type": "dict", "items": {str(k): pack(v, depth + 1) for k, v in list(value.items())[:64]}}
        if isinstance(value, torch.nn.Module):
            return {"type": type(value).__name__, "items": {name: {"type": "parameter", "items": {"weights": pack(p, depth + 1), "gradient": pack(p.grad, depth + 1)}} for name, p in value.named_parameters()}}
        if isinstance(value, torch.distributions.Categorical):
            return {"type": "Categorical", "items": {"probs": pack(value.probs, depth + 1), "logits": pack(value.logits, depth + 1)}}
        return {"type": type(value).__name__, "value": str(value)[:180]}

    events, previous = [], {}
    pending = None
    started = time.monotonic()
    namespace = {"__name__": "__pycade__"}

    def capture(frame, line):
        changes = {}
        for name, value in frame.f_locals.items():
            if name.startswith("_") or name in ("gym", "np", "torch", "nn", "Categorical"):
                continue
            packed = pack(value)
            encoded = json.dumps(packed, allow_nan=False)
            if previous.get(name) != encoded:
                changes[name] = packed
                previous[name] = encoded
        events.append({"line": line, "changes": changes})

    def trace(frame, event, arg):
        nonlocal pending
        if frame.f_code.co_filename != "pycade_program.py" or frame.f_code.co_name != "<module>":
            return None
        if event == "exception":
            pending = None  # Do not report a failed statement as successfully executed.
        if event in ("line", "return"):
            if pending is not None:
                capture(frame, pending)
            pending = frame.f_lineno if event == "line" else None
            if len(events) >= 2500 or time.monotonic() - started > 30:
                raise RuntimeError("Trace limit reached. Keep experiments below 2500 statements and 30 seconds.")
        return trace

    error = None
    old_trace = sys.gettrace()
    try:
        sys.settrace(trace)
        exec(compile(source, "pycade_program.py", "exec"), namespace)
    except Exception:
        error = traceback.format_exc()
    finally:
        sys.settrace(old_trace)
        for env in namespace.get("envs", [namespace.get("env")]):
            if env is not None:
                env.close()
    return {"source": source, "events": events, "error": error, "versions": {"python": sys.version.split()[0], "numpy": np.__version__, "gymnasium": gymnasium.__version__, "torch": torch.__version__}}


if __name__ == "__main__":
    from pathlib import Path
    result = trace_program(Path(sys.argv[1]).read_text())
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), allow_nan=False))
    print(f"{len(result['events'])} executed statements; error={result['error']}")
    if result['error']:
        sys.exit(1)
