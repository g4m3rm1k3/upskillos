// runtimes/_shared.cjs
// Download/extract helpers shared by every language runtime installer
// (python.cjs, cpp.cjs, lisp.cjs, java.cjs, dotnet.cjs). All five need the
// same two primitives — stream a file down with progress, then unpack it —
// so this stops being fine to copy-paste a fifth time.
const { promises: fs, createWriteStream } = require('node:fs')
const { execFile } = require('node:child_process')
const { promisify } = require('node:util')

const execFileAsync = promisify(execFile)

async function pathExists(p) {
  try { await fs.access(p); return true } catch { return false }
}

async function downloadFile(url, destPath, onPercent) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`)

  const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
  const fileStream = createWriteStream(destPath)
  const reader = response.body.getReader()
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    fileStream.write(Buffer.from(value))
    received += value.length
    if (contentLength > 0) onPercent?.(Math.round((received / contentLength) * 100))
  }

  await new Promise((resolve, reject) => {
    fileStream.end((err) => (err ? reject(err) : resolve()))
  })
}

// Windows' built-in tar.exe (bundled since Windows 10 1803, a bsdtar/
// libarchive port at System32\tar.exe) handles deeply nested archive
// entries correctly — PowerShell's Expand-Archive does not: confirmed
// live that it silently fails partway through a MinGW toolchain zip
// (thousands of deeply-nested header/lib paths) by hitting Windows'
// 260-char MAX_PATH limit, leaving a partial, broken extraction with no
// clear error. tar.exe uses the Win32 long-path APIs correctly.
//
// Invoked by its FULL path, not the bare command name 'tar' — confirmed
// live that Git for Windows' own bundled tar.exe (a different,
// MSYS-flavored build at Git\usr\bin\tar.exe) sits ahead of System32's on
// PATH on any machine with Git for Windows installed, which is extremely
// common. That MSYS tar fails on this exact same, verified-valid zip file
// two different ways depending on flags ("Cannot connect to C: resolve
// failed" — misreading the drive letter as `host:path` remote-tape syntax
// — or, with a workaround flag applied, "This does not look like a tar
// archive"). Going straight to the real System32 binary sidesteps PATH
// ambiguity entirely rather than fighting a shadowing tar's quirks.
const SYSTEM_TAR = `${process.env.SystemRoot || 'C:\\Windows'}\\System32\\tar.exe`

async function extractZip(zipPath, destDir) {
  await fs.mkdir(destDir, { recursive: true })
  await execFileAsync(SYSTEM_TAR, ['-xf', zipPath, '-C', destDir], { windowsHide: true })
}

// An MSI's "administrative install" (`msiexec /a`) just lays out the MSI's
// files into a target directory — no registry writes, no Program Files
// requirement, no elevation prompt — confirmed live. This is the only
// option for a toolchain (SBCL) that only ships a Windows MSI, not a zip.
// Full path for the same PATH-shadowing reason as SYSTEM_TAR above (no
// shadowing msiexec found on the machine this was built on, but there's
// no reason to rely on PATH resolution working out a second time).
const SYSTEM_MSIEXEC = `${process.env.SystemRoot || 'C:\\Windows'}\\System32\\msiexec.exe`

async function extractMsi(msiPath, destDir) {
  await fs.mkdir(destDir, { recursive: true })
  await execFileAsync(SYSTEM_MSIEXEC, [
    '/a', msiPath, '/qn', `TARGETDIR=${destDir}`,
  ], { windowsHide: true, timeout: 120000 })
}

// Find a file by name anywhere under a directory tree — used instead of
// hardcoding a relative path because several of these distributions
// extract into an internal version-named subfolder (e.g. Temurin's
// `jdk-21.0.12.1+1/`) or an MSI-administrative-install artifact folder
// (e.g. SBCL's `PFiles/Steel Bank Common Lisp/`) whose exact name isn't
// worth hardcoding and re-breaking on every version bump.
async function findFile(rootDir, filename) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const full = require('node:path').join(rootDir, entry.name)
    if (entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase()) return full
    if (entry.isDirectory()) {
      const found = await findFile(full, filename)
      if (found) return found
    }
  }
  return null
}

// execFile's rejection only puts the failed command line in `.message`,
// discarding the process's own stdout/stderr — which is where the actual
// reason (e.g. msiexec's real error text) lives. Every install() catch
// block wants this fuller detail, not just "Command failed: ...".
function errorDetail(e) {
  return [e?.message, e?.stdout, e?.stderr].filter(Boolean).join(' | ')
}

module.exports = { pathExists, downloadFile, extractZip, extractMsi, findFile, errorDetail }
