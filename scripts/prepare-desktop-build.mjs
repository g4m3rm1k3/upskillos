// Assembles desktop/staging/ — the directory electron-builder uses as its
// project root. It contains only the Electron entry files and a package.json
// with the full electron-builder configuration. The compiled frontend (dist/)
// and the backend are referenced via extraResources so they land outside the
// app.asar and can be accessed at process.resourcesPath at runtime.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root    = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const staging = path.join(root, 'desktop/staging')
const appDir  = path.join(root, 'desktop/app')

await fs.rm(staging, { recursive: true, force: true })
await fs.mkdir(staging, { recursive: true })

// Every Electron process file in desktop/app (main.cjs, preload.cjs and what they require).
// All of them, not a list: a file added to desktop/app and missing here made the packaged app
// fail on its first require (drafts.cjs and private-lessons.cjs once did) with no window at all.
const processFiles = (await fs.readdir(appDir)).filter((f) => f.endsWith('.cjs'))
for (const f of processFiles) await fs.copyFile(path.join(appDir, f), path.join(staging, f))

// node-pty, the terminal's native module. Only what runs is copied: its JavaScript, its
// package.json, and the prebuilt binaries without their debug symbols (.pdb). The full npm
// package is about 64 MB, mostly sources and symbols; this is a few MB per platform.
// node-addon-api, its one dependency, is only needed to compile it, so it is left out.
const ptySrc = path.join(root, 'node_modules', 'node-pty')
const ptyDst = path.join(staging, 'node_modules', 'node-pty')
await fs.mkdir(ptyDst, { recursive: true })
await fs.copyFile(path.join(ptySrc, 'package.json'), path.join(ptyDst, 'package.json'))
await fs.copyFile(path.join(ptySrc, 'LICENSE'), path.join(ptyDst, 'LICENSE'))
await fs.cp(path.join(ptySrc, 'lib'), path.join(ptyDst, 'lib'), { recursive: true })
await fs.cp(path.join(ptySrc, 'prebuilds'), path.join(ptyDst, 'prebuilds'), {
  recursive: true,
  filter: (src) => !src.endsWith('.pdb'),
})

// Copy the desktop-only language runtime installers (e.g. runtimes/python.cjs,
// required by main.cjs) — these are small source files, not the actual
// downloaded Python/PySide6 payload, which lands in userData at runtime.
await fs.cp(path.join(appDir, 'runtimes'), path.join(staging, 'runtimes'), { recursive: true })

// Read version from desktop/app/package.json (already synced by sync-desktop-package)
const appPkg = JSON.parse(await fs.readFile(path.join(appDir, 'package.json'), 'utf8'))

// The Electron to package: the exact version npm installed from the lockfile. electron-builder
// otherwise reads it from an `electron` package in the project, and staging has none (only
// node-pty), so a fresh checkout failed with "Cannot compute electron version".
const electronVersion = JSON.parse(await fs.readFile(path.join(root, 'node_modules', 'electron', 'package.json'), 'utf8')).version

const stagingPkg = {
  name:        appPkg.name ?? 'upskillos',
  productName: appPkg.productName ?? 'UpSkillOS',
  version:     appPkg.version,
  description: appPkg.description ?? '',
  author:      appPkg.author ?? '',
  license:     appPkg.license ?? 'GPL-3.0-or-later',
  main:        'main.cjs',

  build: {
    appId:       'org.opencalc.desktop',
    productName: appPkg.productName ?? 'UpSkillOS',
    electronVersion,

    directories: {
      output: '../../desktop/dist',
    },

    // Only the Electron process files go into app.asar
    files: ['*.cjs', 'runtimes/**/*', 'node_modules/node-pty/**/*'],
    // A native module can't be loaded from inside app.asar, and node-pty also starts helper
    // programs (OpenConsole.exe, winpty-agent.exe) from its own folder.
    asarUnpack: ['node_modules/node-pty/**/*'],

    // Frontend build + backend live outside asar so Node can read them at runtime
    extraResources: [
      { from: '../../dist',    to: 'dist'    },
      { from: '../../backend', to: 'backend',
        filter: ['**/*.mjs', '**/*.json', '!node_modules/**'] },
    ],

    win: {
      target: [{ target: 'portable', arch: ['x64'] }],
      artifactName: '${productName}-${version}-win-x64.${ext}',
    },

    mac: {
      target: [
        { target: 'dmg', arch: ['x64', 'arm64'] },
      ],
      category: 'public.app-category.education',
      artifactName: '${productName}-${version}-mac-${arch}.${ext}',
    },

    linux: {
      target: [{ target: 'AppImage', arch: ['x64'] }],
      category: 'Education',
      artifactName: '${productName}-${version}-linux-x64.${ext}',
    },
  },
}

await fs.writeFile(
  path.join(staging, 'package.json'),
  JSON.stringify(stagingPkg, null, 2) + '\n',
  'utf8'
)

console.log(`desktop/staging/ ready  (v${appPkg.version}, Electron ${electronVersion})`)
console.log(`  ${processFiles.join('  ')}  runtimes/  node_modules/node-pty/  package.json`)
