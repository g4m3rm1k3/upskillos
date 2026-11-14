// vite-learner-projects.mjs
// Keeps the dev server's file watcher out of learners' project folders.
//
// Project Studio and Markdown Hub work in real folders the learner chooses. If one is inside this
// repository, the dev server sees every file the learner creates or deletes there, re-scans the
// app's glob imports and can reload the whole app: on a low-memory machine that froze typing,
// terminals and the file tree for minutes after each new or deleted file.
//
// The desktop app records the chosen folders in project-config.json in Electron's userData folder
// (desktop/app/project-fs.cjs). In development that folder is named "Electron". The packaged app
// has no dev server, so only development needs this.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function devConfigFile(platform = process.platform, env = process.env, home = os.homedir()) {
  const appData = platform === 'win32' ? (env.APPDATA || path.join(home, 'AppData', 'Roaming'))
    : platform === 'darwin' ? path.join(home, 'Library', 'Application Support')
      : (env.XDG_CONFIG_HOME || path.join(home, '.config'));
  return path.join(appData, 'Electron', 'project-config.json');
}

// The folders a config names: the old single projectRoot and one per project key.
export function projectRoots(config) {
  const roots = [config?.projectRoot, ...Object.values(config?.projects ?? {})];
  return [...new Set(roots.filter((root) => typeof root === 'string' && root))];
}

const norm = (p, platform) => {
  const resolved = path.resolve(p);
  return platform === 'win32' ? resolved.toLowerCase() : resolved;
};

// A watcher `ignored` predicate: true for a path inside any learner project folder. A folder that
// contains the app itself (someone chose the repository, or a folder above it) is skipped, because
// ignoring it would stop the dev server seeing its own source.
export function insideProjects(roots, appRoot, platform = process.platform) {
  const app = norm(appRoot, platform);
  const within = (child, parent) => child === parent || child.startsWith(parent.endsWith(path.sep) ? parent : parent + path.sep);
  const usable = roots.map((root) => norm(root, platform)).filter((root) => !within(app, root));
  return (file) => {
    const target = norm(file, platform);
    return usable.some((root) => within(target, root));
  };
}

// The predicate Vite uses. Re-reads the config at most every few seconds, so a folder chosen while
// the dev server is running is ignored from then on without a restart.
export function learnerProjectIgnore(appRoot, { file = devConfigFile(), ttlMs = 3000 } = {}) {
  let checkedAt = -Infinity;
  let test = () => false;
  return (target) => {
    const now = Date.now();
    if (now - checkedAt >= ttlMs) {
      checkedAt = now;
      let config = null;
      try { config = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* no desktop app run yet */ }
      test = insideProjects(projectRoots(config), appRoot);
    }
    return test(target);
  };
}
