// Reconstruct the learner's files from the typed fragments and the explicitly taught
// moves/insertions. Used only by tests; never imports or supplies code to the editor.
import fs from 'node:fs';
import path from 'node:path';

function change(root, file, from, to) {
  const destination = path.join(root, file);
  const source = fs.readFileSync(destination, 'utf8');
  if (!source.includes(from)) throw new Error(`Missing taught insertion in ${file}: ${from}`);
  fs.writeFileSync(destination, source.replace(from, to));
}
export function typeJavaStep(root, step) {
  if (step.optional) return;
  if (step.title === 'Predict a partial failure') {
    change(root, 'src/main/java/workspace/JdbcTasks.java',
      '    public Task advance(UUID id, long expectedRevision) {\n        throw new UnsupportedOperationException("Transaction lesson implements updates");\n    }\n}', '');
  }
  if (step.title === 'Move the static files into the application') {
    const directory = path.join(root, 'src/main/resources/static');
    fs.mkdirSync(directory, { recursive: true });
    for (const name of ['index.html', 'style.css', 'board.js']) fs.renameSync(path.join(root, 'web', name), path.join(directory, name));
  }
  if (step.title === 'Add narrowly scoped dependencies') {
    const dependency = step.prose.match(/```xml\n([\s\S]*?)```/)[1];
    change(root, 'pom.xml', '  </dependencies>', `${dependency}  </dependencies>`);
  }
  if (step.title === 'Choose testing tools and keep their boundary explicit') {
    const file = path.join(root, 'frontend/package.json');
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
    manifest.scripts.test = 'vitest run --environment jsdom';
    Object.assign(manifest.devDependencies, { vitest: '3.2.4', jsdom: '26.1.0', '@testing-library/react': '16.3.0' });
    fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
  }
  if (step.edit) {
    const destination = path.join(root, step.file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (step.edit.mode === 'replace') fs.writeFileSync(destination, step.edit.code);
    else fs.appendFileSync(destination, step.edit.code);
  }
  if (step.title === 'Render discussion with named controls') {
    change(root, 'frontend/src/Board.tsx', "import { useEffect, useState } from 'react';", "import { useEffect, useState } from 'react';\nimport { Discussion } from './Discussion';");
    change(root, 'frontend/src/Board.tsx', 'Advance {task.title}</button>', 'Advance {task.title}</button>\n      <Discussion taskId={task.id} />');
  }
  if (step.title === 'Return a deterministic bounded page') {
    change(root, 'frontend/src/Board.tsx', "api<Task[]>('/api/tasks')", "api<Task[]>('/api/search?limit=25')");
    change(root, 'frontend/src/Board.tsx', "api<Task[]>('/api/tasks',", "api<Task[]>('/api/search?limit=25',");
    change(root, 'frontend/src/Board.tsx', '<h1>Common Ground</h1>', '<h1>Common Ground</h1>\n    <p>Showing the first 25 tasks. Search is available through the API.</p>');
  }
  if (step.title === 'Build in dependency order') fs.appendFileSync(path.join(root, '.gitignore'), 'src/main/resources/static/app/\n');
}
