import { parse, type Comment } from 'acorn';
import { parseJsToBlocks } from '../../visual-code/jsToBlocks';
import { createBlock } from '../../visual-code/blocks';
import { normalizeProject, transpileProject } from '../../visual-code/transpiler';

function tree(code: string) {
  const comments: Comment[] = [];
  const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module', onComment: comments });
  return { comments, normalized: JSON.stringify(ast, (key, value) => ['start', 'end', 'raw'].includes(key) ? undefined : value) };
}

// The shared reverse parser is deliberately best-effort. Only use its structured
// result when regeneration preserves the syntax tree. Otherwise keep exact code
// in an editable code block rather than silently changing scope or behavior.
export function importVisualJs(code: string) {
  if (!code.trim()) return { blocks: [], preserved: false };
  try {
    const original = tree(code);
    const blocks = parseJsToBlocks(code);
    const project = normalizeProject({ target: 'javascript', files: [{ id: 'import', name: 'script.js', blocks }], activeFileId: 'import' });
    const regenerated = tree(transpileProject(project).code);
    if (!original.comments.length && original.normalized === regenerated.normalized) return { blocks, preserved: false };
  } catch { /* Unsupported syntax or incomplete source: preserve it literally. */ }
  const block = createBlock('call');
  return { blocks: [{ ...block, fields: { ...block.fields, expression: code } }], preserved: true };
}
