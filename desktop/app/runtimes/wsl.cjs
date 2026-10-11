// runtimes/wsl.cjs
// WSL (Windows Subsystem for Linux): a real Linux, such as Ubuntu, running inside Windows. On
// Windows, Project Studio can open a terminal in a WSL distro instead of PowerShell, so lessons
// written for bash (the Terminal and Neovim series, the WSL and Containers series) work there.
// Plan: docs/wsl-series-plan.md.
//
// This module only finds out what is installed. It never installs WSL: that needs administrator
// rights and a restart, and differs between machines, so learners follow Microsoft's own
// instructions (INSTALL_URL).
const { execFile } = require('node:child_process')

const INSTALL_URL = 'https://learn.microsoft.com/windows/wsl/install'

// wsl.exe writes UTF-16 (every other byte zero for plain text), unless WSL_UTF8=1 is set, and
// some versions ignore that. Decide by looking at the bytes.
function decode(buf) {
  if (!buf || !buf.length) return ''
  const sample = buf.subarray(0, Math.min(buf.length, 64))
  const zeros = sample.filter((b) => b === 0).length
  const text = zeros > sample.length / 4 ? buf.toString('utf16le') : buf.toString('utf8')
  return text.replace(/^﻿/, '')
}

// `wsl -l -v` output:
//     NAME      STATE           VERSION
//   * Ubuntu    Stopped         2
//     Debian    Running         2
// → [{ name: 'Ubuntu', state: 'Stopped', version: 2, isDefault: true }, …]
// Columns are found by splitting on runs of spaces: a distro name can't contain a space.
function parseList(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.replace(/\0/g, '')).filter((l) => l.trim())
  const distros = []
  for (const line of lines.slice(1)) {
    const isDefault = line.trimStart().startsWith('*')
    const parts = line.replace(/^\s*\*?\s*/, '').trim().split(/\s+/)
    if (parts.length < 3 || !/^\d+$/.test(parts[2])) continue
    distros.push({ name: parts[0], state: parts[1], version: Number(parts[2]), isDefault })
  }
  return distros
}

function runWsl(args, timeout = 15000) {
  return new Promise((resolve) => {
    execFile('wsl.exe', args, { windowsHide: true, timeout, encoding: 'buffer', env: { ...process.env, WSL_UTF8: '1' } },
      (err, stdout, stderr) => resolve({ code: err ? (typeof err.code === 'number' ? err.code : -1) : 0, stdout: decode(stdout), stderr: decode(stderr) }))
  })
}

// { supported, installed, distros, defaultDistro, installUrl }. `installed` means at least one
// WSL 2 distro exists. Version 1 distros are listed but don't count: they lack the real Linux
// kernel the lessons (systemd, Docker) depend on.
async function getStatus() {
  if (process.platform !== 'win32') return { supported: false, installed: false, distros: [], defaultDistro: null, installUrl: INSTALL_URL }
  const { code, stdout } = await runWsl(['-l', '-v'])
  const distros = code === 0 ? parseList(stdout) : []
  const usable = distros.filter((d) => d.version === 2)
  return {
    supported: true,
    installed: usable.length > 0,
    distros,
    defaultDistro: (usable.find((d) => d.isDefault) ?? usable[0])?.name ?? null,
    installUrl: INSTALL_URL,
  }
}

module.exports = { getStatus, parseList, decode, INSTALL_URL }
