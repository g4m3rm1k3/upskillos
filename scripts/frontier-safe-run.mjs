#!/usr/bin/env node
// Runs one command with limits, so an ML check can't freeze the machine it's written on.
// Every Frontier run that imports NumPy, PyTorch or another ML library goes through this
// (docs/frontier-ai-series-plan.md, "Testing safely on the authoring machine").
//
//   node scripts/frontier-safe-run.mjs [--timeout 120] [--mem 2048] [--threads 2] -- <command...>
//
// Limits on the whole process tree (the command and everything it starts):
//   - the GPU is hidden (CUDA_VISIBLE_DEVICES="");
//   - maths libraries use at most --threads threads;
//   - after --timeout seconds the tree is killed;
//   - if the tree's memory (working set) goes over --mem MB it is killed.
// Exit code: the command's own, or 124 for a timeout, 137 for the memory limit.
import { spawn, execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const dash = args.indexOf('--');
if (dash < 0 || dash === args.length - 1) {
  console.error('usage: node scripts/frontier-safe-run.mjs [--timeout s] [--mem MB] [--threads n] -- <command...>');
  process.exit(2);
}
const opts = { timeout: 120, mem: 2048, threads: 2 };
for (let i = 0; i < dash; i += 2) {
  const key = args[i].replace(/^--/, '');
  if (!(key in opts)) { console.error(`unknown option ${args[i]}`); process.exit(2); }
  opts[key] = Number(args[i + 1]);
}
const command = args.slice(dash + 1).join(' ');
const threads = String(opts.threads);

const child = spawn(command, {
  shell: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    CUDA_VISIBLE_DEVICES: '',
    OMP_NUM_THREADS: threads,
    MKL_NUM_THREADS: threads,
    OPENBLAS_NUM_THREADS: threads,
    NUMEXPR_NUM_THREADS: threads,
    // Read by the conftest.py of every Frontier chapter, which calls torch.set_num_threads.
    TORCH_NUM_THREADS: threads,
  },
});

let stopped = null;
function killTree(reason) {
  if (stopped) return;
  stopped = reason;
  console.error(`\n[frontier-safe-run] ${reason}: killing the process tree`);
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-child.pid, 'SIGKILL');
  } catch { /* already gone */ }
}

// Memory of the whole tree, in MB. Windows: one PowerShell query of every process's parent and
// working set; the tree is everything descended from the child.
function treeMemoryMB() {
  if (process.platform !== 'win32') return 0;
  const out = execFileSync('powershell', ['-NoProfile', '-Command',
    'Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId) $($_.ParentProcessId) $($_.WorkingSetSize)" }'],
  { encoding: 'utf8', windowsHide: true });
  const kids = new Map();
  const size = new Map();
  for (const line of out.trim().split(/\r?\n/)) {
    const [pid, ppid, ws] = line.trim().split(/\s+/).map(Number);
    size.set(pid, ws || 0);
    if (!kids.has(ppid)) kids.set(ppid, []);
    kids.get(ppid).push(pid);
  }
  let total = 0;
  const todo = [child.pid];
  const seen = new Set();
  while (todo.length) {
    const pid = todo.pop();
    if (seen.has(pid)) continue;
    seen.add(pid);
    total += size.get(pid) ?? 0;
    todo.push(...(kids.get(pid) ?? []));
  }
  return total / 1024 / 1024;
}

let peak = 0;
const watch = setInterval(() => {
  try {
    const mb = treeMemoryMB();
    peak = Math.max(peak, mb);
    if (mb > opts.mem) killTree(`memory ${Math.round(mb)} MB is over the ${opts.mem} MB limit`);
  } catch { /* the query can fail while processes exit */ }
}, 1500);
const timer = setTimeout(() => killTree(`still running after ${opts.timeout} s`), opts.timeout * 1000);

child.on('exit', (code) => {
  clearInterval(watch);
  clearTimeout(timer);
  console.error(`[frontier-safe-run] peak memory about ${Math.round(peak)} MB`);
  if (stopped?.startsWith('still')) process.exit(124);
  if (stopped) process.exit(137);
  process.exit(code ?? 1);
});
