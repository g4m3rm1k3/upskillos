#!/usr/bin/env node
// Checks that the contributor docs only point at things that exist:
//   - links to local files (and to headings in Markdown files)
//   - repository paths written in backticks, such as `src/courses/courseLoader.js`
//   - `npm run <script>` commands (must be in package.json) and `node <file>` commands
//
// Usage: node scripts/check-docs.mjs [file.md ...]   (default: the contributor docs below)
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rel = p => relative(root, p).split('\\').join('/')
const DEFAULT_DOCS = ['README.md', 'AGENTS.md', 'CONTRIBUTING.md', 'docs/contributor-experience-and-lms-roadmap.md', ...readdirSync(join(root, 'docs/contributing')).filter(f => f.endsWith('.md')).map(f => `docs/contributing/${f}`)]
const files = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_DOCS

const scripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts ?? {}
// Folders and files a backticked path must start with to be treated as a repository path.
const REPO_PATH = /^(src|scripts|docs|public|desktop|backend|packages|\.github)\/|^(AGENTS|CONTRIBUTING|ARCHITECTURE|README|SECURITY|CODE_OF_CONDUCT)\.md$|^(package\.json|index\.html|vite\.config\.js|tsconfig\.json)$/
// Placeholders such as <course> or <N>, globs and elisions are descriptions, not paths.
const PLACEHOLDER = /[<>*…]|\.\.\.|\{/
// Paths the docs name on purpose to say they no longer exist.
const REMOVED = new Set(['src/content/', 'src/content'])

// GitHub's heading anchors: lowercase, punctuation removed, spaces to hyphens.
const slug = heading => heading.trim().toLowerCase().replace(/[`*_]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-')
const anchorsOf = text => new Set([...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map(m => slug(m[1])))

const problems = []
for (const file of files) {
  const abs = join(root, file)
  if (!existsSync(abs)) { problems.push(`${file}: file not found`); continue }
  const text = readFileSync(abs, 'utf8')
  const lineOf = index => text.slice(0, index).split('\n').length
  const report = (index, msg) => problems.push(`${file}:${lineOf(index)}: ${msg}`)

  // Links: [text](target)
  for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = m[1]
    if (/^(https?:|mailto:)/.test(target)) continue
    const [pathPart, anchor] = target.split('#')
    const targetFile = pathPart ? resolve(dirname(abs), decodeURIComponent(pathPart)) : abs
    if (!existsSync(targetFile)) { report(m.index, `link to missing file: ${target}`); continue }
    if (anchor && targetFile.endsWith('.md') && !anchorsOf(readFileSync(targetFile, 'utf8')).has(anchor)) report(m.index, `link to missing heading: ${target}`)
  }

  // Inline code: repository paths and commands
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const code = m[1].trim()
    const pathCandidate = code.replace(/\/$/, '')
    if (REPO_PATH.test(code) && !PLACEHOLDER.test(code) && !REMOVED.has(code) && !/\s/.test(code) && !existsSync(join(root, pathCandidate))) report(m.index, `path does not exist: ${code}`)
  }

  // Commands anywhere (inline code or code blocks)
  for (const m of text.matchAll(/\bnpm run ([\w:.-]+)/g)) {
    if (!(m[1] in scripts)) report(m.index, `npm script not in package.json: npm run ${m[1]}`)
  }
  for (const m of text.matchAll(/\bnode ((?:scripts|src)\/[\w./-]+\.(?:m?js|cjs))/g)) {
    if (!existsSync(join(root, m[1]))) report(m.index, `script does not exist: node ${m[1]}`)
  }
}

if (problems.length) {
  console.error(`✗ ${problems.length} problem(s) in the contributor docs:`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log(`✓ Contributor docs checked: ${files.length} file(s), links, paths and commands all exist.`)
