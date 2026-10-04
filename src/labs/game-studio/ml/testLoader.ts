// For tests: load a project's scripts as modules from data: URLs, imports between them included, as the runtime
// does with blob: URLs (runtime/scripts.ts): each script's default export by path, and everything it exports under
// "module:" and its path.
import { importOrder, rewriteImports } from '../runtime/scripts';
import type { ClassLoader } from './env';

export const dataUrlLoader: ClassLoader = async (project) => {
  const classes = new Map<string, unknown>(), urls = new Map<string, string>();
  const { order, imports } = importOrder(project.scripts);
  for (const path of order) {
    const src = rewriteImports(project.scripts.find((x) => x.path === path)!.source, new Map([...imports.get(path)!].map(([spec, target]) => [spec, urls.get(target)!])));
    urls.set(path, `data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
    const mod = await import(/* @vite-ignore */ urls.get(path)!);
    classes.set(path, mod.default);
    classes.set(`module:${path}`, mod);
  }
  return classes;
};
