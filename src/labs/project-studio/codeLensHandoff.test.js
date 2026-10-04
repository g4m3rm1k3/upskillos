import { describe, expect, it } from 'vitest';
import { canTrace, handOffToCodeLens, inlineLocalHeaders, traceLang } from './codeLensHandoff.js';

const files = {
  'area.h': '#pragma once\n\ndouble circle_area(double radius);\n',
  'shapes/inner.h': '#pragma once\n#include "../area.h"\nint inner();\n',
};
const read = async (p) => files[p] ?? null;

describe('Trace in CodeLens', () => {
  it('is offered for C++ source files in C++ lessons only', () => {
    expect(canTrace({ runtime: 'cpp' }, 'main.cpp')).toBe(true);
    expect(canTrace({ runtime: 'cpp' }, 'src/game.cc')).toBe(true);
    expect(canTrace({ runtime: 'cpp' }, 'area.h')).toBe(false);
    expect(canTrace({ runtime: 'python' }, 'main.cpp')).toBe(false);
    expect(canTrace({ runtime: 'python' }, 'trace_bounce.py')).toBe(true);
    expect(canTrace({ runtime: 'python' }, 'levels/classic.txt')).toBe(false);
    expect(canTrace({ runtime: 'none' }, 'hello.py')).toBe(false);
    expect(canTrace({ runtime: 'cpp' }, null)).toBe(false);
  });

  it('pastes in local headers once, and leaves library headers alone', async () => {
    const code = '#include <iostream>\n#include "area.h"\n#include "area.h"\nint main() {}\n';
    const out = await inlineLocalHeaders(code, 'shapes.cpp', read);
    expect(out).toContain('#include <iostream>');
    expect(out).toContain('double circle_area(double radius);');
    expect(out).not.toContain('#include "area.h"');
    expect(out).not.toContain('#pragma once');
    expect(out.match(/double circle_area/g)).toHaveLength(1);
  });

  it('resolves nested includes relative to the including file, and keeps unknown ones', async () => {
    const out = await inlineLocalHeaders('#include "shapes/inner.h"\n#include "missing.h"\n', 'main.cpp', read);
    expect(out).toContain('int inner();');
    expect(out).toContain('double circle_area(double radius);');
    expect(out).toContain('#include "missing.h"');
  });

  it('hands the code to CodeLens with a way back', () => {
    const store = {};
    const fake = { setItem: (k, v) => { store[k] = v; } };
    handOffToCodeLens('int main() {}', { storage: fake, session: fake });
    expect(JSON.parse(store['codelens-handoff'])).toMatchObject({ code: 'int main() {}', lang: 'cpp' });
    expect(store.codelens_return_path).toBe('#/lab/project-studio');
  });

  it('hands a Python file over as Python', () => {
    const store = {};
    const fake = { setItem: (k, v) => { store[k] = v; } };
    expect(traceLang('trace_bounce.py')).toBe('py');
    expect(traceLang('main.cpp')).toBe('cpp');
    handOffToCodeLens('print(1)', { lang: traceLang('trace_bounce.py'), storage: fake, session: fake });
    expect(JSON.parse(store['codelens-handoff'])).toMatchObject({ code: 'print(1)', lang: 'py' });
  });
});
