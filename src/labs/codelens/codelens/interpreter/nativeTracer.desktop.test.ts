// The desktop CodeLens tracer for C and C++ (desktop/app/runtimes/codelens.cjs, which runs
// codelens/gdb_tracer.py inside GDB). These run the real thing on this machine's GDB and
// compilers when they're installed, and skip otherwise (as on CI).
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ExecutionResult } from '../types'
import { annotateOutcomes } from '../traceOutcomes'
import { explainTraceEvent } from '../explainTrace'

const require = createRequire(import.meta.url)
const hasGdb = spawnSync('gdb', ['-batch', '-nx', '-ex', 'python print(1)']).status === 0
const hasGcc = spawnSync('g++', ['--version']).status === 0
const runtime = hasGdb && hasGcc ? require('../../../../../desktop/app/runtimes/codelens.cjs') : null
const app = { getPath: () => path.join(os.tmpdir(), 'opencalc-codelens-test') }

function trace(lang: 'c' | 'cpp', source: string, stdin = ''): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    let stdout = ''
    runtime.runCode(app, JSON.stringify({ lang, source, stdin }), (event: any) => {
      if (event.stream === 'stdout') stdout += event.text
      if (event.stream === 'exit') resolve(JSON.parse(stdout))
    }).then((res: any) => { if (!res.ok) reject(new Error(res.reason)) })
  })
}

const creates = (result: ExecutionResult) => result.events.flatMap(e => e.heapDelta ?? []).filter(d => d.op === 'create')

describe.skipIf(!runtime)('CodeLens C/C++ tracer (GDB)', () => {
  it('reads standard input from the Input box', async () => {
    const result = await trace('cpp', `#include <iostream>
#include <string>
int main() {
    std::string name;
    int age;
    std::getline(std::cin, name);
    std::cin >> age;
    std::cout << name << " is " << age << std::endl;
}
`, 'Ada Lovelace\n36\n')
    expect(result.status).toBe('completed')
    expect(result.output).toEqual(['Ada Lovelace is 36'])
  }, 60_000)

  it('reads with scanf in C', async () => {
    const result = await trace('c', `#include <stdio.h>
int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\\n", a + b);
    return 0;
}
`, '20 22\n')
    expect(result.output).toEqual(['42'])
  }, 60_000)

  it('draws a linked list built with pointers, and the recursion over it', async () => {
    const result = await trace('cpp', `#include <iostream>
struct Node { int value; Node* next; };
int sum(Node* node) {
    if (node == nullptr) {
        return 0;
    }
    return node->value + sum(node->next);
}
int main() {
    Node* head = new Node{1, new Node{2, nullptr}};
    int total = sum(head);
    std::cout << total << std::endl;
}
`)
    expect(result.status).toBe('completed')
    expect(result.output).toEqual(['3'])
    expect(creates(result).map(d => d.objectType)).toEqual(['Node', 'Node'])
    const calls = result.events.filter(e => e.type === 'function_call')
    expect(calls.map(e => e.args?.[0] === null ? 'null' : 'node')).toEqual(['node', 'node', 'null'])
    expect(Math.max(...result.events.map(e => e.stackSnapshot!.length))).toBe(4)   // main + three sum calls
  }, 60_000)

  it('shows standard containers as their elements, even with range-for loops', async () => {
    // A range-for creates hidden variables that hold garbage before the loop starts;
    // reading one once hung the tracer (a garbage vector size of billions).
    const result = await trace('cpp', `#include <vector>
#include <string>
int main() {
    std::vector<int> values = {3, 1, 4};
    std::string name = "Ada";
    int total = 0;
    for (int value : values) {
        total += value;
    }
    return total == 8 ? 0 : 1;
}
`)
    expect(result.status).toBe('completed')
    const vector = creates(result).find(d => d.objectType === 'std::vector<int>') as any
    expect(vector.properties).toEqual({ 0: 3, 1: 1, 2: 4 })
    const locals = result.events.at(-1)!.stackSnapshot!.at(-1)!.locals as Record<string, unknown>
    expect(locals.name).toBe('Ada')
    expect(locals.total).toBe(8)
    expect(Object.keys(locals).some(name => name.startsWith('__'))).toBe(false)
  }, 60_000)

  it('explains what each C++ line does', async () => {
    const result = annotateOutcomes((await trace('cpp', `#include <iostream>
int square(int x) {
    return x * x;
}
int main() {
    int total = 0;
    for (int i = 1; i <= 2; i++) {
        total += square(i);
    }
    if (total > 100) {
        total = 0;
    }
    std::cout << total << std::endl;
    return 0;
}
`)).events)
    const summaries = result.filter(e => e.type === 'statement_enter').map(e => `${e.line}: ${explainTraceEvent(e).summary}`)
    expect(summaries).toEqual([
      '6: Assigns `total` = 0',
      '7: Starts the loop: `int i = 1`',
      '7: `i <= 2` is true, so the loop body runs',
      '8: Updates `total`: 0 → 1',
      '3: Returns 1',
      '4: Reaches the end of `square`, which returns',   // GDB stops on the closing brace too
      '7: `i <= 2` is true, so the loop body runs',
      '8: Updates `total`: 1 → 5',
      '3: Returns 4',
      '4: Reaches the end of `square`, which returns',
      '7: `i <= 2` is false, so the loop ends',
      '10: `total > 100` is false, so the block is skipped',
      '13: Prints "5"',
      '14: Returns `0`',
      '15: Reaches the end of `main`, so the program finishes',
    ])
  }, 60_000)

  it('stops a loop that never ends at the step limit, even on one line', async () => {
    const result = await trace('cpp', 'int main() {\n    int n = 0;\n    while (true) { n++; }\n}\n')
    expect(result.status).toBe('limit')
    expect(result.limit?.kind).toBe('steps')
  }, 60_000)

  it('reports compile errors and crashes', async () => {
    const compile = await trace('c', 'int main(void) { return missing; }\n')
    expect(compile.status).toBe('syntax-error')
    expect(compile.error?.message).toContain("'missing' undeclared")
    const crash = await trace('cpp', 'struct Node { int value; };\nint main() {\n    Node* node = nullptr;\n    return node->value;\n}\n')
    expect(crash.status).toBe('runtime-error')
    expect(crash.error?.type).toBe('SIGSEGV')
    expect(crash.events.at(-1)?.line).toBe(4)
  }, 60_000)
})
