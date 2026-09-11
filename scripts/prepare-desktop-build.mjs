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

// Copy Electron entry files
await fs.copyFile(path.join(appDir, 'main.cjs'),       path.join(staging, 'main.cjs'))
await fs.copyFile(path.join(appDir, 'preload.cjs'),    path.join(staging, 'preload.cjs'))
await fs.copyFile(path.join(appDir, 'project-fs.cjs'), path.join(staging, 'project-fs.cjs'))

// Copy the desktop-only language runtime installers (e.g. runtimes/python.cjs,
// required by main.cjs) — these are small source files, not the actual
// downloaded Python/PySide6 payload, which lands in userData at runtime.
await fs.cp(path.join(appDir, 'runtimes'), path.join(staging, 'runtimes'), { recursive: true })

// Read version from desktop/app/package.json (already synced by sync-desktop-package)
const appPkg = JSON.parse(await fs.readFile(path.join(appDir, 'package.json'), 'utf8'))

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

    directories: {
      output: '../../desktop/dist',
    },

    // Only the Electron process files go into app.asar
    files: ['main.cjs', 'preload.cjs', 'project-fs.cjs', 'runtimes/**/*'],

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

console.log(`desktop/staging/ ready  (v${appPkg.version})`)
console.log('  main.cjs  preload.cjs  project-fs.cjs  runtimes/  package.json')
